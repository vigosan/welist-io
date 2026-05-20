const encoder = new TextEncoder();

async function hmac(secret: string, data: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, encoder.encode(data));
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signUnsubscribeToken(
  userId: string,
  secret: string
): Promise<string> {
  const sig = toBase64Url(await hmac(secret, userId));
  return `${userId}.${sig}`;
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string
): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 1 || dot === token.length - 1) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = toBase64Url(await hmac(secret, userId));
  return timingSafeEqual(sig, expected) ? userId : null;
}
