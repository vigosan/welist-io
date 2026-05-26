import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAddItem, useBulkAddItems } from "@/hooks/items";

export default function NewItemScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const [text, setText] = useState("");
  const add = useAddItem(listId);
  const bulkAdd = useBulkAddItems(listId);

  const submit = () => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const onSuccess = () => router.dismiss();
    const onError = (e: unknown) =>
      Alert.alert(t("list.couldNotAdd"), String((e as Error).message));
    if (lines.length === 1) {
      add.mutate(lines[0], { onSuccess, onError });
    } else {
      bulkAdd.mutate(lines, { onSuccess, onError });
    }
  };

  const pending = add.isPending || bulkAdd.isPending;
  const lineCount = text.split("\n").filter((l) => l.trim()).length;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <View className="items-center pt-2 pb-1">
        <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
      </View>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Pressable onPress={() => router.dismiss()} hitSlop={12}>
          <Text className="text-base text-gray-500 dark:text-gray-400">
            {t("common.cancel")}
          </Text>
        </Pressable>
        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("list.newItemTitle")}
        </Text>
        <Pressable
          onPress={submit}
          disabled={!text.trim() || pending}
          hitSlop={12}
        >
          <Text
            className={`text-base font-semibold ${
              !text.trim() || pending
                ? "text-gray-400 dark:text-gray-600"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {pending
              ? t("common.saving")
              : lineCount > 1
                ? t("bulk.addCount", { count: lineCount })
                : t("common.add")}
          </Text>
        </Pressable>
      </View>
      <View className="flex-1 px-5">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("list.addPlaceholder")}
          placeholderTextColor="#a8a39a"
          autoFocus
          multiline
          underlineColorAndroid="transparent"
          className="min-h-[160px] rounded-2xl bg-gray-100 px-5 py-4 text-base text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          textAlignVertical="top"
        />
        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t("list.newItemHint")}
        </Text>
      </View>
    </SafeAreaView>
  );
}
