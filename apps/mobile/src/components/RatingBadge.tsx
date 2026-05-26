import { Pressable, Text, View } from "react-native";

type Props = {
  avg: number;
  count: number;
  mine: number | null;
  rateLabel?: string;
  onPress?: () => void;
};

export function RatingBadge({ avg, count, mine, rateLabel, onPress }: Props) {
  const hasRatings = count > 0;
  const starClass = mine
    ? "text-gray-900 dark:text-gray-100"
    : "text-gray-400 dark:text-gray-500";

  const inner = (
    <View className="flex-row items-center gap-1">
      <Text className={`text-xs ${starClass}`}>★</Text>
      {hasRatings ? (
        <Text className="font-mono text-xs text-gray-500 dark:text-gray-400">
          {avg.toFixed(1)} · {count}
        </Text>
      ) : rateLabel ? (
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {rateLabel}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return inner;
  return (
    <Pressable hitSlop={8} onPress={onPress} className="active:opacity-70">
      {inner}
    </Pressable>
  );
}
