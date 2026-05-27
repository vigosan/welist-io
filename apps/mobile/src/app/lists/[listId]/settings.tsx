import { useLocalSearchParams, useRouter } from "expo-router";
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
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAddCollaborator,
  useCollaborators,
  useRemoveCollaborator,
} from "@/hooks/collaborators";
import {
  useCloneList,
  useDeleteList,
  useList,
  useListActivity,
  useUpdateList,
} from "@/hooks/lists";
import { useUserSearch } from "@/hooks/users";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSession } from "@/lib/auth";
import { LIST_CATEGORIES, type ListCategory } from "@/lib/categories";
import { formatRelativeTime } from "@/lib/relative-time";

export default function ListSettingsScreen() {
  const { t } = useTranslation();
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const router = useRouter();
  const { session } = useSession();
  const list = useList(listId);
  const update = useUpdateList(listId);
  const clone = useCloneList();
  const remove = useDeleteList();

  const isOwner =
    session.status === "signed-in" &&
    !!list.data?.ownerId &&
    session.user.id === list.data.ownerId;
  const showCollabs = isOwner && list.data?.collaborative === true;

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
          Alert.alert(t("settings.couldNotSave"), String((e as Error).message)),
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
        Alert.alert(t("settings.couldNotClone"), String((e as Error).message)),
    });

  const confirmDelete = () =>
    Alert.alert(
      t("lists.deleteTitle"),
      t("lists.deleteBody", { name: list.data?.name ?? "" }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () =>
            remove.mutate(listId, {
              onSuccess: () => router.dismissAll(),
            }),
        },
      ]
    );

  if (list.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark">
        <ActivityIndicator className="mt-10" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-canvas-dark" edges={["top"]}>
      <View className="items-center pt-2 pb-1">
        <View className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
      </View>
      <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
        <Text className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {t("settings.title")}
        </Text>
        <Pressable onPress={() => router.dismiss()} hitSlop={12}>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t("common.cancel")}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10">
        <Field label={t("settings.name")}>
          <TextInput
            value={name}
            onChangeText={setName}
            textAlignVertical="center"
            style={{ fontSize: 16, lineHeight: 20 }}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label={t("settings.slug")}>
          <TextInput
            value={slug}
            onChangeText={setSlug}
            autoCapitalize="none"
            placeholder={t("settings.slugPlaceholder")}
            placeholderTextColor="#a0a09c"
            textAlignVertical="center"
            style={{ fontSize: 16, lineHeight: 20 }}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label={t("settings.description")}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholder={t("settings.descPlaceholder")}
            placeholderTextColor="#a0a09c"
            className="h-24 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </Field>

        <Field label={t("settings.category")}>
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
                    className={`text-xs font-medium ${
                      active
                        ? "text-white dark:text-gray-900"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {t(`categories.${c}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Toggle
          label={t("settings.public")}
          hint={t("settings.publicHint")}
          value={isPublic}
          onChange={setIsPublic}
        />

        <Toggle
          label={t("settings.collaborative")}
          hint={t("settings.collabHint")}
          value={collaborative}
          onChange={setCollaborative}
        />

        <Pressable
          onPress={save}
          disabled={!name.trim() || update.isPending}
          className="mt-6 rounded-xl bg-gray-900 px-6 py-4 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
        >
          <Text className="text-center font-medium text-white dark:text-gray-900">
            {t("common.save")}
          </Text>
        </Pressable>

        {showCollabs && <CollaboratorsSection listId={listId} />}

        {isOwner && <ActivitySection listId={listId} />}

        <View className="mt-10 gap-3">
          <Pressable
            onPress={doClone}
            disabled={clone.isPending}
            className="rounded-xl border border-gray-200 px-6 py-3 active:opacity-80 dark:border-gray-700"
          >
            <Text className="text-center font-medium text-gray-900 dark:text-gray-100">
              {t("settings.cloneList")}
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            className="rounded-xl border border-gray-200 dark:border-gray-700 px-6 py-3 active:opacity-80"
          >
            <Text className="text-center font-semibold text-gray-900 dark:text-gray-100">
              {t("settings.deleteList")}
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

function ActivitySection({ listId }: { listId: string }) {
  const { t, i18n } = useTranslation();
  const activity = useListActivity(listId, true);

  if (activity.isLoading) {
    return (
      <View className="mt-10">
        <Text className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t("settings.activity")}
        </Text>
        <ActivityIndicator />
      </View>
    );
  }

  const rows = activity.data ?? [];

  return (
    <View className="mt-10">
      <Text className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("settings.activity")}
      </Text>
      {rows.length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t("settings.noActivity")}
        </Text>
      ) : (
        rows.slice(0, 30).map((a) => (
          <View
            key={a.id}
            className="mb-2 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
          >
            <Text className="text-sm text-gray-900 dark:text-gray-100">
              <Text className="font-medium">
                {a.userName ?? t("common.anonymous")}
              </Text>{" "}
              {t(`activity.${a.action}`)}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(a.createdAt, i18n.language)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function CollaboratorsSection({ listId }: { listId: string }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const collaborators = useCollaborators(listId, true);
  const search = useUserSearch(debouncedQ);
  const add = useAddCollaborator(listId);
  const remove = useRemoveCollaborator(listId);

  const existingIds = new Set(
    (collaborators.data?.collaborators ?? []).map((c) => c.id)
  );
  const results = (search.data ?? []).filter((u) => !existingIds.has(u.id));

  return (
    <View className="mt-10">
      <Text className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t("settings.collaborators")}
      </Text>

      {(collaborators.data?.collaborators ?? []).map((c) => (
        <View
          key={c.id}
          className="mb-2 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text
            numberOfLines={1}
            className="flex-1 text-sm text-gray-900 dark:text-gray-100"
          >
            {c.name ?? t("common.anonymous")}
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert(
                t("settings.removeCollabTitle"),
                t("settings.removeCollabBody", {
                  name: c.name ?? t("common.anonymous"),
                }),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("common.remove"),
                    style: "destructive",
                    onPress: () => remove.mutate(c.id),
                  },
                ]
              )
            }
            className="px-2"
          >
            <Text className="text-xs font-semibold text-gray-900 dark:text-gray-100">{t("common.remove")}</Text>
          </Pressable>
        </View>
      ))}

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("settings.searchUsers")}
        placeholderTextColor="#a0a09c"
        autoCapitalize="none"
        textAlignVertical="center"
        style={{ fontSize: 16, lineHeight: 20 }}
        className="mt-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      {results.map((u) => (
        <View
          key={u.id}
          className="mt-2 flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <View className="flex-1 pr-3">
            <Text
              numberOfLines={1}
              className="text-sm text-gray-900 dark:text-gray-100"
            >
              {u.name ?? t("common.anonymous")}
            </Text>
            {u.email && (
              <Text
                numberOfLines={1}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {u.email}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() =>
              add.mutate(u.id, {
                onSuccess: () => setQ(""),
                onError: (e) =>
                  Alert.alert("Could not add", String((e as Error).message)),
              })
            }
            disabled={add.isPending}
            className="rounded-xl bg-gray-900 px-3 py-1.5 active:opacity-80 disabled:opacity-40 dark:bg-gray-100"
          >
            <Text className="text-xs font-medium text-white dark:text-gray-900">
              {t("common.add")}
            </Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
