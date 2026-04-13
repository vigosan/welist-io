import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es";
import en from "./locales/en";

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem("lang");
    if (stored === "es" || stored === "en") return stored;
    const browser = navigator.language.split("-")[0];
    return browser === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

i18next.use(initReactI18next).init({
  lng: detectLanguage(),
  fallbackLng: "es",
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
  initAsync: false,
});

export default i18next;

export function setLanguage(lang: "es" | "en") {
  try { localStorage.setItem("lang", lang); } catch { /* noop */ }
  i18next.changeLanguage(lang);
}
