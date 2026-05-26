import type { ReactNode } from "react";
import {
  Platform,
  Pressable,
  type PressableProps,
  View,
  type ViewProps,
} from "react-native";

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  android: {
    elevation: 2,
  },
  default: {},
});

const RIPPLE = { color: "rgba(0,0,0,0.06)", borderless: false } as const;

type CardProps = ViewProps & {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "", style, ...rest }: CardProps) {
  return (
    <View
      style={[SHADOW, style]}
      className={`rounded-2xl bg-white dark:bg-gray-900 ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

type PressableCardProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  className?: string;
};

export function PressableCard({
  children,
  className = "",
  style,
  ...rest
}: PressableCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        SHADOW,
        pressed && Platform.OS === "ios" ? { opacity: 0.85 } : null,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      android_ripple={RIPPLE}
      className={`overflow-hidden rounded-2xl bg-white dark:bg-gray-900 ${className}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
