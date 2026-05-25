import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useGeocodingSearch } from "@/hooks/geocoding";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Place } from "@/services/geocoding";

type Props = {
  visible: boolean;
  currentPlaceName: string | null;
  onClose: () => void;
  onSelect: (place: Place) => void;
  onRemove?: () => void;
};

export function LocationPickerModal({
  visible,
  currentPlaceName,
  onClose,
  onSelect,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const debounced = useDebouncedValue(q, 300);
  const search = useGeocodingSearch(debounced);

  const close = () => {
    setQ("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={close}
    >
      <View className="flex-1 bg-canvas dark:bg-canvas-dark">
        <View className="flex-row items-center justify-between border-b border-gray-200 px-6 pt-16 pb-3 dark:border-gray-700">
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {currentPlaceName ? t("list.changeLocation") : t("list.setLocation")}
          </Text>
          <Pressable onPress={close}>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.cancel")}
            </Text>
          </Pressable>
        </View>

        <TextInput
          value={q}
          onChangeText={setQ}
          autoFocus
          placeholder={t("list.searchPlace")}
          placeholderTextColor="#a0a09c"
          className="mx-6 mt-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />

        <FlatList
          data={search.data ?? []}
          keyExtractor={(p) => `${p.latitude},${p.longitude},${p.name}`}
          contentContainerClassName="px-6 pt-3 pb-10"
          ListEmptyComponent={
            search.isFetching ? (
              <ActivityIndicator className="mt-10" />
            ) : q.trim().length < 2 ? null : (
              <Text className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {t("list.noPlacesFound")}
              </Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                close();
              }}
              className="mb-2 rounded-2xl border border-gray-200 bg-white p-3 active:opacity-80 dark:border-gray-700 dark:bg-gray-900"
            >
              <Text
                numberOfLines={1}
                className="text-base text-gray-900 dark:text-gray-100"
              >
                {item.name}
              </Text>
              <Text
                numberOfLines={1}
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                {[item.city, item.country].filter(Boolean).join(", ")}
              </Text>
            </Pressable>
          )}
        />

        {onRemove && (
          <Pressable
            onPress={() => {
              onRemove();
              close();
            }}
            className="mx-6 mb-10 rounded-xl border border-red-200 px-6 py-3 active:opacity-80"
          >
            <Text className="text-center text-sm font-medium text-red-600">
              {t("list.removeLocation")}
            </Text>
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
