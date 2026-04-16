import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCachedSession } from "@/hooks/useCachedSession";
import { useTheme } from "@/hooks/useTheme";
import { setLanguage, useLanguage, useTranslation } from "@/i18n/service";
import { GlobalCommandPalette } from "./GlobalCommandPalette";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const SunIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export function AppNav() {
  const { data: session } = useCachedSession();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, toggle } = useTheme();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (session?.user) {
          e.preventDefault();
          setGlobalSearchOpen((o) => !o);
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [session?.user]);

  const navLinkClass = "cursor-pointer px-2.5 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-colors duration-150";
  const mobileLinkClass = "block px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150";

  function closeMobile() { setMobileOpen(false); }

  return (
    <>
      <GlobalCommandPalette open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <nav className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
        <div className="flex items-center justify-between px-6 h-13 max-w-3xl mx-auto w-full">
          <Link
            to="/"
            data-testid="nav-logo"
            className="cursor-pointer font-mono text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight hover:text-gray-400 dark:hover:text-gray-500 transition-colors duration-150"
          >
            welist
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1">
            <Link to="/explore" data-testid="nav-explore" className={navLinkClass}>{t("nav.explore")}</Link>
            {session?.user && (
              <>
                <span className="text-gray-300 dark:text-gray-700 text-xs select-none">·</span>
                <Link to="/lists" data-testid="nav-my-lists" className={navLinkClass}>{t("nav.myLists")}</Link>
              </>
            )}
            <span className="text-gray-300 dark:text-gray-700 text-xs select-none">·</span>
            <Link to="/help" data-testid="nav-help" className={navLinkClass}>{t("help.nav")}</Link>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-2" />
            <button
              type="button"
              onClick={toggle}
              data-testid="theme-toggle"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors duration-150"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              data-testid="lang-switcher"
              className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors duration-150 tabular-nums"
            >
              {language === "es" ? "EN" : "ES"}
            </button>
            {session?.user && <NotificationBell userId={session.user.id} />}
            <div className="ml-1.5"><UserMenu /></div>
          </div>

          {/* Mobile right side */}
          <div className="flex sm:hidden items-center gap-1.5">
            {session?.user && <NotificationBell userId={session.user.id} />}
            <UserMenu />
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              data-testid="nav-burger"
              aria-label="Toggle menu"
              className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-150"
            >
              {mobileOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="2" y1="2" x2="14" y2="14" /><line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
            <Link to="/explore" data-testid="nav-explore-mobile" className={mobileLinkClass} onClick={closeMobile}>{t("nav.explore")}</Link>
            {session?.user && (
              <Link to="/lists" data-testid="nav-my-lists-mobile" className={mobileLinkClass} onClick={closeMobile}>{t("nav.myLists")}</Link>
            )}
            <Link to="/help" data-testid="nav-help-mobile" className={mobileLinkClass} onClick={closeMobile}>{t("help.nav")}</Link>
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => { toggle(); closeMobile(); }}
                data-testid="theme-toggle-mobile"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="cursor-pointer p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors duration-150"
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                type="button"
                onClick={() => { setLanguage(language === "es" ? "en" : "es"); closeMobile(); }}
                data-testid="lang-switcher-mobile"
                className="cursor-pointer px-2 py-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded-md transition-colors duration-150 tabular-nums"
              >
                {language === "es" ? "EN" : "ES"}
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
