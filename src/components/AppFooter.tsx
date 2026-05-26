import { Link } from "@tanstack/react-router";
import { useTranslation } from "@/i18n/service";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="shrink-0 border-t border-black/[0.08] dark:border-white/[0.08]">
      <div className="flex items-center justify-between px-12 py-4">
        <span
          className="text-[11px]"
          style={{
            color: "#a0a09c",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {t("home.footer", { year: new Date().getFullYear() })}
        </span>
        <div className="flex gap-5">
          <Link
            to="/privacy"
            className="text-[11px] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition no-underline"
            style={{ color: "#a0a09c" }}
          >
            Privacidad
          </Link>
          <Link
            to="/terms"
            className="text-[11px] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition no-underline"
            style={{ color: "#a0a09c" }}
          >
            Términos
          </Link>
        </div>
      </div>
    </footer>
  );
}
