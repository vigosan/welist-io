import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotifications } from "@/hooks/notifications";
import { useSession } from "@/lib/auth";

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const notifs = useNotifications(session.status === "signed-in");

  const unread = useMemo(
    () => (notifs.data ?? []).filter((n) => !n.readAt).length,
    [notifs.data]
  );

  if (session.status !== "signed-in") return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 pt-16">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Wilist
            </Text>
            <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
              Hi {session.user.name ?? "there"}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/notifications")}
            className="relative rounded-full border border-gray-200 px-3 py-2 active:opacity-80 dark:border-gray-700"
          >
            <Text className="text-sm text-gray-900 dark:text-gray-100">
              Notifications
            </Text>
            {unread > 0 && (
              <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-gray-900 px-1.5 py-0.5 dark:bg-gray-100">
                <Text className="text-xs font-medium text-white dark:text-gray-900">
                  {unread > 9 ? "9+" : unread}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/lists")}
          className="mt-10 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            Go to my lists
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
