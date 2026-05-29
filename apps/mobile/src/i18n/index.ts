import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { es } from "./es";

function detectDeviceLanguage(): "en" | "es" {
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

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

export default i18n;
