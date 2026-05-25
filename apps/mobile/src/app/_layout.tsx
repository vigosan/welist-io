import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Href, Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "../global.css";
import "@/i18n";
import { loadStoredLanguage } from "@/i18n";
import { SessionProvider, useSession } from "@/lib/auth";
import { loadStoredTheme } from "@/lib/theme";

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t("common.error")}
        </Text>
        <Text className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {error.message}
        </Text>
        <Pressable
          onPress={retry}
          className="mt-8 rounded-xl bg-gray-900 px-6 py-3 active:opacity-80 dark:bg-gray-100"
        >
          <Text className="font-medium text-white dark:text-gray-900">
            {t("common.retry")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

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
      pendingPath.current = path && path !== "" ? `/${path}` : null;
      router.replace("/sign-in");
    } else if (session.status === "signed-in" && onSignIn) {
      const target = pendingPath.current;
      pendingPath.current = null;
      router.replace((target ?? "/lists") as Href);
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
            <Stack
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
                animationDuration: 250,
                gestureEnabled: true,
              }}
            />
          </AuthGate>
        </SessionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
