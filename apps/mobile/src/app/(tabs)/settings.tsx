import { Eye, EyeOff } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useSetPassword,
  useUpdateProfile,
  useUserMe,
} from "@/hooks/users";
import {
  currentLanguage,
  setLanguage,
  type SupportedLanguage,
} from "@/i18n";
import { useSession } from "@/lib/auth";
import { setStoredTheme, type ThemePreference } from "@/lib/theme";

const LANGS: SupportedLanguage[] = ["en", "es"];
const THEMES: ThemePreference[] = ["system", "light", "dark"];

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useSession();
  const { colorScheme, setColorScheme } = useColorScheme();
  const enabled = session.status === "signed-in";
  const me = useUserMe(enabled);
  const updateProfile = useUpdateProfile();
  const setPasswordMutation = useSetPassword();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (session.status !== "signed-in") return null;

  const currentLang = (i18n.language as SupportedLanguage) || currentLanguage();
  const currentTheme: ThemePreference =
    colorScheme === "light"
      ? "light"
      : colorScheme === "dark"
        ? "dark"
        : "system";

  const onTheme = (next: ThemePreference) => {
    setColorScheme(next);
    setStoredTheme(next);
  };

  const handleSavePassword = () => {
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError(t("profile.minLength"));
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError(t("profile.notMatch"));
      return;
    }
    setPasswordMutation.mutate(password, {
      onSuccess: () => {
        setPassword("");
        setPasswordConfirm("");
      },
    });
  };

  const hasPassword = me.data?.hasPassword ?? false;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader title={t("nav.settings")} />
      <ScrollView contentContainerClassName="px-5 pb-12">
        <Card>
          <View className="flex-row items-center gap-3">
            <Avatar
              name={session.user.name}
              image={session.user.image}
              size={48}
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
                {session.user.name ?? "—"}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {session.user.email}
              </Text>
            </View>
          </View>
        </Card>

        <SectionLabel>{t("profile.publicProfile")}</SectionLabel>
        <Card>
          <Row>
            <View className="flex-1 pr-3">
              <Text className="text-sm text-gray-900 dark:text-gray-100">
                {t("profile.publicProfile")}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t("profile.publicProfileHint")}
              </Text>
            </View>
            <Switch
              value={me.data?.publicProfile ?? true}
              onValueChange={(v) => updateProfile.mutate({ publicProfile: v })}
              disabled={!me.data || updateProfile.isPending}
            />
          </Row>
          <Divider />
          <Row>
            <View className="flex-1 pr-3">
              <Text className="text-sm text-gray-900 dark:text-gray-100">
                {t("profile.notifications")}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t("profile.notificationsHint")}
              </Text>
            </View>
            <Switch
              value={me.data?.emailOptIn ?? true}
              onValueChange={(v) => updateProfile.mutate({ emailOptIn: v })}
              disabled={!me.data || updateProfile.isPending}
            />
          </Row>
        </Card>

        <SectionLabel>
          {hasPassword ? t("profile.passwordSet") : t("profile.password")}
        </SectionLabel>
        <Card>
          <Text className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {hasPassword
              ? t("profile.passwordHintSet")
              : t("profile.passwordHintNew")}
          </Text>
          <View className="mb-2">
            <PasswordField
              value={password}
              onChange={setPassword}
              placeholder={t("profile.newPassword")}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              showLabel={t("profile.show")}
              hideLabel={t("profile.hide")}
            />
          </View>
          <View className="mb-3">
            <PasswordField
              value={passwordConfirm}
              onChange={setPasswordConfirm}
              placeholder={t("profile.confirmPassword")}
              show={showConfirm}
              onToggle={() => setShowConfirm((v) => !v)}
              showLabel={t("profile.show")}
              hideLabel={t("profile.hide")}
            />
          </View>
          {passwordError && (
            <Text className="mb-2 text-xs text-red-600 dark:text-red-400">
              {passwordError}
            </Text>
          )}
          {setPasswordMutation.isSuccess && !passwordError && (
            <Text className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {t("profile.saved")}
            </Text>
          )}
          <Pressable
            onPress={handleSavePassword}
            disabled={!password || setPasswordMutation.isPending}
            className="items-center rounded-xl bg-gray-900 px-4 py-3 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
          >
            <Text className="text-sm font-medium text-white dark:text-gray-900">
              {setPasswordMutation.isPending
                ? t("profile.saving")
                : t("profile.savePassword")}
            </Text>
          </Pressable>
        </Card>

        <SectionLabel>{t("profile.language")}</SectionLabel>
        <Card>
          <View className="flex-row gap-2">
            {LANGS.map((lng) => (
              <Pressable
                key={lng}
                onPress={() => setLanguage(lng)}
                className={`rounded-full px-4 py-1.5 ${
                  currentLang === lng
                    ? "bg-gray-900 dark:bg-gray-100"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    currentLang === lng
                      ? "text-white dark:text-gray-900"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {lng.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionLabel>{t("profile.appearance")}</SectionLabel>
        <Card>
          <View className="flex-row gap-2">
            {THEMES.map((theme) => (
              <Pressable
                key={theme}
                onPress={() => onTheme(theme)}
                className={`rounded-full px-4 py-1.5 ${
                  currentTheme === theme
                    ? "bg-gray-900 dark:bg-gray-100"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    currentTheme === theme
                      ? "text-white dark:text-gray-900"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t(`profile.theme${theme[0].toUpperCase()}${theme.slice(1)}` as never)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <View className="mt-6">
          <Pressable
            onPress={signOut}
            className="items-center rounded-2xl border border-red-200 bg-white px-4 py-3 active:bg-red-50 dark:border-red-900 dark:bg-gray-900 dark:active:bg-red-950"
          >
            <Text className="text-sm font-medium text-red-600 dark:text-red-400">
              {t("common.signOut")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {children}
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mt-5 mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </Text>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">{children}</View>
  );
}

function Divider() {
  return (
    <View className="my-3 h-px bg-gray-100 dark:bg-gray-800" />
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <View className="relative">
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a0a09c"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 pr-10 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <Pressable
        onPress={onToggle}
        accessibilityLabel={show ? hideLabel : showLabel}
        hitSlop={8}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5"
      >
        {show ? (
          <EyeOff color="#a0a09c" size={16} />
        ) : (
          <Eye color="#a0a09c" size={16} />
        )}
      </Pressable>
    </View>
  );
}
