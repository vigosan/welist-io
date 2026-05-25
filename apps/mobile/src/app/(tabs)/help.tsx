import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HelpScreen() {
  const { t } = useTranslation();
  // biome-ignore lint/suspicious/noExplicitAny: dynamic i18n keys
  const tk = (key: string) => t(key as any) as string;
  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScrollView contentContainerClassName="px-4 pb-12">
        <Text className="mt-2 mb-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t("help.title")}
        </Text>
        <Text className="mb-6 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {t("help.subtitle")}
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.key} className="mb-6">
            <Text className="mb-2 text-base font-semibold text-gray-900 dark:text-gray-100">
              {tk(`help.sections.${s.key}.title`)}
            </Text>
            {s.items.map((item) => (
              <Text
                key={item}
                className="mb-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed"
              >
                • {tk(`help.sections.${s.key}.items.${item}`)}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const SECTIONS = [
  { key: "lists", items: ["create", "addItems", "reorder", "markDone", "tag"] },
  { key: "challenges", items: ["makePublic", "track", "complete"] },
  { key: "collaboration", items: ["enable", "edit", "leave"] },
  { key: "social", items: ["follow", "directory"] },
] as const;
