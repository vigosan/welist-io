import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";

export default function HomeScreen() {
  const { session, signOut } = useSession();
  if (session.status !== "signed-in") return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Wilist
        </Text>
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {session.user.email ?? session.user.name ?? session.user.id}
        </Text>
        <Pressable
          onPress={signOut}
          className="mt-10 rounded-xl bg-gray-900 px-6 py-3 active:opacity-80 dark:bg-gray-100"
        >
          <Text className="font-medium text-white dark:text-gray-900">
            Sign out
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
