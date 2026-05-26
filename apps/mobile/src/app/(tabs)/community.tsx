import { useRouter } from "expo-router";
import { ListFilter } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { PressableCard } from "@/components/Card";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useUserDirectory } from "@/hooks/users";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function UsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedQ = useDebouncedValue(q, 300);
  const query = useUserDirectory(debouncedQ || undefined);
  const isFiltered = q.length > 0;

  const users = useMemo(() => {
    const list = query.data?.pages.flatMap((p) => p.users) ?? [];
    return [...list].sort((a, b) => {
      const an = a.name?.toLocaleLowerCase() ?? "";
      const bn = b.name?.toLocaleLowerCase() ?? "";
      if (!an && bn) return 1;
      if (an && !bn) return -1;
      return an.localeCompare(bn);
    });
  }, [query.data]);

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader
        title={t("nav.community")}
        right={
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            accessibilityLabel={t("common.search")}
            hitSlop={8}
            className={`h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06] ${
              filtersOpen || isFiltered ? "bg-gray-900 dark:bg-gray-100" : ""
            }`}
          >
            <ListFilter
              color={filtersOpen || isFiltered ? "#ffffff" : "#0c0c0b"}
              size={18}
            />
          </Pressable>
        }
      />

      {filtersOpen && (
        <View className="mx-6 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("users.search")}
            placeholderTextColor="#a0a09c"
            autoCapitalize="none"
            autoFocus
            className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerClassName="px-6 pb-28"
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
              {t("users.empty")}
            </Text>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null
        }
        renderItem={({ item }) => (
          <PressableCard
            onPress={() =>
              router.push({
                pathname: "/u/[userId]",
                params: { userId: item.id },
              })
            }
            className="mb-2 flex-row items-center gap-3 p-4"
          >
            <Avatar name={item.name} image={item.image} />
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="text-base font-medium text-gray-900 dark:text-gray-100"
              >
                {item.name ?? t("common.anonymous")}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontVariant: ["tabular-nums"] }}
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                {item.ownedListsCount} lists · {item.completedChallengesCount}{" "}
                completed · {item.followerCount} followers
              </Text>
            </View>
          </PressableCard>
        )}
      />
    </SafeAreaView>
  );
}
