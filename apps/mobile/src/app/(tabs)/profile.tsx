import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  if (session.status !== "signed-in") return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 pt-16">
        <Text className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Profile
        </Text>
        <Text className="mt-4 text-base text-gray-900 dark:text-gray-100">
          {session.user.name ?? "—"}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {session.user.email ?? session.user.id}
        </Text>

        <Pressable
          onPress={signOut}
          className="mt-10 self-start rounded-xl border border-gray-200 px-6 py-3 active:opacity-80 dark:border-gray-700"
        >
          <Text className="font-medium text-gray-900 dark:text-gray-100">
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
