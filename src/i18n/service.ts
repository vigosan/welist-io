import { useTranslation as useI18nextTranslation } from "react-i18next";
import i18next from "./index";

export function useTranslation() {
  const { t } = useI18nextTranslation();
  return { t };
}

export function useLanguage() {
  const { i18n } = useI18nextTranslation();
  return { language: i18n.language as "es" | "en" };
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options as never) as unknown as string;
}

export function setLanguage(lang: "es" | "en") {
  try { localStorage.setItem("lang", lang); } catch { /* noop */ }
  i18next.changeLanguage(lang);
}
