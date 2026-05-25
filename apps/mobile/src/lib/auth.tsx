import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { API_BASE, apiFetch, getToken, setToken } from "./api";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User };

type SessionContextValue = {
  session: SessionState;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

if (GOOGLE_WEB_CLIENT_ID) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
}

async function exchange(
  provider: "google" | "apple",
  idToken: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth-mobile/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, idToken }),
  });
  if (!res.ok) throw new Error(`Exchange failed (${res.status})`);
  const data = (await res.json()) as { token: string; user: User };
  await setToken(data.token);
  return data.user;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setSession({ status: "signed-out" });
        return;
      }
      try {
        const user = await apiFetch<User | null>("/me");
        if (user) setSession({ status: "signed-in", user });
        else {
          await setToken(null);
          setSession({ status: "signed-out" });
        }
      } catch {
        await setToken(null);
        setSession({ status: "signed-out" });
      }
    })();
  }, []);

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    if (result.type !== "success") return;
    const idToken = result.data.idToken;
    if (!idToken) throw new Error("Google did not return an id token");
    const user = await exchange("google", idToken);
    setSession({ status: "signed-in", user });
  };

  const signInWithApple = async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken)
      throw new Error("Apple did not return an identity token");
    const user = await exchange("apple", credential.identityToken);
    setSession({ status: "signed-in", user });
  };

  const signOut = async () => {
    await setToken(null);
    try {
      await GoogleSignin.signOut();
    } catch {}
    setSession({ status: "signed-out" });
  };

  return (
    <SessionContext.Provider
      value={{ session, signInWithGoogle, signInWithApple, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
