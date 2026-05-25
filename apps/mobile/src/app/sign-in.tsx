import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/auth";

const isExpoGo = Constants.appOwnership === "expo";

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signInWithGoogle, signInWithApple, signInWithPassword } =
    useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handle = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert(
        t("auth.signInFailed"),
        e instanceof Error ? e.message : String(e)
      );
    }
  };

  const handlePassword = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg =
        raw === "INVALID_CREDENTIALS" ? t("auth.invalidCredentials") : raw;
      Alert.alert(t("auth.signInFailed"), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-12 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Wilist
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <Pressable
          onPress={handlePassword}
          disabled={submitting || !email || !password}
          className="mb-6 w-full items-center rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="font-medium text-white dark:text-gray-900">
            {submitting ? t("auth.signingIn") : t("auth.signInWithEmail")}
          </Text>
        </Pressable>

        {!isExpoGo && (
          <Pressable
            onPress={() => handle(signInWithGoogle)}
            className="mb-3 w-full items-center rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 dark:bg-gray-100"
          >
            <Text className="font-medium text-white dark:text-gray-900">
              {t("auth.continueGoogle")}
            </Text>
          </Pressable>
        )}

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
