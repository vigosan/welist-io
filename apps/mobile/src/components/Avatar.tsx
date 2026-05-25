import { Image, Text, View } from "react-native";

type Props = {
  name: string | null;
  image: string | null;
  size?: number;
};

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Avatar({ name, image, size = 40 }: Props) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center overflow-hidden bg-gray-200 dark:bg-gray-800"
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <Text
          style={{ fontSize: size * 0.36 }}
          className="font-semibold text-gray-700 dark:text-gray-200"
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
