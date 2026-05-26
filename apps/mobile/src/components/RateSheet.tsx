import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";
import { StarRating } from "./StarRating";

type Props = {
  visible: boolean;
  value: number | null;
  onChange: (next: number) => void;
  onClose: () => void;
};

export function RateSheet({ visible, value, onChange, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 px-8"
      >
        <Pressable className="w-full rounded-2xl bg-white p-6 dark:bg-gray-900">
          <Text className="mb-5 text-base font-medium text-gray-900 dark:text-gray-100">
            {t("list.yourRating")}
          </Text>
          <View className="items-center">
            <StarRating
              value={value}
              onChange={(v) => {
                onChange(v);
                onClose();
              }}
            />
          </View>
          <Pressable onPress={onClose} className="mt-5 self-end px-3 py-2">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("common.cancel")}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
