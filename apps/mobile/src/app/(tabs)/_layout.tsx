import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import {
  Compass,
  List as ListIcon,
  Settings,
  Users,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, View } from "react-native";

type IconProps = { color: string; size: number };
const TabIcon = ({
  Icon,
  color,
  size,
}: IconProps & { Icon: ComponentType<IconProps> }) => (
  <Icon color={color} size={size} />
);

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === "dark";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? "#f0ede8" : "#0c0c0b",
        tabBarInactiveTintColor: dark ? "#7a766c" : "#a8a39a",
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={Platform.OS === "ios" ? 80 : 100}
              tint={dark ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: StyleSheet.hairlineWidth,
                backgroundColor: dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.08)",
              }}
            />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="lists"
        options={{
          title: t("nav.lists"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              Icon={ListIcon as unknown as ComponentType<IconProps>}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("nav.explore"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              Icon={Compass as unknown as ComponentType<IconProps>}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t("nav.community"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              Icon={Users as unknown as ComponentType<IconProps>}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("nav.settings"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              Icon={Settings as unknown as ComponentType<IconProps>}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
