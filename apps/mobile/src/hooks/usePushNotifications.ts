import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }
  if (status !== "granted") return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return result.data;
}

export function usePushNotifications() {
  const { session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status !== "signed-in") return;
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (cancelled || !token) return;
        await apiFetch("/me/device-tokens", {
          method: "POST",
          body: JSON.stringify({ token, platform: Platform.OS }),
        });
      } catch (err) {
        console.error("push registration failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          listId?: string;
        };
        if (data?.listId) {
          router.push({
            pathname: "/lists/[listId]",
            params: { listId: data.listId },
          });
        }
      }
    );
    return () => sub.remove();
  }, [router]);
}
