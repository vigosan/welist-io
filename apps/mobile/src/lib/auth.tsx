import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { API_BASE, apiFetch, getToken, setToken } from "./api";

WebBrowser.maybeCompleteAuthSession();

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
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    name?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

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

  const [googleRequest, googleResponse, promptGoogle] =
    Google.useIdTokenAuthRequest({
      clientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    });

  const googlePending = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
  } | null>(null);

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

  useEffect(() => {
    if (!googleResponse) return;
    const pending = googlePending.current;
    if (!pending) return;
    googlePending.current = null;

    (async () => {
      try {
        if (googleResponse.type === "success") {
          const idToken = googleResponse.params.id_token;
          if (!idToken)
            throw new Error("Google did not return an id token");
          const user = await exchange("google", idToken);
          setSession({ status: "signed-in", user });
          pending.resolve();
        } else if (googleResponse.type === "error") {
          pending.reject(
            new Error(googleResponse.error?.message ?? "Google sign-in failed")
          );
        } else {
          pending.resolve();
        }
      } catch (e) {
        pending.reject(e instanceof Error ? e : new Error(String(e)));
      }
    })();
  }, [googleResponse]);

  const signInWithGoogle = useCallback(async () => {
    if (googlePending.current) return;
    await new Promise<void>((resolve, reject) => {
      googlePending.current = { resolve, reject };
      promptGoogle().catch((err) => {
        googlePending.current = null;
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }, [promptGoogle]);

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

  const signInWithPassword = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth-mobile/email-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("INVALID_CREDENTIALS");
      throw new Error(`Sign-in failed (${res.status})`);
    }
    const data = (await res.json()) as { token: string; user: User };
    await setToken(data.token);
    setSession({ status: "signed-in", user: data.user });
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    name?: string
  ) => {
    const res = await fetch(`${API_BASE}/api/auth-mobile/email-signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      if (res.status === 409) throw new Error("EMAIL_IN_USE");
      throw new Error(`Sign-up failed (${res.status})`);
    }
    const data = (await res.json()) as { token: string; user: User };
    await setToken(data.token);
    setSession({ status: "signed-in", user: data.user });
  };

  const signOut = async () => {
    await setToken(null);
    setSession({ status: "signed-out" });
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        signInWithGoogle,
        signInWithApple,
        signInWithPassword,
        signUpWithPassword,
        signOut,
      }}
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
