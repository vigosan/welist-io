import { useLocalSearchParams, useRouter } from "expo-router";
import { Mic } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlaceMentionSuggestions } from "@/components/PlaceMentionSuggestions";
import { useAddItem, useBulkAddItems } from "@/hooks/items";
import { useIsDark } from "@/hooks/useIsDark";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { PARTIAL_PLACE_REGEX } from "@/lib/places";
import type { Coords } from "@/services/items";

export default function NewItemScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isDark = useIsDark();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const [text, setText] = useState("");
  const [pendingCoords, setPendingCoords] = useState<Coords | null>(null);
  const add = useAddItem(listId);
  const bulkAdd = useBulkAddItems(listId);
  const speech = useSpeechInput(i18n.language, (heard) => {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${heard}` : heard));
  });

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
      add.mutate(
        { text: lines[0], coords: pendingCoords ?? undefined },
        { onSuccess, onError }
      );
    } else {
      bulkAdd.mutate(lines, { onSuccess, onError });
    }
  };

  const pending = add.isPending || bulkAdd.isPending;
  const lineCount = text.split("\n").filter((l) => l.trim()).length;
  const partial = PARTIAL_PLACE_REGEX.exec(text)?.[1] ?? null;

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
      <ScrollView
        className="flex-1 px-5"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <TextInput
          value={text}
          onChangeText={(val) => {
            setText(val);
            if (!PARTIAL_PLACE_REGEX.test(val)) setPendingCoords(null);
          }}
          placeholder={t("list.addPlaceholder")}
          placeholderTextColor="#a8a39a"
          autoFocus
          multiline
          underlineColorAndroid="transparent"
          className="min-h-[160px] rounded-2xl bg-gray-100 px-5 py-4 text-base text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          textAlignVertical="top"
        />
        {partial !== null && (
          <PlaceMentionSuggestions
            query={partial}
            onSelect={(place) => {
              setText((prev) =>
                prev.replace(PARTIAL_PLACE_REGEX, `@${place.name} `)
              );
              setPendingCoords({
                latitude: place.latitude,
                longitude: place.longitude,
                placeName: place.name,
              });
              Keyboard.dismiss();
            }}
          />
        )}
        {speech.supported && (
          <Pressable
            onPress={() => (speech.listening ? speech.stop() : speech.start())}
            className={`mt-3 flex-row items-center justify-center gap-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
              speech.listening
                ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            <Mic
              size={16}
              color={
                speech.listening
                  ? isDark
                    ? "#0c0c0b"
                    : "#ffffff"
                  : isDark
                    ? "#f0ede8"
                    : "#0c0c0b"
              }
            />
            <Text
              className={`text-sm font-medium ${
                speech.listening
                  ? "text-white dark:text-gray-900"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {speech.listening ? t("list.listening") : t("list.dictate")}
            </Text>
          </Pressable>
        )}
        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t("list.newItemHint")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
