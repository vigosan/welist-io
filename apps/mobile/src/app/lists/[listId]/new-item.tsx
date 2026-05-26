import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
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
      edges={["top", "bottom"]}
    >
      <ScreenHeader
        title={t("list.newItemTitle")}
        right={
          <Pressable onPress={() => router.dismiss()} hitSlop={8}>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.cancel")}
            </Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <View className="flex-1 px-6 pt-4">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("list.addPlaceholder")}
            placeholderTextColor="#a8a39a"
            autoFocus
            multiline
            underlineColorAndroid="transparent"
            className="min-h-[160px] rounded-2xl bg-gray-100 px-4 py-4 text-base text-gray-900 dark:bg-gray-800 dark:text-gray-100"
            textAlignVertical="top"
          />
          <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t("list.newItemHint")}
          </Text>
        </View>
        <View className="px-6 pb-4">
          <Pressable
            onPress={submit}
            disabled={!text.trim() || pending}
            className="items-center rounded-2xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
          >
            <Text className="font-medium text-white dark:text-gray-900">
              {pending
                ? t("common.saving")
                : lineCount > 1
                  ? t("bulk.addCount", { count: lineCount })
                  : t("common.add")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
