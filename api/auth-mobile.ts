import { decode, encode } from "@auth/core/jwt";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const MOBILE_TOKEN_SALT = "wilist.mobile-session";
export const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

export type ProviderProfile = {
  sub: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

export type MobileSessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type MobileTokenPayload = {
  sub: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
};

const googleJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const appleJwks = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

function parseAudiences(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getGoogleMobileAudiences(): string[] {
  const fromList = parseAudiences(process.env.GOOGLE_MOBILE_CLIENT_IDS);
  if (fromList.length > 0) return fromList;
  const fallback = process.env.GOOGLE_CLIENT_ID;
  return fallback ? [fallback] : [];
}

export function getAppleAudiences(): string[] {
  return parseAudiences(process.env.APPLE_CLIENT_IDS);
}

export async function verifyGoogleIdToken(
  idToken: string,
  audiences: string[]
): Promise<ProviderProfile> {
  if (audiences.length === 0) throw new Error("No Google audiences configured");
  const { payload } = await jwtVerify(idToken, googleJwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: audiences,
  });
  const email = typeof payload.email === "string" ? payload.email : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  const picture = typeof payload.picture === "string" ? payload.picture : null;
  return { sub: String(payload.sub), email, name, image: picture };
}

export async function verifyAppleIdToken(
  idToken: string,
  audiences: string[]
): Promise<ProviderProfile> {
  if (audiences.length === 0) throw new Error("No Apple audiences configured");
  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: audiences,
  });
  const email = typeof payload.email === "string" ? payload.email : null;
  return { sub: String(payload.sub), email, name: null, image: null };
}

export async function issueMobileToken(
  user: MobileSessionUser,
  secret: string
): Promise<string> {
  if (!secret) throw new Error("Missing AUTH_SECRET");
  return encode<MobileTokenPayload>({
    token: {
      sub: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      picture: user.image ?? null,
    },
    secret,
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });
}

export async function verifyMobileToken(
  token: string,
  secret: string
): Promise<MobileSessionUser | null> {
  if (!secret) return null;
  try {
    const decoded = await decode<MobileTokenPayload>({
      token,
      secret,
      salt: MOBILE_TOKEN_SALT,
    });
    if (!decoded?.sub) return null;
    return {
      id: decoded.sub,
      name: decoded.name ?? null,
      email: decoded.email ?? null,
      image: decoded.picture ?? null,
    };
  } catch {
    return null;
  }
}
