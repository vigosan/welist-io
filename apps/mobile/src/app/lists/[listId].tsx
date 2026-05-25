import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAddItem,
  useDeleteItem,
  useItems,
  useToggleItem,
} from "@/hooks/items";
import { useList } from "@/hooks/lists";
import type { Item } from "@/types";

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const [newText, setNewText] = useState("");

  const list = useList(listId);
  const items = useItems(listId);
  const add = useAddItem(listId);
  const toggle = useToggleItem(listId);
  const remove = useDeleteItem(listId);

  const submitAdd = () => {
    const text = newText.trim();
    if (!text) return;
    add.mutate(text, {
      onSuccess: () => setNewText(""),
      onError: (e) =>
        Alert.alert("Could not add item", String((e as Error).message)),
    });
  };

  const confirmDelete = (item: Item) =>
    Alert.alert("Delete item", `Delete "${item.text}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove.mutate(item.id),
      },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen
        options={{ title: list.data?.name ?? "List", headerShown: true }}
      />

      <View className="mx-6 mt-3 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
        <TextInput
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={submitAdd}
          placeholder="Add an item"
          placeholderTextColor="#a0a09c"
          returnKeyType="done"
          className="flex-1 px-3 text-sm text-gray-900 dark:text-gray-100"
        />
        <Pressable
          onPress={submitAdd}
          disabled={!newText.trim() || add.isPending}
          className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-sm font-medium text-white dark:text-gray-900">
            Add
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items.data ?? []}
        keyExtractor={(it) => it.id}
        contentContainerClassName="px-6 pb-10"
        ListEmptyComponent={
          items.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No items yet.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggle.mutate(item.id)}
            onLongPress={() => confirmDelete(item)}
            className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <View
              className={`h-5 w-5 items-center justify-center rounded-md border ${
                item.done
                  ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            >
              {item.done && (
                <Text className="text-xs font-bold text-white dark:text-gray-900">
                  ✓
                </Text>
              )}
            </View>
            <Text
              className={`flex-1 text-base ${
                item.done
                  ? "text-gray-400 line-through dark:text-gray-600"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {item.text}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
