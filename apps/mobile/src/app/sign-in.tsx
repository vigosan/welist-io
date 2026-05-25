import * as AppleAuthentication from "expo-apple-authentication";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple } = useSession();

  const handle = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert("Sign-in failed", e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-12 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Wilist
        </Text>

        <Pressable
          onPress={() => handle(signInWithGoogle)}
          className="mb-3 w-full items-center rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 dark:bg-gray-100"
        >
          <Text className="font-medium text-white dark:text-gray-900">
            Continue with Google
          </Text>
        </Pressable>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={{ width: "100%", height: 52 }}
            onPress={() => handle(signInWithApple)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
