import { useRouter } from "expo-router";
import { HelpCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressDonut } from "@/components/ProgressDonut";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useCreateList, useDeleteList, useMyLists } from "@/hooks/lists";
import type { MyListItem } from "@/types";

export default function MyListsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const query = useMyLists();
  const create = useCreateList();
  const remove = useDeleteList();

  const lists = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data]
  );

  const submitCreate = () => {
    const name = newName.trim();
    if (!name) return;
    create.mutate(name, {
      onSuccess: () => setNewName(""),
      onError: (e) =>
        Alert.alert(t("lists.couldNotCreate"), String((e as Error).message)),
    });
  };

  const confirmDelete = (item: MyListItem) =>
    Alert.alert(
      t("lists.deleteTitle"),
      t("lists.deleteBody", { name: item.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => remove.mutate(item.id),
        },
      ]
    );

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <ScreenHeader
        title={t("lists.title")}
        right={
          <Pressable
            onPress={() => router.push("/help")}
            accessibilityLabel={t("nav.help")}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06]"
          >
            <HelpCircle color="#0c0c0b" size={20} />
          </Pressable>
        }
      />

      <View className="mx-6 mb-3 flex-row items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700 dark:bg-gray-900">
        <TextInput
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={submitCreate}
          placeholder={t("lists.newPlaceholder")}
          placeholderTextColor="#a0a09c"
          returnKeyType="done"
          className="flex-1 px-3 text-sm text-gray-900 dark:text-gray-100"
        />
        <Pressable
          onPress={submitCreate}
          disabled={!newName.trim() || create.isPending}
          className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-sm font-medium text-white dark:text-gray-900">
            {t("common.add")}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(it) => it.id}
        contentContainerClassName="px-6 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => query.refetch()}
          />
        }
        onEndReached={() =>
          query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()
        }
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("lists.empty")}
            </Text>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/lists/[listId]",
                params: { listId: item.id },
              })
            }
            onLongPress={() => confirmDelete(item)}
            className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
          >
            <ProgressDonut done={item.doneCount} total={item.itemCount} />
            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="text-base font-medium text-gray-900 dark:text-gray-100"
              >
                {item.name}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {t("lists.progress", {
                  done: item.doneCount,
                  total: item.itemCount,
                })}
                {item.participantCount > 0
                  ? ` · ${t("lists.participants", { count: item.participantCount })}`
                  : ""}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
