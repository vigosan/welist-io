import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { EmptyState, EmptyStateUsersIcon } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { UserCardSkeleton } from "@/components/Skeleton";
import { useFeed } from "@/hooks/feed";
import { useSession } from "@/lib/auth";
import { feedVerbKey } from "@/lib/feed-verb";
import type { FeedItem } from "@/types";

export default function FeedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const enabled = session.status === "signed-in";
  const query = useFeed(enabled);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );

  const renderItem = ({ item }: { item: FeedItem }) => {
    const name = item.actorName ?? t("feed.someone");
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: "/explore/[listId]",
            params: { listId: item.listSlug ?? item.listId },
          })
        }
        className="flex-row items-start gap-3 px-5 py-3 active:opacity-70"
      >
        <Avatar name={item.actorName} image={item.actorImage} size={32} />
        <View className="flex-1">
          <Text className="text-sm text-gray-900 dark:text-gray-100">
            {t(feedVerbKey(item.action), { name, list: item.listName })}
          </Text>
          <Text className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader title={t("feed.title")} back />
      {!enabled ? (
        <EmptyState
          icon={<EmptyStateUsersIcon />}
          title={t("feed.title")}
          subtitle={t("feed.signedOut")}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage)
              query.fetchNextPage();
          }}
          ListEmptyComponent={
            query.isLoading ? (
              <View>
                <UserCardSkeleton />
                <UserCardSkeleton />
                <UserCardSkeleton />
              </View>
            ) : (
              <EmptyState
                icon={<EmptyStateUsersIcon />}
                title={t("feed.title")}
                subtitle={t("feed.empty")}
              />
            )
          }
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator className="py-4" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
