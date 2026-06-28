import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { EmptyState, EmptyStateUsersIcon } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import {
  useAddComment,
  useDeleteComment,
  useItemComments,
} from "@/hooks/items";
import { useSession } from "@/lib/auth";
import type { ItemCommentView } from "@/types";

export default function ItemCommentsScreen() {
  const { t } = useTranslation();
  const { listId, itemId } = useLocalSearchParams<{
    listId: string;
    itemId: string;
  }>();
  const { session } = useSession();
  const myId = session.status === "signed-in" ? session.user.id : null;
  const query = useItemComments(listId, itemId, true);
  const addComment = useAddComment(listId, itemId);
  const deleteComment = useDeleteComment(listId, itemId);
  const [body, setBody] = useState("");

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed || addComment.isPending) return;
    addComment.mutate(trimmed, { onSuccess: () => setBody("") });
  };

  const renderItem = ({ item }: { item: ItemCommentView }) => {
    const canDelete = myId === item.userId;
    return (
      <View className="flex-row items-start gap-3 px-5 py-3">
        <Avatar name={item.userName} image={item.userImage} size={28} />
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {item.userName ?? t("feed.someone")}
          </Text>
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {item.body}
          </Text>
        </View>
        {canDelete && (
          <Pressable
            onPress={() => deleteComment.mutate(item.id)}
            hitSlop={8}
            className="active:opacity-60"
          >
            <Text className="text-gray-400">✕</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader title={t("comments.title")} back />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={query.data ?? []}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          ListEmptyComponent={
            query.isLoading ? (
              <ActivityIndicator className="py-8" />
            ) : (
              <EmptyState
                icon={<EmptyStateUsersIcon />}
                title={t("comments.title")}
                subtitle={t("comments.empty")}
              />
            )
          }
        />
        {myId && (
          <View className="flex-row items-center gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("comments.placeholder")}
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100"
            />
            <Pressable
              onPress={submit}
              disabled={!body.trim() || addComment.isPending}
              className="rounded-xl bg-gray-900 px-4 py-2 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
            >
              <Text className="text-sm font-medium text-white dark:text-gray-900">
                {t("comments.send")}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
