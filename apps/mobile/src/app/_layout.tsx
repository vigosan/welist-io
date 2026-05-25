import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Href, Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import "@/i18n";
import { loadStoredLanguage } from "@/i18n";
import { SessionProvider, useSession } from "@/lib/auth";
import { loadStoredTheme } from "@/lib/theme";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const router = useRouter();
  const segments = useSegments();
  const pendingPath = useRef<string | null>(null);

  useEffect(() => {
    if (session.status === "loading") return;
    const onSignIn = segments[0] === "sign-in";
    if (session.status === "signed-out" && !onSignIn) {
      const path = segments.filter((s) => !s.startsWith("(")).join("/");
      pendingPath.current = path ? `/${path}` : null;
      router.replace("/sign-in");
    } else if (session.status === "signed-in" && onSignIn) {
      const target = pendingPath.current;
      pendingPath.current = null;
      router.replace((target ?? "/") as Href);
    }
  }, [session, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    loadStoredLanguage();
    loadStoredTheme().then((theme) => setColorScheme(theme));
  }, [setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthGate>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
