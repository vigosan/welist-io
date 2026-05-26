import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

type Props = {
  category: string | null;
};

export function CategoryTag({ category }: Props) {
  const { t } = useTranslation();
  if (!category) return null;
  return (
    <View className="self-start rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
      <Text className="text-[10px] font-medium uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {t(`categories.${category}` as never)}
      </Text>
    </View>
  );
}
