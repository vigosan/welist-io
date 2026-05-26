import { useEffect, useRef } from "react";
import { Animated, Text } from "react-native";

type Props = {
  done: boolean;
};

export function AnimatedCheckbox({ done }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(done ? 1 : 0)).current;
  const prev = useRef(done);

  useEffect(() => {
    if (prev.current === done) return;
    prev.current = done;
    if (done) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.18,
          useNativeDriver: true,
          speed: 60,
          bounciness: 14,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 30,
          bounciness: 8,
        }),
      ]).start();
      Animated.spring(checkScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 16,
      }).start();
    } else {
      Animated.timing(checkScale, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [done, scale, checkScale]);

  return (
    <Animated.View
      style={{ transform: [{ scale }] }}
      className={`h-6 w-6 items-center justify-center rounded-full border-[1.5px] ${
        done
          ? "border-gray-900 bg-gray-900 dark:border-gray-100 dark:bg-gray-100"
          : "border-gray-300 dark:border-gray-600"
      }`}
    >
      <Animated.View style={{ transform: [{ scale: checkScale }] }}>
        <Text className="text-sm font-bold text-white dark:text-gray-900">
          ✓
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
