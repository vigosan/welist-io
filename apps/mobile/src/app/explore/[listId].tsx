import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ItemRowSkeleton, Skeleton } from "@/components/Skeleton";
import {
  useAcceptChallenge,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/explore";
import { useForkList } from "@/hooks/lists";
import { useSession } from "@/lib/auth";

export default function ExploreDetailScreen() {
  const { t } = useTranslation();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const detail = useExploreDetail(listId);
  const items = useExploreItems(listId);
  const accept = useAcceptChallenge();
  const fork = useForkList();

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

  const onFork = () =>
    fork.mutate(listId, {
      onSuccess: (created) =>
        router.replace({
          pathname: "/lists/[listId]",
          params: { listId: created.id },
        }),
      onError: (e) =>
        Alert.alert(t("common.error"), String((e as Error).message)),
    });

  if (detail.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-canvas dark:bg-canvas-dark"
        edges={["top"]}
      >
        <ScreenHeader title="" back />
        <View className="px-5">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <Skeleton className="mt-5 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-2 h-3 w-2/3" />
          <Skeleton className="mt-6 h-12 w-full rounded-xl" />
          <Skeleton className="mt-8 h-3 w-1/4" />
          <View className="mt-3">
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const d = detail.data;
  if (!d) return null;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader title={d.name} back />

      <ScrollView contentContainerClassName="px-5 pb-10">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t("common.by")} {d.owner?.name ?? t("common.anonymous")}
        </Text>

        {d.forkedFrom && (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/explore/[listId]",
                params: {
                  listId: d.forkedFrom?.slug ?? d.forkedFrom?.id ?? "",
                },
              })
            }
            className="mt-1 active:opacity-70"
          >
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              ⑂ {t("explore.forkedFrom", { name: d.forkedFrom.name })}
            </Text>
          </Pressable>
        )}

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

        {session.status === "signed-in" && d.ownerId !== session.user.id && (
          <Pressable
            onPress={onFork}
            disabled={fork.isPending}
            className="mt-3 rounded-xl border border-gray-300 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:border-gray-600"
          >
            <Text className="text-center font-medium text-gray-900 dark:text-gray-100">
              {t("explore.forkList")}
            </Text>
          </Pressable>
        )}

        <Text className="mt-8 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("explore.preview")}
        </Text>
        {items.isLoading ? (
          <View>
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
          </View>
        ) : items.data?.length ? (
          items.data.map((it) => (
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
