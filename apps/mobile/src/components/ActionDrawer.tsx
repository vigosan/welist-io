import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type DrawerAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  actions: DrawerAction[];
  onClose: () => void;
};

export function ActionDrawer({ visible, title, actions, onClose }: Props) {
  const { t } = useTranslation();
  useEffect(() => {
    if (visible) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="px-3 pb-2"
        >
          <View className="mb-2 items-center">
            <View className="h-1 w-10 rounded-full bg-white/60" />
          </View>
          <SafeAreaView edges={["bottom"]} className="">
            <View className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
              {title ? (
                <View className="border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.08]">
                  <Text className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                    {title}
                  </Text>
                </View>
              ) : null}
              {actions.map((action, idx) => (
                <Pressable
                  key={action.label}
                  onPress={() => {
                    onClose();
                    setTimeout(action.onPress, 100);
                  }}
                  className={`items-center justify-center px-5 py-4 active:bg-black/[0.04] dark:active:bg-white/[0.06] ${
                    idx !== actions.length - 1
                      ? "border-b border-black/[0.06] dark:border-white/[0.08]"
                      : ""
                  }`}
                >
                  <Text
                    className={`text-base ${
                      action.destructive
                        ? "font-semibold text-gray-900 dark:text-gray-100"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={onClose}
              className="mt-2 items-center justify-center rounded-2xl bg-white px-5 py-4 active:bg-black/[0.04] dark:bg-gray-900 dark:active:bg-white/[0.06]"
            >
              <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {t("common.cancel")}
              </Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
