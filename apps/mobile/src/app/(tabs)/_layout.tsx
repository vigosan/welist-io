import { Tabs } from "expo-router";
import {
  Compass,
  HelpCircle,
  List as ListIcon,
  Users,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0c0c0b",
        tabBarInactiveTintColor: "#a0a09c",
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
        name="help"
        options={{
          title: t("nav.help"),
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              Icon={HelpCircle as unknown as ComponentType<IconProps>}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
