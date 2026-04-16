import { useTranslation } from "@/i18n/service";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-100 shrink-0">
      <div className="max-w-3xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {t("home.footer", { year: new Date().getFullYear() })}
        </span>
      </div>
    </footer>
  );
}
