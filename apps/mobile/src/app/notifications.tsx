import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/notifications";
import { useSession } from "@/lib/auth";
import { notificationHref } from "@/lib/notification-route";
import type { AppNotification } from "@/types";

function renderVerb(
  t: ReturnType<typeof useTranslation>["t"],
  n: AppNotification
): string {
  const count = n.metadata?.count ?? 1;
  if (n.type === "item_added") {
    return count === 1
      ? t("notifications.item_added_one")
      : t("notifications.item_added_many", { count });
  }
  if (n.type === "item_done") {
    return count === 1
      ? t("notifications.item_done_one")
      : t("notifications.item_done_many", { count });
  }
  if (n.type === "weekly_recap") {
    const m = n.metadata ?? {};
    const total =
      (m.accepted ?? 0) +
      (m.completed ?? 0) +
      (m.followers ?? 0) +
      (m.liked ?? 0);
    return t("notifications.weekly_recap", { count: total });
  }
  return t(`notifications.${n.type}` as const);
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const router = useRouter();
  const enabled = session.status === "signed-in";
  const query = useNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const onPress = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader
        title={t("notifications.title")}
        back
        right={
          (query.data?.length ?? 0) > 0 ? (
            <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
              <Text className="text-sm text-gray-900 dark:text-gray-100">
                {t("notifications.markAllRead")}
              </Text>
            </Pressable>
          ) : null
        }
      />

      <FlatList
        data={query.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerClassName="px-5 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              query.refetch();
            }}
          />
        }
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("notifications.empty")}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const unread = !item.readAt;
          return (
            <Pressable
              onPress={() => onPress(item)}
              className={`mb-2 flex-row items-start gap-3 rounded-2xl border p-4 active:opacity-80 ${
                unread
                  ? "border-gray-900 bg-white dark:border-gray-100 dark:bg-gray-900"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <View className="flex-1">
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  <Text className="font-medium">
                    {item.actorName ?? t("common.anonymous")}
                  </Text>{" "}
                  {renderVerb(t, item)}
                  {item.listName ? ` "${item.listName}"` : ""}
                </Text>
              </View>
              {unread && (
                <View className="mt-1.5 h-2 w-2 rounded-full bg-gray-900 dark:bg-gray-100" />
              )}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
