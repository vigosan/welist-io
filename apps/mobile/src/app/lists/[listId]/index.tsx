import { useLocalSearchParams, useRouter } from "expo-router";
import { ListFilter, MoreVertical, Plus } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionDrawer, type DrawerAction } from "@/components/ActionDrawer";
import { AnimatedCheckbox } from "@/components/AnimatedCheckbox";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { ItemRowSkeleton } from "@/components/Skeleton";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  renderInlineMarkdown,
  stripInlineMarkdown,
} from "@/lib/inline-markdown";
import {
  useDeleteItem,
  useItems,
  useReorderItems,
  useSetItemLocation,
  useToggleItem,
  useUpdateItem,
} from "@/hooks/items";
import {
  useActiveParticipants,
  useDeleteList,
  useList,
} from "@/hooks/lists";
import { useReport } from "@/hooks/users";
import { useRateList } from "@/hooks/rating";
import { useSession } from "@/lib/auth";
import { type FilterMode, filterItems } from "@/lib/items-filter";
import { mapsUrl } from "@/lib/maps";
import type { Item } from "@/types";
import { RateSheet } from "@/components/RateSheet";
import { RatingBadge } from "@/components/RatingBadge";

const FILTERS: FilterMode[] = ["all", "pending", "done"];

export default function ListDetailScreen() {
  const { t } = useTranslation();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [editingText, setEditingText] = useState("");
  const [locating, setLocating] = useState<Item | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const { session } = useSession();
  const list = useList(listId);
  const items = useItems(listId);
  const toggle = useToggleItem(listId);
  const update = useUpdateItem(listId);
  const remove = useDeleteItem(listId);
  const reorder = useReorderItems(listId);
  const setLocation = useSetItemLocation(listId);
  const rate = useRateList(listId);
  const participants = useActiveParticipants(listId);
  const deleteList = useDeleteList();
  const report = useReport();

  const isOwner =
    session.status === "signed-in" &&
    !!list.data?.ownerId &&
    session.user.id === list.data.ownerId;

  const visible = useMemo(
    () => filterItems(items.data ?? [], filter),
    [items.data, filter]
  );

  const openItemMenu = (item: Item) => {
    const hasCoords = !!(item.latitude && item.longitude && item.placeName);
    const buttons: Parameters<typeof Alert.alert>[2] = [
      {
        text: t("common.edit"),
        onPress: () => {
          setEditingText(item.text);
          setEditing(item);
        },
      },
      {
        text: hasCoords ? t("list.changeLocation") : t("list.setLocation"),
        onPress: () => setLocating(item),
      },
    ];
    if (hasCoords) {
      buttons.push({
        text: t("list.openInMaps"),
        onPress: () => {
          const platform = Platform.OS === "android" ? "android" : "ios";
          Linking.openURL(
            mapsUrl(
              {
                // biome-ignore lint/style/noNonNullAssertion: gated by hasCoords
                latitude: item.latitude!,
                // biome-ignore lint/style/noNonNullAssertion: gated by hasCoords
                longitude: item.longitude!,
                // biome-ignore lint/style/noNonNullAssertion: gated by hasCoords
                placeName: item.placeName!,
              },
              platform
            )
          );
        },
      });
    }
    buttons.push({
      text: t("common.delete"),
      style: "destructive",
      onPress: () => remove.mutate(item.id),
    });
    buttons.push({ text: t("common.cancel"), style: "cancel" });
    Alert.alert(item.text, undefined, buttons);
  };

  const saveEdit = () => {
    if (!editing) return;
    const text = editingText.trim();
    if (!text || text === editing.text) {
      setEditing(null);
      return;
    }
    update.mutate(
      { itemId: editing.id, text },
      {
        onSettled: () => setEditing(null),
        onError: (e) =>
          Alert.alert(t("list.couldNotSave"), String((e as Error).message)),
      }
    );
  };

  const renderRow = ({ item, drag, isActive }: RenderItemParams<Item>) => {
    const dragEnabled = filter === "all";
    return (
      <ScaleDecorator>
        <SwipeableItemRow
          item={item}
          isActive={isActive}
          dragEnabled={dragEnabled}
          drag={drag}
          onToggle={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            toggle.mutate(item.id);
          }}
          onOpenMenu={() => openItemMenu(item)}
          onEdit={() => {
            setEditingText(item.text);
            setEditing(item);
          }}
          onDelete={() => remove.mutate(item.id)}
          toggleLabel={item.done ? t("list.swipeUndo") : t("list.swipeDone")}
          editLabel={t("common.edit")}
          deleteLabel={t("common.delete")}
        />
      </ScaleDecorator>
    );
  };

  const handleRandom = () => {
    const all = items.data ?? [];
    const pending = all.filter((it) => !it.done);
    const pool = pending.length > 0 ? pending : all;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    Alert.alert(t("list.randomPick"), stripInlineMarkdown(pick.text));
  };

  const handleShare = async () => {
    if (!list.data) return;
    const slug = list.data.slug ?? list.data.id;
    const url = `https://welist.io/lists/${slug}`;
    try {
      await Share.share({
        message: `${list.data.name}\n${url}`,
        url,
        title: list.data.name,
      });
    } catch {}
  };

  const handleCopyPlain = async () => {
    if (!items.data) return;
    const text = items.data
      .map((it) => `• ${stripInlineMarkdown(it.text)}`)
      .join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert(t("list.copied"));
  };

  const handleDelete = () => {
    Alert.alert(t("list.deleteListTitle"), list.data?.name ?? "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () =>
          deleteList.mutate(listId, {
            onSuccess: () => router.back(),
          }),
      },
    ]);
  };

  const handleReport = () => {
    report.mutate(
      { targetType: "list", targetId: listId },
      {
        onSuccess: () => Alert.alert(t("list.reportSubmitted")),
        onError: () => Alert.alert(t("list.reportFailed")),
      }
    );
  };

  const actions: DrawerAction[] = [
    { label: t("list.randomItem"), onPress: handleRandom },
    { label: t("list.shareLink"), onPress: handleShare },
    { label: t("list.copyPlain"), onPress: handleCopyPlain },
    ...(isOwner
      ? [
          {
            label: t("list.settings"),
            onPress: () =>
              router.push({
                pathname: "/lists/[listId]/settings",
                params: { listId },
              }),
          },
          {
            label: t("list.deleteList"),
            onPress: handleDelete,
            destructive: true,
          },
        ]
      : [
          {
            label: t("list.report"),
            onPress: handleReport,
            destructive: true,
          },
        ]),
  ];

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader
        title={list.data?.name ?? ""}
        back
        right={
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => setFiltersOpen((v) => !v)}
              accessibilityLabel={t("list.filterAll")}
              hitSlop={8}
              className={`h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06] ${
                filtersOpen || filter !== "all"
                  ? "bg-gray-900 dark:bg-gray-100"
                  : ""
              }`}
            >
              <ListFilter
                color={
                  filtersOpen || filter !== "all" ? "#ffffff" : "#0c0c0b"
                }
                size={18}
              />
            </Pressable>
            <Pressable
              onPress={() => setActionsOpen(true)}
              accessibilityLabel={t("list.actions")}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06]"
            >
              <MoreVertical color="#0c0c0b" size={22} />
            </Pressable>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/lists/[listId]/new-item",
                  params: { listId },
                })
              }
              accessibilityLabel={t("list.newItemTitle")}
              hitSlop={8}
              className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-gray-900 active:opacity-80 dark:bg-gray-100"
            >
              <Plus color="#ffffff" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>
        }
      />

      {((list.data?.rating &&
        (list.data.rating.count > 0 || !isOwner)) ||
        (participants.data && participants.data.total > 0)) && (
        <View className="mx-6 mb-2 flex-row items-center justify-between">
          {list.data?.rating &&
          (list.data.rating.count > 0 || !isOwner) ? (
            <RatingBadge
              avg={list.data.rating.avg ?? 0}
              count={list.data.rating.count}
              mine={list.data.rating.mine}
              rateLabel={isOwner ? undefined : t("list.rateList")}
              onPress={isOwner ? undefined : () => setRateOpen(true)}
            />
          ) : (
            <View />
          )}
          {participants.data && participants.data.total > 0 && (
            <ParticipantAvatars
              participants={participants.data.participants}
              total={participants.data.total}
            />
          )}
        </View>
      )}


      {filtersOpen && (
      <View className="mx-6 mb-3 flex-row gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          const label =
            f === "all"
              ? t("list.filterAll")
              : f === "pending"
                ? t("list.filterPending")
                : t("list.filterDone");
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 ${
                active
                  ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  active
                    ? "text-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      )}

      <DraggableFlatList
        data={visible}
        keyExtractor={(it) => it.id}
        containerStyle={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        onDragEnd={({ data }) => {
          if (filter !== "all") return;
          reorder.mutate(data);
        }}
        ListEmptyComponent={
          items.isLoading ? (
            <View>
              <ItemRowSkeleton />
              <ItemRowSkeleton />
              <ItemRowSkeleton />
              <ItemRowSkeleton />
              <ItemRowSkeleton />
              <ItemRowSkeleton />
            </View>
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("common.noItems")}
            </Text>
          )
        }
        renderItem={renderRow}
      />

      <Modal
        animationType="fade"
        transparent
        visible={editing !== null}
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-2xl bg-white p-5 dark:bg-gray-900">
            <Text className="mb-3 text-base font-medium text-gray-900 dark:text-gray-100">
              {t("list.editItem")}
            </Text>
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              autoFocus
              textAlignVertical="center"
              style={{ fontSize: 16, lineHeight: 20 }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
            <View className="mt-4 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setEditing(null)}
                className="px-4 py-2"
              >
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 dark:bg-gray-100"
              >
                <Text className="text-sm font-medium text-white dark:text-gray-900">
                  {t("common.save")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <RateSheet
        visible={rateOpen}
        value={list.data?.rating?.mine ?? null}
        onChange={(v) => rate.mutate(v)}
        onClose={() => setRateOpen(false)}
      />

      <LocationPickerModal
        visible={locating !== null}
        currentPlaceName={locating?.placeName ?? null}
        onClose={() => setLocating(null)}
        onSelect={(place) => {
          if (!locating) return;
          setLocation.mutate({
            itemId: locating.id,
            coords: {
              latitude: place.latitude,
              longitude: place.longitude,
              placeName: place.name,
            },
          });
        }}
        onRemove={
          locating?.placeName
            ? () => {
                if (!locating) return;
                setLocation.mutate({ itemId: locating.id, coords: null });
              }
            : undefined
        }
      />

      <ActionDrawer
        visible={actionsOpen}
        title={list.data?.name ?? undefined}
        actions={actions}
        onClose={() => setActionsOpen(false)}
      />
    </SafeAreaView>
  );
}

type Participant = { id: string; name: string | null; image: string | null };

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function ParticipantAvatars({
  participants,
  total,
}: {
  participants: Participant[];
  total: number;
}) {
  const max = 5;
  const shown = participants.slice(0, max);
  const extra = total - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((p, i) => (
        <View
          key={p.id}
          style={{ marginLeft: i === 0 ? 0 : -8 }}
          className="h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-canvas bg-gray-200 dark:border-canvas-dark dark:bg-gray-800"
        >
          {p.image ? (
            <Image source={{ uri: p.image }} className="h-full w-full" />
          ) : (
            <Text className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">
              {initials(p.name)}
            </Text>
          )}
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{ marginLeft: -8 }}
          className="h-7 items-center justify-center rounded-full border-2 border-canvas bg-gray-200 px-1.5 dark:border-canvas-dark dark:bg-gray-800"
        >
          <Text className="text-[10px] font-semibold text-gray-700 dark:text-gray-200">
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

function SwipeableItemRow({
  item,
  isActive,
  dragEnabled,
  drag,
  onToggle,
  onOpenMenu,
  onEdit,
  onDelete,
  toggleLabel,
  editLabel,
  deleteLabel,
}: {
  item: Item;
  isActive: boolean;
  dragEnabled: boolean;
  drag: () => void;
  onToggle: () => void;
  onOpenMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  toggleLabel: string;
  editLabel: string;
  deleteLabel: string;
}) {
  const swipeRef = useRef<Swipeable>(null);
  const close = () => swipeRef.current?.close();
  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={() => (
        <Pressable
          onPress={() => {
            onToggle();
            close();
          }}
          className="mb-2 mr-2 flex-1 items-end justify-center rounded-2xl bg-gray-900 pr-6 dark:bg-gray-100"
        >
          <Text className="text-sm font-semibold text-white dark:text-gray-900">
            {toggleLabel}
          </Text>
        </Pressable>
      )}
      renderRightActions={() => (
        <View className="mb-2 ml-2 flex-row gap-2">
          <Pressable
            onPress={() => {
              onEdit();
              close();
            }}
            className="items-center justify-center rounded-2xl bg-gray-200 px-5 dark:bg-gray-800"
          >
            <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {editLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onDelete();
              close();
            }}
            className="items-center justify-center rounded-2xl bg-red-600 px-5"
          >
            <Text className="text-sm font-semibold text-white">
              {deleteLabel}
            </Text>
          </Pressable>
        </View>
      )}
    >
      <View
        className={`mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-4 dark:bg-gray-900 ${
          isActive ? "opacity-80" : ""
        } ${item.done ? "opacity-60" : ""}`}
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
      >
        <Pressable
          onPress={onToggle}
          onLongPress={onOpenMenu}
          disabled={isActive}
          className="flex-1 flex-row items-center gap-3 active:opacity-80"
        >
          <AnimatedCheckbox done={item.done} />
          <View className="flex-1">
            <Text
              className={`text-base ${
                item.done
                  ? "line-through text-gray-600 dark:text-gray-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {renderInlineMarkdown(item.text)}
            </Text>
            {item.placeName && (
              <Text
                numberOfLines={1}
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                📍 {item.placeName}
              </Text>
            )}
          </View>
        </Pressable>

        {dragEnabled && (
          <Pressable
            onLongPress={drag}
            delayLongPress={150}
            disabled={isActive}
            hitSlop={8}
            className="px-1"
          >
            <Text className="text-base text-gray-400">≡</Text>
          </Pressable>
        )}
      </View>
    </Swipeable>
  );
}
