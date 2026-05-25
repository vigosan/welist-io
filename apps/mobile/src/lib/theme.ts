import * as SecureStore from "expo-secure-store";

const KEY = "wilist.theme";
const VALUES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof VALUES)[number];

function isValid(v: string | null): v is ThemePreference {
  return v !== null && (VALUES as readonly string[]).includes(v);
}

export async function loadStoredTheme(): Promise<ThemePreference> {
  const stored = await SecureStore.getItemAsync(KEY);
  return isValid(stored) ? stored : "system";
}

export async function setStoredTheme(value: ThemePreference): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}
