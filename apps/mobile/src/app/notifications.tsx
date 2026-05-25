import { Stack, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/notifications";
import { useSession } from "@/lib/auth";
import { notificationHref } from "@/lib/notification-route";
import type { AppNotification } from "@/types";

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
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen
        options={{
          title: t("notifications.title"),
          headerShown: true,
          headerRight: () =>
            (query.data?.length ?? 0) > 0 ? (
              <Pressable onPress={() => markAllRead.mutate()} className="pr-3">
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  {t("notifications.markAllRead")}
                </Text>
              </Pressable>
            ) : null,
        }}
      />

      <FlatList
        data={query.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerClassName="px-6 pb-10 pt-3"
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
                  {t(`notifications.${item.type}` as const)}
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
