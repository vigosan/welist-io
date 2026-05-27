import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/Input";
import { useSession } from "@/lib/auth";

type Mode = "signIn" | "signUp";

export default function SignInScreen() {
  const { t } = useTranslation();
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithPassword,
    signUpWithPassword,
  } = useSession();

  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
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

  const handleEmailSubmit = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === "signIn") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(
          email.trim(),
          password,
          name.trim() || undefined
        );
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const msg =
        raw === "INVALID_CREDENTIALS"
          ? t("auth.invalidCredentials")
          : raw === "EMAIL_IN_USE"
            ? t("auth.emailInUse")
            : raw;
      Alert.alert(t("auth.signInFailed"), msg);
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled =
    submitting ||
    !email ||
    !password ||
    (mode === "signUp" && password.length < 8);

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="mb-10 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Welist
        </Text>

        <View className="mb-5 flex-row rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          <Pressable
            onPress={() => setMode("signIn")}
            className={`rounded-lg px-5 py-2 ${
              mode === "signIn" ? "bg-gray-900 dark:bg-gray-100" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                mode === "signIn"
                  ? "text-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {t("auth.signInMode")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("signUp")}
            className={`rounded-lg px-5 py-2 ${
              mode === "signUp" ? "bg-gray-900 dark:bg-gray-100" : ""
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                mode === "signUp"
                  ? "text-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              {t("auth.signUpMode")}
            </Text>
          </Pressable>
        </View>

        {mode === "signUp" && (
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t("auth.namePlaceholder")}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            className="mb-2 w-full"
          />
        )}
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          className="mb-2 w-full"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === "signIn" ? "password" : "new-password"}
          textContentType={mode === "signIn" ? "password" : "newPassword"}
          className="mb-3 w-full"
        />
        <Pressable
          onPress={handleEmailSubmit}
          disabled={submitDisabled}
          className="mb-2 w-full items-center rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="font-medium text-white dark:text-gray-900">
            {submitting
              ? mode === "signIn"
                ? t("auth.signingIn")
                : t("auth.creating")
              : mode === "signIn"
                ? t("auth.signInWithEmail")
                : t("auth.createAccount")}
          </Text>
        </Pressable>

        <View className="my-4 w-full flex-row items-center">
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          <Text className="mx-3 text-xs uppercase text-gray-500 dark:text-gray-400">
            {t("auth.or")}
          </Text>
          <View className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
        </View>

        <Pressable
          onPress={() => handle(signInWithGoogle)}
          className="mb-3 w-full items-center rounded-xl border border-gray-200 bg-white px-6 py-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="font-medium text-gray-900 dark:text-gray-100">
            {t("auth.continueGoogle")}
          </Text>
        </Pressable>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
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
