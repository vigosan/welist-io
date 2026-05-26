import { useColorScheme } from "nativewind";

export function useIsDark() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark";
}
