import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBulkAddItems } from "@/hooks/items";
import { parseBulkText } from "@/lib/bulk-text";

export default function BulkAddScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const bulk = useBulkAddItems(listId);

  const parsed = useMemo(() => parseBulkText(raw), [raw]);

  const submit = () => {
    if (parsed.length === 0) return;
    bulk.mutate(parsed, {
      onSuccess: () => router.back(),
      onError: (e) =>
        Alert.alert("Could not add items", String((e as Error).message)),
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen options={{ title: "Bulk add", headerShown: true }} />

      <View className="flex-1 px-6 pt-4">
        <Text className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          Paste one item per line. Duplicates and blank lines are removed.
        </Text>

        <TextInput
          value={raw}
          onChangeText={setRaw}
          multiline
          autoFocus
          textAlignVertical="top"
          placeholder={"Avatar\nDune\nInception"}
          placeholderTextColor="#a0a09c"
          className="h-48 rounded-2xl border border-gray-200 bg-white p-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />

        <Text className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {parsed.length} item{parsed.length === 1 ? "" : "s"} ready
        </Text>

        <ScrollView className="mt-2 max-h-48">
          {parsed.map((line) => (
            <Text
              key={line}
              numberOfLines={1}
              className="py-0.5 text-sm text-gray-900 dark:text-gray-100"
            >
              {line}
            </Text>
          ))}
        </ScrollView>

        <Pressable
          onPress={submit}
          disabled={parsed.length === 0 || bulk.isPending}
          className="mt-6 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            Add {parsed.length} item{parsed.length === 1 ? "" : "s"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
