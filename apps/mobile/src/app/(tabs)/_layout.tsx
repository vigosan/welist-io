import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";

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
      <Tabs.Screen name="index" options={{ title: t("nav.home") }} />
      <Tabs.Screen name="explore" options={{ title: t("nav.explore") }} />
      <Tabs.Screen name="feed" options={{ title: t("nav.feed") }} />
      <Tabs.Screen name="lists" options={{ title: t("nav.lists") }} />
      <Tabs.Screen name="profile" options={{ title: t("nav.profile") }} />
    </Tabs>
  );
}
