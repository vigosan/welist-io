import { Link } from "@tanstack/react-router";
import { useSession } from "@hono/auth-js/react";
import { UserMenu } from "./UserMenu";
import { useTranslation, useLanguage, setLanguage } from "@/i18n/service";

export function AppNav() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <nav className="border-b border-gray-100 shrink-0">
      <div className="flex items-center justify-between px-6 h-14 max-w-4xl mx-auto w-full">
        <Link to="/" data-testid="nav-logo" className="cursor-pointer font-mono text-base font-bold text-gray-900 tracking-tight hover:text-gray-500 transition-colors duration-150">
          welist
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            data-testid="nav-explore"
            className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:text-gray-900 rounded-lg transition-colors duration-150"
          >
            {t("nav.explore")}
          </Link>
          {session?.user && (
            <Link
              to="/lists"
              data-testid="nav-my-lists"
              className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:text-gray-900 rounded-lg transition-colors duration-150"
            >
              {t("nav.myLists")}
            </Link>
          )}
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            data-testid="lang-switcher"
            className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-900 rounded-md transition-colors duration-150 tabular-nums"
          >
            {language === "es" ? "EN" : "ES"}
          </button>
          <div className="ml-1">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
