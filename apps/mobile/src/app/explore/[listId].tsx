import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAcceptChallenge,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/explore";

export default function ExploreDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const detail = useExploreDetail(listId);
  const items = useExploreItems(listId);
  const accept = useAcceptChallenge();

  const onAccept = () =>
    accept.mutate(listId, {
      onSuccess: () =>
        router.replace({
          pathname: "/lists/[listId]",
          params: { listId },
        }),
      onError: (e) =>
        Alert.alert("Could not accept", String((e as Error).message)),
    });

  if (detail.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <ActivityIndicator className="mt-10" />
      </SafeAreaView>
    );
  }

  const d = detail.data;
  if (!d) return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen options={{ title: d.name, headerShown: true }} />

      <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
        <Text className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {d.name}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          by {d.owner?.name ?? "anonymous"}
        </Text>

        {d.description && (
          <Text className="mt-3 text-sm text-gray-900 dark:text-gray-100">
            {d.description}
          </Text>
        )}

        <Text className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {d.itemCount} items · {d.participantCount} participants
        </Text>

        <Pressable
          onPress={onAccept}
          disabled={accept.isPending}
          className="mt-6 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            Accept challenge
          </Text>
        </Pressable>

        <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Preview
        </Text>
        {items.isLoading ? (
          <ActivityIndicator />
        ) : items.data?.length ? (
          items.data.slice(0, 8).map((it) => (
            <View
              key={it.id}
              className="mb-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <Text
                numberOfLines={1}
                className="text-sm text-gray-900 dark:text-gray-100"
              >
                {it.text}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            No items yet.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
