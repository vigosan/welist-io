import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useCloneList,
  useDeleteList,
  useList,
  useUpdateList,
} from "@/hooks/lists";
import { LIST_CATEGORIES, type ListCategory } from "@/lib/categories";

export default function ListSettingsScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const list = useList(listId);
  const update = useUpdateList(listId);
  const clone = useCloneList();
  const remove = useDeleteList();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ListCategory | "">("");
  const [isPublic, setIsPublic] = useState(false);
  const [collaborative, setCollaborative] = useState(false);

  useEffect(() => {
    if (!list.data) return;
    setName(list.data.name ?? "");
    setSlug(list.data.slug ?? "");
    setDescription(list.data.description ?? "");
    setCategory((list.data.category as ListCategory | null) ?? "");
    setIsPublic(list.data.public);
    setCollaborative(list.data.collaborative);
  }, [list.data]);

  const save = () => {
    update.mutate(
      {
        name: name.trim(),
        slug: slug.trim() || null,
        description: description.trim() || null,
        category: category || null,
        public: isPublic,
        collaborative,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) =>
          Alert.alert("Could not save", String((e as Error).message)),
      }
    );
  };

  const doClone = () =>
    clone.mutate(listId, {
      onSuccess: (created) => {
        router.replace({
          pathname: "/lists/[listId]",
          params: { listId: created.id },
        });
      },
      onError: (e) =>
        Alert.alert("Could not clone", String((e as Error).message)),
    });

  const confirmDelete = () =>
    Alert.alert("Delete list", `Delete "${list.data?.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(listId, {
            onSuccess: () => router.dismissAll(),
          }),
      },
    ]);

  if (list.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <ActivityIndicator className="mt-10" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
      <Stack.Screen options={{ title: "List settings", headerShown: true }} />

      <ScrollView contentContainerClassName="px-6 pb-10 pt-4">
        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label="Slug">
          <TextInput
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            placeholder="optional, e.g. my-best-movies"
            placeholderTextColor="#a0a09c"
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label="Description">
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholder="optional"
            placeholderTextColor="#a0a09c"
            className="h-24 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label="Category">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {LIST_CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(active ? "" : c)}
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
                    {c}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Toggle
          label="Public"
          hint="Visible in Explore. Others can take it as a challenge."
          value={isPublic}
          onChange={setIsPublic}
        />

        <Toggle
          label="Collaborative"
          hint="Signed-in viewers can edit items."
          value={collaborative}
          onChange={setCollaborative}
        />

        <Pressable
          onPress={save}
          disabled={!name.trim() || update.isPending}
          className="mt-6 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            Save
          </Text>
        </Pressable>

        <View className="mt-10 gap-3">
          <Pressable
            onPress={doClone}
            disabled={clone.isPending}
            className="rounded-xl border border-gray-200 px-6 py-3 active:opacity-80 dark:border-gray-700"
          >
            <Text className="text-center font-medium text-gray-900 dark:text-gray-100">
              Clone list
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            className="rounded-xl border border-red-200 px-6 py-3 active:opacity-80"
          >
            <Text className="text-center font-medium text-red-600">
              Delete list
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <View className="flex-1 pr-3">
        <Text className="text-base font-medium text-gray-900 dark:text-gray-100">
          {label}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}
