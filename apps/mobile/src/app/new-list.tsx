import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
          {t("lists.newTitle")}
        </Text>
        <Pressable
          onPress={submit}
          disabled={!name.trim() || create.isPending}
          hitSlop={12}
        >
          <Text
            className={`text-base font-semibold ${
              !name.trim() || create.isPending
                ? "text-gray-400 dark:text-gray-600"
                : "text-gray-900 dark:text-gray-100"
            }`}
          >
            {create.isPending ? t("common.saving") : t("common.add")}
          </Text>
        </Pressable>
      </View>
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
          textAlignVertical="center"
          style={{ fontSize: 16, lineHeight: 20 }}
          className="rounded-2xl bg-gray-100 px-5 py-4 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
        />
      </View>
    </SafeAreaView>
  );
}
