import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type Props = {
  className?: string;
  style?: object;
};

export function Skeleton({ className = "", style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={`rounded-md bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}

export function MyListSkeleton() {
  return (
    <View
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-4 dark:bg-gray-900"
    >
      <Skeleton className="h-7 w-7 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </View>
    </View>
  );
}

export function ExploreCardSkeleton() {
  return (
    <View
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
      className="mb-3 gap-2 rounded-2xl bg-white p-4 dark:bg-gray-900"
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="mt-2 h-3 w-2/5" />
    </View>
  );
}

export function UserCardSkeleton() {
  return (
    <View
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
      className="mb-2 flex-row items-center gap-3 rounded-2xl bg-white p-4 dark:bg-gray-900"
    >
      <Skeleton className="h-10 w-10 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </View>
    </View>
  );
}
