import { getLocales } from "expo-localization";
import * as SecureStore from "expo-secure-store";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { es } from "./es";

const LANG_KEY = "wilist.lang";
const SUPPORTED = ["en", "es"] as const;
export type SupportedLanguage = (typeof SUPPORTED)[number];

function detectDeviceLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === "es" ? "es" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectDeviceLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export async function loadStoredLanguage(): Promise<void> {
  const stored = await SecureStore.getItemAsync(LANG_KEY);
  if (
    stored &&
    (SUPPORTED as readonly string[]).includes(stored) &&
    stored !== i18n.language
  ) {
    await i18n.changeLanguage(stored);
  }
}

export async function setLanguage(lng: SupportedLanguage): Promise<void> {
  await SecureStore.setItemAsync(LANG_KEY, lng);
  await i18n.changeLanguage(lng);
}

export function currentLanguage(): SupportedLanguage {
  const lang = i18n.language as SupportedLanguage;
  return (SUPPORTED as readonly string[]).includes(lang) ? lang : "en";
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

export default i18n;
