import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { SessionProvider, useSession } from "@/lib/auth";

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (session.status === "loading") return;
    const onSignIn = segments[0] === "sign-in";
    if (session.status === "signed-out" && !onSignIn) router.replace("/sign-in");
    else if (session.status === "signed-in" && onSignIn) router.replace("/");
  }, [session, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
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
