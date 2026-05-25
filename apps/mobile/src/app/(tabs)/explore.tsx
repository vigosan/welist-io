import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplore } from "@/hooks/explore";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { LIST_CATEGORIES, type ListCategory } from "@/lib/categories";
import type { ExploreSort } from "@/services/explore";

const SORTS: ExploreSort[] = ["trending", "created_desc"];

export default function ExploreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<ExploreSort>("trending");
  const [category, setCategory] = useState<ListCategory | "">("");
  const debouncedQ = useDebouncedValue(q, 300);

  const query = useExplore(debouncedQ || undefined, sort, category || undefined);

  const lists = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="px-6 pt-6 pb-3">
        <Text className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t("explore.title")}
        </Text>
      </View>

      <View className="mx-6 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("explore.search")}
          placeholderTextColor="#a0a09c"
          autoCapitalize="none"
          className="flex-1 px-3 text-sm text-gray-900 dark:text-gray-100"
        />
      </View>

      <View className="mx-6 mb-3 flex-row gap-2">
        {SORTS.map((s) => {
          const active = sort === s;
          const label = s === "trending" ? t("explore.trending") : t("explore.recent");
          return (
            <Pressable
              key={s}
              onPress={() => setSort(s)}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-6 gap-2 pb-3"
      >
        <Pressable
          onPress={() => setCategory("")}
          className={`rounded-full border px-3 py-1.5 ${
            category === ""
              ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
              : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              category === ""
                ? "text-white dark:text-gray-900"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {t("explore.all")}
          </Text>
        </Pressable>
        {LIST_CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(active ? "" : c)}
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
                {t(`categories.${c}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={lists}
        keyExtractor={(it) => it.id}
        contentContainerClassName="px-6 pb-10 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
          />
        }
        onEndReached={() =>
          query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()
        }
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("explore.empty")}
            </Text>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/explore/[listId]",
                params: { listId: item.id },
              })
            }
            className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text
              numberOfLines={1}
              className="text-base font-medium text-gray-900 dark:text-gray-100"
            >
              {item.name}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {item.owner?.name ?? t("common.anonymous")}
              {item.category
                ? ` · ${t(`categories.${item.category}` as never)}`
                : ""}
            </Text>
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t("explore.itemsAndParticipants", {
                items: item.itemCount,
                participants: item.participantCount,
              })}
              {item.rating.count > 0
                ? ` · ★ ${item.rating.avg?.toFixed(1)} (${item.rating.count})`
                : ""}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
