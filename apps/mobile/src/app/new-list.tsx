import { useRouter } from "expo-router";
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
import { useCreateList } from "@/hooks/lists";

export default function NewListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const create = useCreateList();

  const submit = () => {
    const value = name.trim();
    if (!value) return;
    create.mutate(value, {
      onSuccess: (list) => {
        router.dismiss();
        router.push({
          pathname: "/lists/[listId]",
          params: { listId: list.id },
        });
      },
      onError: (e) =>
        Alert.alert(t("common.error"), String((e as Error).message)),
    });
  };

  return (
    <SafeAreaView
      className="flex-1 bg-canvas dark:bg-canvas-dark"
      edges={["top"]}
    >
      <ScreenHeader
        title={t("lists.newTitle")}
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
      >
        <View className="flex-1 px-5">
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder={t("lists.newPlaceholder")}
            placeholderTextColor="#a8a39a"
            autoFocus
            returnKeyType="done"
            underlineColorAndroid="transparent"
            className="rounded-2xl bg-gray-100 px-4 py-3 text-base text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          />
          <Pressable
            onPress={submit}
            disabled={!name.trim() || create.isPending}
            className="mt-3 items-center rounded-2xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
          >
            <Text className="font-medium text-white dark:text-gray-900">
              {create.isPending ? t("common.saving") : t("common.add")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
