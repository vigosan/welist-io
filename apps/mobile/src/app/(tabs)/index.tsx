import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  if (session.status !== "signed-in") return null;

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 px-6 pt-16">
        <Text className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Wilist
        </Text>
        <Text className="mt-2 text-base text-gray-500 dark:text-gray-400">
          Hi {session.user.name ?? "there"}
        </Text>

        <Pressable
          onPress={() => router.push("/lists")}
          className="mt-10 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            Go to my lists
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
