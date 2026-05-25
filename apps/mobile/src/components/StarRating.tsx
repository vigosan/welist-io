import { Pressable, Text, View } from "react-native";

type Props = {
  value: number | null;
  avg?: number | null;
  count?: number;
  onChange?: (next: number) => void;
  disabled?: boolean;
};

export function StarRating({ value, avg, count, onChange, disabled }: Props) {
  const display = value ?? Math.round(avg ?? 0);
  const interactive = !!onChange && !disabled;

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= display;
          const star = (
            <Text
              key={i}
              className={`text-2xl ${
                filled
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            >
              {filled ? "★" : "☆"}
            </Text>
          );
          if (!interactive) return star;
          return (
            <Pressable
              key={i}
              onPress={() => onChange?.(i === value ? 0 : i)}
              hitSlop={6}
              className="px-0.5 active:opacity-80"
            >
              {star}
            </Pressable>
          );
        })}
      </View>
      {avg !== undefined && (count ?? 0) > 0 && (
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {avg?.toFixed(1)} ({count})
        </Text>
      )}
    </View>
  );
}
