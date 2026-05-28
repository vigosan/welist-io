import { useColorScheme } from "nativewind";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Input } from "@/components/Input";
import { useSession } from "@/lib/auth";

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill={color}
      />
    </Svg>
  );
}

type Mode = "signIn" | "signUp";

export default function SignInScreen() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const appleLogoColor = colorScheme === "dark" ? "#f0ede8" : "#0c0c0b";
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
          className="mb-3 h-[52px] w-full flex-row items-center justify-center rounded-xl border border-gray-200 bg-white active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
        >
          <View className="absolute left-5">
            <GoogleLogo />
          </View>
          <Text className="font-medium text-gray-900 dark:text-gray-100">
            {t("auth.continueGoogle")}
          </Text>
        </Pressable>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={() => handle(signInWithApple)}
            className="h-[52px] w-full flex-row items-center justify-center rounded-xl border border-gray-200 bg-white active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <View className="absolute left-5">
              <AppleLogo color={appleLogoColor} />
            </View>
            <Text className="font-medium text-gray-900 dark:text-gray-100">
              {t("auth.continueApple")}
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
