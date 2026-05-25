import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFeed } from "@/hooks/feed";
import { useSession } from "@/lib/auth";

export default function FeedScreen() {
  const { session } = useSession();
  const router = useRouter();
  const enabled = session.status === "signed-in";
  const query = useFeed(enabled);

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="px-6 pt-6 pb-3">
        <Text className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Feed
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Public lists from people you follow.
        </Text>
      </View>

      <FlatList
        data={query.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerClassName="px-6 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
          />
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <View className="mt-10 items-center">
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                Nothing in your feed yet.
              </Text>
              <Pressable
                onPress={() => router.push("/users")}
                className="mt-4 rounded-xl border border-gray-200 px-4 py-2 active:opacity-80 dark:border-gray-700"
              >
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Browse users
                </Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/explore/[listId]",
                params: { listId: item.id },
              })
            }
            className="mb-2 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text
              numberOfLines={1}
              className="text-base font-medium text-gray-900 dark:text-gray-100"
            >
              {item.name}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              by {item.owner.name ?? "anonymous"} · {item.itemCount} items
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
