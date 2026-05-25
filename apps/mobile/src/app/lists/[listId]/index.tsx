import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAddItem,
  useDeleteItem,
  useItems,
  useReorderItems,
  useToggleItem,
  useUpdateItem,
} from "@/hooks/items";
import { useList } from "@/hooks/lists";
import { type FilterMode, filterItems } from "@/lib/items-filter";
import type { Item } from "@/types";

const FILTERS: FilterMode[] = ["all", "pending", "done"];

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const [newText, setNewText] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editing, setEditing] = useState<Item | null>(null);
  const [editingText, setEditingText] = useState("");

  const list = useList(listId);
  const items = useItems(listId);
  const add = useAddItem(listId);
  const toggle = useToggleItem(listId);
  const update = useUpdateItem(listId);
  const remove = useDeleteItem(listId);
  const reorder = useReorderItems(listId);

  const visible = useMemo(
    () => filterItems(items.data ?? [], filter),
    [items.data, filter]
  );

  const submitAdd = () => {
    const text = newText.trim();
    if (!text) return;
    add.mutate(text, {
      onSuccess: () => setNewText(""),
      onError: (e) =>
        Alert.alert("Could not add item", String((e as Error).message)),
    });
  };

  const openItemMenu = (item: Item) =>
    Alert.alert(item.text, undefined, [
      {
        text: "Edit",
        onPress: () => {
          setEditingText(item.text);
          setEditing(item);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove.mutate(item.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);

  const saveEdit = () => {
    if (!editing) return;
    const text = editingText.trim();
    if (!text || text === editing.text) {
      setEditing(null);
      return;
    }
    update.mutate(
      { itemId: editing.id, text },
      {
        onSettled: () => setEditing(null),
        onError: (e) =>
          Alert.alert("Could not save", String((e as Error).message)),
      }
    );
  };

  const renderRow = ({ item, drag, isActive }: RenderItemParams<Item>) => {
    const dragEnabled = filter === "all";
    return (
      <ScaleDecorator>
        <View
          className={`mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 ${
            isActive ? "opacity-80" : ""
          }`}
        >
          <Pressable
            onPress={() => toggle.mutate(item.id)}
            onLongPress={() => openItemMenu(item)}
            disabled={isActive}
            className="flex-1 flex-row items-center gap-3 active:opacity-80"
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

          {dragEnabled && (
            <Pressable
              onLongPress={drag}
              delayLongPress={150}
              disabled={isActive}
              hitSlop={8}
              className="px-1"
            >
              <Text className="text-base text-gray-400">≡</Text>
            </Pressable>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen
        options={{
          title: list.data?.name ?? "List",
          headerShown: true,
          headerRight: () => (
            <View className="flex-row gap-3 pr-3">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/lists/[listId]/bulk-add",
                    params: { listId },
                  })
                }
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  Bulk
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/lists/[listId]/settings",
                    params: { listId },
                  })
                }
              >
                <Text className="text-sm text-gray-900 dark:text-gray-100">
                  Settings
                </Text>
              </Pressable>
            </View>
          ),
        }}
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

      <View className="mx-6 mb-3 flex-row gap-2">
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 ${
                active
                  ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
                  : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <Text
                className={`text-xs font-medium capitalize ${
                  active
                    ? "text-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {f}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <DraggableFlatList
        data={visible}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        onDragEnd={({ data }) => {
          if (filter !== "all") return;
          reorder.mutate(data);
        }}
        ListEmptyComponent={
          items.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              No items.
            </Text>
          )
        }
        renderItem={renderRow}
      />

      <Modal
        animationType="fade"
        transparent
        visible={editing !== null}
        onRequestClose={() => setEditing(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-8">
          <View className="w-full rounded-2xl bg-white p-5 dark:bg-gray-900">
            <Text className="mb-3 text-base font-medium text-gray-900 dark:text-gray-100">
              Edit item
            </Text>
            <TextInput
              value={editingText}
              onChangeText={setEditingText}
              autoFocus
              className="rounded-xl border border-gray-200 px-3 py-2 text-base text-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
            <View className="mt-4 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setEditing(null)}
                className="px-4 py-2"
              >
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 dark:bg-gray-100"
              >
                <Text className="text-sm font-medium text-white dark:text-gray-900">
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
