import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useAcceptChallenge,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/explore";

export default function ExploreDetailScreen() {
  const { t } = useTranslation();
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
        Alert.alert(t("common.error"), String((e as Error).message)),
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
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader title={d.name} back />

      <ScrollView contentContainerClassName="px-5 pb-10">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.by")} {d.owner?.name ?? t("common.anonymous")}
        </Text>

        {d.description && (
          <Text className="mt-3 text-sm text-gray-900 dark:text-gray-100">
            {d.description}
          </Text>
        )}

        <Text className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {t("explore.itemsAndParticipants", {
            items: d.itemCount,
            participants: d.participantCount,
          })}
        </Text>

        <Pressable
          onPress={onAccept}
          disabled={accept.isPending}
          className="mt-6 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            {t("explore.accept")}
          </Text>
        </Pressable>

        <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("explore.preview")}
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
            {t("common.noItems")}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
