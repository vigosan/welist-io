import { Stack, useRouter } from "expo-router";
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
import { useUserDirectory } from "@/hooks/users";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function UsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const query = useUserDirectory(debouncedQ || undefined);

  const users = useMemo(
    () => query.data?.pages.flatMap((p) => p.users) ?? [],
    [query.data]
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen options={{ title: t("users.title"), headerShown: true }} />

      <View className="mx-6 mt-3 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("users.search")}
          placeholderTextColor="#a0a09c"
          autoCapitalize="none"
          className="flex-1 px-3 text-sm text-gray-900 dark:text-gray-100"
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerClassName="px-6 pb-10"
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
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/u/[userId]",
                params: { userId: item.id },
              })
            }
            className="mb-2 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text
              numberOfLines={1}
              className="text-base font-medium text-gray-900 dark:text-gray-100"
            >
              {item.name ?? t("common.anonymous")}
            </Text>
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {item.ownedListsCount} lists · {item.completedChallengesCount}{" "}
              completed · {item.followerCount} followers
              {item.achievementsTotal > 0
                ? ` · ${item.achievementsUnlocked}/${item.achievementsTotal} achievements`
                : ""}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
