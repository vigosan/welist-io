import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  currentLanguage,
  setLanguage,
  type SupportedLanguage,
} from "@/i18n";
import { useSession } from "@/lib/auth";
import { setStoredTheme, type ThemePreference } from "@/lib/theme";

const LANGS: SupportedLanguage[] = ["en", "es"];
const THEMES: ThemePreference[] = ["system", "light", "dark"];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useSession();
  const { colorScheme, setColorScheme } = useColorScheme();

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

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader title={t("profile.title")} back />
      <View className="flex-1 px-5">
        <Text className="text-base text-gray-900 dark:text-gray-100">
          {session.user.name ?? "—"}
        </Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {session.user.email ?? session.user.id}
        </Text>

        <Section label={t("profile.language")}>
          <Row>
            {LANGS.map((lng) => (
              <Chip
                key={lng}
                active={currentLang === lng}
                label={lng.toUpperCase()}
                onPress={() => setLanguage(lng)}
              />
            ))}
          </Row>
        </Section>

        <Section label={t("profile.appearance")}>
          <Row>
            {THEMES.map((th) => (
              <Chip
                key={th}
                active={currentTheme === th}
                label={t(
                  th === "system"
                    ? "profile.themeSystem"
                    : th === "light"
                      ? "profile.themeLight"
                      : "profile.themeDark"
                )}
                onPress={() => onTheme(th)}
              />
            ))}
          </Row>
        </Section>

        <Pressable
          onPress={signOut}
          className="mt-10 self-start rounded-xl border border-gray-200 px-6 py-3 active:opacity-80 dark:border-gray-700"
        >
          <Text className="font-medium text-gray-900 dark:text-gray-100">
            {t("common.signOut")}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-8">
      <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-2">{children}</View>;
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${
        active
          ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      <Text
        className={`text-xs font-medium ${
          active
            ? "text-white dark:text-gray-900"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
