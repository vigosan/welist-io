import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, EmptyStateListIcon } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Skeleton } from "@/components/Skeleton";
import {
  useCollectionDetail,
  useDeleteCollection,
  useRemoveListFromCollection,
} from "@/hooks/collections";
import { useSession } from "@/lib/auth";

export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { collectionId } = useLocalSearchParams<{ collectionId: string }>();
  const { session } = useSession();
  const myId = session.status === "signed-in" ? session.user.id : null;
  const { data: col, isLoading } = useCollectionDetail(collectionId);
  const removeList = useRemoveListFromCollection();
  const deleteCollection = useDeleteCollection();

  const isOwner = !!myId && col?.ownerId === myId;

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-canvas dark:bg-canvas-dark"
        edges={["top"]}
      >
        <ScreenHeader title="" back />
        <View className="px-5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-4 h-20 rounded-2xl" />
        </View>
      </SafeAreaView>
    );
  }
  if (!col) return null;

  const confirmDelete = () =>
    Alert.alert(col.name, t("collections.delete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("collections.delete"),
        style: "destructive",
        onPress: () =>
          deleteCollection.mutate(col.id, {
            onSuccess: () => router.back(),
          }),
      },
    ]);

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader
        title={col.name}
        back
        right={
          isOwner ? (
            <Pressable onPress={confirmDelete} hitSlop={8}>
              <Text className="text-sm text-red-500">
                {t("collections.delete")}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={col.lists}
        keyExtractor={(l) => l.id}
        contentContainerClassName="px-5 pb-10"
        ListHeaderComponent={
          col.description ? (
            <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              {col.description}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={<EmptyStateListIcon />}
            title={col.name}
            subtitle={t("collections.noLists")}
          />
        }
        renderItem={({ item }) => (
          <View className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <Pressable
              onPress={() =>
                router.push(`/explore/${item.slug ?? item.id}` as Href)
              }
              className="min-w-0 flex-1 active:opacity-80"
            >
              <Text
                numberOfLines={1}
                className="text-[15px] font-semibold text-gray-900 dark:text-gray-100"
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                {t("collections.listCount", { count: item.itemCount })}
              </Text>
            </Pressable>
            {isOwner && (
              <Pressable
                onPress={() =>
                  removeList.mutate({
                    collectionId: col.id,
                    listId: item.id,
                  })
                }
                hitSlop={8}
              >
                <Text className="text-gray-400">✕</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
