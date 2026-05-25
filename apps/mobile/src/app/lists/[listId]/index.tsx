import { useLocalSearchParams, useRouter } from "expo-router";
import { MoreVertical } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  renderInlineMarkdown,
  stripInlineMarkdown,
} from "@/lib/inline-markdown";
import {
  useAddItem,
  useBulkAddItems,
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
import { useRateList } from "@/hooks/rating";
import { useSession } from "@/lib/auth";
import { type FilterMode, filterItems } from "@/lib/items-filter";
import { mapsUrl } from "@/lib/maps";
import type { Item } from "@/types";
import { StarRating } from "@/components/StarRating";

const FILTERS: FilterMode[] = ["all", "pending", "done"];

export default function ListDetailScreen() {
  const { t } = useTranslation();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const [newText, setNewText] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editing, setEditing] = useState<Item | null>(null);
  const [editingText, setEditingText] = useState("");
  const [locating, setLocating] = useState<Item | null>(null);

  const { session } = useSession();
  const list = useList(listId);
  const items = useItems(listId);
  const add = useAddItem(listId);
  const bulkAdd = useBulkAddItems(listId);
  const toggle = useToggleItem(listId);
  const update = useUpdateItem(listId);
  const remove = useDeleteItem(listId);
  const reorder = useReorderItems(listId);
  const setLocation = useSetItemLocation(listId);
  const rate = useRateList(listId);
  const participants = useActiveParticipants(listId);
  const deleteList = useDeleteList();

  const isOwner =
    session.status === "signed-in" &&
    !!list.data?.ownerId &&
    session.user.id === list.data.ownerId;

  const visible = useMemo(
    () => filterItems(items.data ?? [], filter),
    [items.data, filter]
  );

  const submitAdd = () => {
    const lines = newText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    if (lines.length === 1) {
      add.mutate(lines[0], {
        onSuccess: () => setNewText(""),
        onError: (e) =>
          Alert.alert(t("list.couldNotAdd"), String((e as Error).message)),
      });
      return;
    }
    bulkAdd.mutate(lines, {
      onSuccess: () => setNewText(""),
      onError: (e) =>
        Alert.alert(t("list.couldNotAdd"), String((e as Error).message)),
    });
  };

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
        <View
          className={`mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${
            isActive ? "opacity-80" : ""
          }`}
        >
          <Pressable
            onPress={() => toggle.mutate(item.id)}
            onLongPress={() => openItemMenu(item)}
            disabled={isActive}
            className="flex-1 flex-row items-center gap-3 active:opacity-80"
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded-md border ${
                item.done
                  ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {item.done && (
                <Text className="text-xs font-bold text-white dark:text-gray-900">
                  ✓
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text
                className={`text-base ${
                  item.done
                    ? "text-gray-400 line-through dark:text-gray-600"
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

  const openActions = () => {
    Alert.alert(list.data?.name ?? "", undefined, [
      { text: t("list.randomItem"), onPress: handleRandom },
      { text: t("list.shareLink"), onPress: handleShare },
      { text: t("list.copyPlain"), onPress: handleCopyPlain },
      {
        text: t("list.settings"),
        onPress: () =>
          router.push({
            pathname: "/lists/[listId]/settings",
            params: { listId },
          }),
      },
      {
        text: t("list.deleteList"),
        style: "destructive",
        onPress: handleDelete,
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader
        title={list.data?.name ?? ""}
        back
        right={
          <Pressable
            onPress={openActions}
            accessibilityLabel={t("list.actions")}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06]"
          >
            <MoreVertical color="#0c0c0b" size={22} />
          </Pressable>
        }
      />

      <View className="mx-6 mt-3 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
        <TextInput
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={submitAdd}
          placeholder={t("list.addPlaceholder")}
          placeholderTextColor="#a0a09c"
          returnKeyType="done"
          className="flex-1 px-3 text-sm text-gray-900 dark:text-gray-100"
        />
        <Pressable
          onPress={submitAdd}
          disabled={!newText.trim() || add.isPending}
          className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-sm font-medium text-white dark:text-gray-900">
            {t("common.add")}
          </Text>
        </Pressable>
      </View>

      {list.data?.rating && (list.data.rating.count > 0 || !isOwner) && (
        <View className="mx-6 mb-3 flex-row items-center justify-between">
          <StarRating
            value={list.data.rating.mine}
            avg={list.data.rating.avg}
            count={list.data.rating.count}
            onChange={isOwner ? undefined : (v) => rate.mutate(v)}
          />
          {participants.data && participants.data.total > 0 && (
            <ParticipantAvatars
              participants={participants.data.participants}
              total={participants.data.total}
            />
          )}
        </View>
      )}

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

      <DraggableFlatList
        data={visible}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        onDragEnd={({ data }) => {
          if (filter !== "all") return;
          reorder.mutate(data);
        }}
        ListEmptyComponent={
          items.isLoading ? (
            <ActivityIndicator className="mt-10" />
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
              className="rounded-xl border border-gray-200 px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
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
