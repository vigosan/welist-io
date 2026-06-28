import webpush from "web-push";

export type WebPushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
};

let configured: boolean | null = null;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hola@welist.io";
  if (!publicKey || !privateKey) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Sends a web push to each target. Returns the endpoints that are gone (404/410)
 * so the caller can prune them. No-op (skipped) when VAPID keys are unset.
 */
export async function sendWebPush(
  targets: WebPushTarget[],
  payload: WebPushPayload
): Promise<{ skipped: boolean; staleEndpoints: string[] }> {
  if (targets.length === 0) return { skipped: false, staleEndpoints: [] };
  if (!ensureConfigured()) return { skipped: true, staleEndpoints: [] };

  const body = JSON.stringify(payload);
  const stale: string[] = [];
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          body
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          stale.push(t.endpoint);
        } else {
          console.error("web-push: send failed", status ?? err);
        }
      }
    })
  );
  return { skipped: false, staleEndpoints: stale };
}
