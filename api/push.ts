export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return;
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages.map((m) => ({ sound: "default", ...m }))),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("expo-push: HTTP", res.status, body);
    }
  } catch (err) {
    console.error("expo-push: request failed", err);
  }
}
