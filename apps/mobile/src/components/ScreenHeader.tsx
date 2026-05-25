import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  back?: boolean;
  right?: ReactNode;
};

export function ScreenHeader({ title, back = false, right }: Props) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return (
    <View className="px-5 pt-2 pb-3">
      {back && (
        <View className="mb-1 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="-ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-black/[0.05] dark:active:bg-white/[0.06]"
          >
            <ChevronLeft color={dark ? "#f0ede8" : "#0c0c0b"} size={26} />
          </Pressable>
          {right ? <View>{right}</View> : null}
        </View>
      )}
      <View className="flex-row items-center justify-between">
        <Text
          numberOfLines={1}
          className="flex-1 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
        >
          {title}
        </Text>
        {!back && right ? <View className="ml-3">{right}</View> : null}
      </View>
    </View>
  );
}
