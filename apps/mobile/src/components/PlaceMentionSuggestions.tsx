import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useGeocodingSearch } from "@/hooks/geocoding";
import type { Place } from "@/services/geocoding";

type Props = {
  query: string;
  onSelect: (place: Place) => void;
};

export function PlaceMentionSuggestions({ query, onSelect }: Props) {
  const { t } = useTranslation();
  const trimmed = query.trim();
  const search = useGeocodingSearch(trimmed);
  if (trimmed.length < 2) return null;
  return (
    <View className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {search.isFetching && (search.data?.length ?? 0) === 0 ? (
        <View className="flex-row items-center gap-2 px-3 py-3">
          <ActivityIndicator size="small" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {t("list.searchPlace")}…
          </Text>
        </View>
      ) : !search.data || search.data.length === 0 ? (
        <Text className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">
          {t("list.noPlacesFound")}
        </Text>
      ) : (
        search.data.map((place, idx) => (
          <Pressable
            key={`${place.latitude},${place.longitude},${place.name}`}
            onPress={() => onSelect(place)}
            className={`px-3 py-2 active:bg-gray-50 dark:active:bg-gray-800 ${
              idx > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""
            }`}
          >
            <Text
              numberOfLines={1}
              className="text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {place.name}
            </Text>
            {(place.city || place.country) && (
              <Text
                numberOfLines={1}
                className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
              >
                {[place.city, place.country].filter(Boolean).join(", ")}
              </Text>
            )}
          </Pressable>
        ))
      )}
    </View>
  );
}
