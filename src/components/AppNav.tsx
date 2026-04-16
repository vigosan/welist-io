import { Link } from "@tanstack/react-router";
import { useSession } from "@hono/auth-js/react";
import { UserMenu } from "./UserMenu";
import { useTranslation, useLanguage, setLanguage } from "@/i18n/service";

export function AppNav() {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <nav className="border-b border-gray-100 bg-white shrink-0">
      <div className="flex items-center justify-between px-6 h-13 max-w-3xl mx-auto w-full">
        <Link to="/" data-testid="nav-logo" className="cursor-pointer font-mono text-sm font-bold text-gray-900 tracking-tight hover:text-gray-400 transition-colors duration-150">
          welist
        </Link>
        <div className="flex items-center gap-1">
          <Link
            to="/explore"
            data-testid="nav-explore"
            className="cursor-pointer px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-colors duration-150"
          >
            {t("nav.explore")}
          </Link>
          {session?.user && (
            <>
              <span className="text-gray-300 text-xs select-none">·</span>
              <Link
                to="/lists"
                data-testid="nav-my-lists"
                className="cursor-pointer px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-colors duration-150"
              >
                {t("nav.myLists")}
              </Link>
            </>
          )}
          <span className="text-gray-300 text-xs select-none">·</span>
          <Link
            to="/help"
            data-testid="nav-help"
            className="cursor-pointer px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-lg transition-colors duration-150"
          >
            {t("help.nav")}
          </Link>
          <div className="w-px h-4 bg-gray-200 mx-2" />
          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            data-testid="lang-switcher"
            className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-900 rounded-md transition-colors duration-150 tabular-nums"
          >
            {language === "es" ? "EN" : "ES"}
          </button>
          <div className="ml-1.5">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
