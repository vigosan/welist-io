import { type Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, EmptyStateListIcon } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Skeleton } from "@/components/Skeleton";
import {
  useCollections,
  useCreateCollection,
  useMyCollections,
} from "@/hooks/collections";
import { useSession } from "@/lib/auth";
import type { CollectionSummary, MyCollection } from "@/types";

export default function CollectionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const signedIn = session.status === "signed-in";
  const explore = useCollections();
  const mine = useMyCollections(signedIn);
  const create = useCreateCollection();
  const [name, setName] = useState("");

  const items = useMemo(
    () => explore.data?.pages.flatMap((p) => p.items) ?? [],
    [explore.data]
  );

  const open = (id: string) =>
    router.push(`/collections/${id}` as Href);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || create.isPending) return;
    create.mutate(
      { name: trimmed },
      { onSuccess: (c) => { setName(""); open(c.id); } }
    );
  };

  const renderItem = ({ item }: { item: CollectionSummary }) => (
    <Pressable
      onPress={() => open(item.slug ?? item.id)}
      className="mx-5 mb-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
    >
      <Text className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">
        {item.name}
      </Text>
      {item.description ? (
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[13px] text-gray-600 dark:text-gray-400"
        >
          {item.description}
        </Text>
      ) : null}
      <Text className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
        {t("collections.listCount", { count: item.listCount })}
      </Text>
    </Pressable>
  );

  const renderMine = (item: MyCollection) => (
    <Pressable
      key={item.id}
      onPress={() => open(item.slug ?? item.id)}
      className="mr-2 rounded-xl border border-gray-300 px-3 py-2 active:opacity-70 dark:border-gray-600"
    >
      <Text className="text-sm text-gray-900 dark:text-gray-100">
        {item.name}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader title={t("collections.title")} back />
      {signedIn && (
        <View className="flex-row gap-2 px-5 pb-3">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("collections.createPlaceholder")}
            placeholderTextColor="#9ca3af"
            className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          />
          <Pressable
            onPress={submit}
            disabled={!name.trim() || create.isPending}
            className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
          >
            <Text className="text-sm font-medium text-white dark:text-gray-900">
              {t("collections.create")}
            </Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (explore.hasNextPage && !explore.isFetchingNextPage)
            explore.fetchNextPage();
        }}
        ListHeaderComponent={
          signedIn && mine.data && mine.data.length > 0 ? (
            <View className="px-5 pb-3">
              <Text className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t("collections.mine")}
              </Text>
              <View className="flex-row flex-wrap gap-y-2">
                {mine.data.map(renderMine)}
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          explore.isLoading ? (
            <View className="px-5">
              <Skeleton className="mb-3 h-20 rounded-2xl" />
              <Skeleton className="mb-3 h-20 rounded-2xl" />
            </View>
          ) : (
            <EmptyState
              icon={<EmptyStateListIcon />}
              title={t("collections.title")}
              subtitle={t("collections.empty")}
            />
          )
        }
        ListFooterComponent={
          explore.isFetchingNextPage ? (
            <ActivityIndicator className="py-4" />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
