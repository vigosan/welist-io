import { useColorScheme } from "nativewind";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

function useIconColors() {
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return {
    stroke: dark ? "#3a3a36" : "#d6d2c5",
    accent: dark ? "#f0ede8" : "#0c0c0b",
  };
}

export function EmptyStateListIcon() {
  const { stroke, accent } = useIconColors();
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle
        cx={44}
        cy={44}
        r={42}
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
      <Line
        x1={28}
        y1={32}
        x2={60}
        y2={32}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M24 44 l4 4 l8 -8"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Line
        x1={42}
        y1={44}
        x2={60}
        y2={44}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={28}
        y1={56}
        x2={60}
        y2={56}
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EmptyStateCompassIcon() {
  const { stroke, accent } = useIconColors();
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle
        cx={44}
        cy={44}
        r={42}
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
      <Path
        d="M44 26 L52 44 L44 62 L36 44 Z"
        stroke={accent}
        strokeWidth={2}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function EmptyStateUsersIcon() {
  const { stroke, accent } = useIconColors();
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88">
      <Circle
        cx={44}
        cy={44}
        r={42}
        stroke={stroke}
        strokeWidth={1.5}
        fill="none"
      />
      <Circle
        cx={38}
        cy={38}
        r={6}
        stroke={accent}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M28 60 a10 10 0 0 1 20 0"
        stroke={accent}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx={54}
        cy={36}
        r={5}
        stroke={stroke}
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M48 56 a8 8 0 0 1 16 0"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

type Props = {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <View className="items-center justify-center px-8 py-16">
      {icon ? <View className="mb-6">{icon}</View> : null}
      <Text className="mb-1 text-center text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {subtitle}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
