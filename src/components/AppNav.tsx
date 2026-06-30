import { signOut } from "@hono/auth-js/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCachedSession } from "@/hooks/useCachedSession";
import { useTheme } from "@/hooks/useTheme";
import { setLanguage, useLanguage, useTranslation } from "@/i18n/service";
import { GlobalCommandPalette } from "./GlobalCommandPalette";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

const SunIcon = () => (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg
    aria-hidden="true"
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SearchIcon = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const LogoMark = () => (
  <span
    aria-hidden="true"
    className="inline-grid h-[18px] w-[18px] place-items-center rounded-[5px] bg-ink dark:bg-paper"
  >
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-canvas dark:text-canvas-dark"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
);

function NavLink({
  to,
  label,
  testId,
}: {
  to: string;
  label: string;
  testId?: string;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <Link
      to={to}
      data-testid={testId}
      aria-current={isActive ? "page" : undefined}
      className={[
        "cursor-pointer text-[13px] transition-colors duration-150",
        "no-underline tracking-[0.01em] pb-[2px] border-b",
        isActive
          ? "text-ink dark:text-paper font-semibold border-current"
          : "text-gray-500 dark:text-muted font-normal border-transparent hover:text-ink dark:hover:text-paper",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const { data: session } = useCachedSession();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { theme, toggle } = useTheme();
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMounted, setMobileMounted] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      setMobileMounted(true);
      const id = requestAnimationFrame(() => setMobileVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setMobileVisible(false);
    const id = setTimeout(() => setMobileMounted(false), 100);
    return () => clearTimeout(id);
  }, [mobileOpen]);

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

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <GlobalCommandPalette
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
      />
      {/* Mobile backdrop */}
      {mobileMounted && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="nav-mobile-backdrop"
          onClick={closeMobile}
          className={[
            "sm:hidden fixed inset-x-0 top-[52px] bottom-0 z-40",
            "bg-canvas/40 dark:bg-canvas-dark/40 backdrop-blur-sm",
            "transition-opacity duration-100",
            mobileVisible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      )}
      <nav className="shrink-0 sticky top-0 z-50 h-[52px] bg-canvas/80 dark:bg-canvas-dark/80 backdrop-blur-md backdrop-saturate-150 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center justify-between px-4 sm:px-12 h-full gap-4">
          <Link
            to="/"
            data-testid="nav-logo"
            className="cursor-pointer flex items-center gap-2 text-[15px] font-bold text-ink dark:text-paper hover:opacity-70 transition-opacity duration-150 no-underline tracking-[-0.01em]"
          >
            <LogoMark />
            welist
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-7">
            {session?.user && (
              <NavLink
                to="/lists"
                label={t("nav.myLists")}
                testId="nav-my-lists"
              />
            )}
            {session?.user && (
              <NavLink to="/feed" label={t("feed.nav")} testId="nav-feed" />
            )}
            <NavLink
              to="/explore"
              label={t("nav.explore")}
              testId="nav-explore"
            />
            <NavLink
              to="/users"
              label={t("directory.nav")}
              testId="nav-users"
            />
            <NavLink
              to="/collections"
              label={t("collections.nav")}
              testId="nav-collections"
            />
            <NavLink to="/help" label={t("help.nav")} testId="nav-help" />

            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08]" />

            {session?.user && (
              <button
                type="button"
                onClick={() => setGlobalSearchOpen(true)}
                data-testid="nav-search"
                aria-label={t("nav.openSearch")}
                className="cursor-pointer hidden lg:inline-flex items-center gap-2 rounded-md border border-black/[0.08] bg-canvas px-2.5 py-1 text-[11px] text-muted hover:border-black/20 hover:text-ink transition-colors duration-150 dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-white/20 dark:hover:text-paper"
              >
                <SearchIcon />
                {t("nav.search")}
                <kbd className="font-mono text-[10px] text-muted/80 border border-black/[0.08] rounded px-1 py-px dark:border-white/[0.08]">
                  ⌘K
                </kbd>
              </button>
            )}

            <button
              type="button"
              onClick={toggle}
              data-testid="theme-toggle"
              aria-label={
                theme === "dark"
                  ? t("nav.switchToLight")
                  : t("nav.switchToDark")
              }
              className="cursor-pointer text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              data-testid="lang-switcher"
              aria-label={t("nav.switchLanguage")}
              className="cursor-pointer text-[11px] font-medium font-mono text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150 tabular-nums"
            >
              {language === "es" ? "EN" : "ES"}
            </button>

            {session?.user ? (
              <>
                <NotificationBell userId={session.user.id} />
                <div className="ml-0.5">
                  <UserMenu />
                </div>
              </>
            ) : (
              <Link
                to="/login"
                data-testid="sign-in-btn"
                className="cursor-pointer text-[12px] font-medium px-3.5 py-[5px] rounded-md border border-black/20 dark:border-white/[0.18] text-ink dark:text-paper bg-transparent hover:bg-ink dark:hover:bg-paper hover:text-canvas dark:hover:text-ink hover:border-transparent transition-[background-color,border-color,color] duration-150"
              >
                {t("user.signIn")}
              </Link>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              data-testid="nav-burger"
              aria-label={t("nav.toggleMenu")}
              className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-md text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150"
            >
              {mobileOpen ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="2" y1="2" x2="14" y2="14" />
                  <line x1="14" y1="2" x2="2" y2="14" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="2" y1="4" x2="14" y2="4" />
                  <line x1="2" y1="8" x2="14" y2="8" />
                  <line x1="2" y1="12" x2="14" y2="12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMounted && (
          <div
            className={[
              "sm:hidden absolute top-[52px] left-0 right-0 z-50",
              "bg-canvas dark:bg-canvas-dark border-t border-black/[0.08] dark:border-white/[0.08]",
              "transition duration-100 ease-out",
              mobileVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-2",
            ].join(" ")}
          >
            {/* User identity row */}
            {session?.user && (
              <div className="px-6 py-3 flex items-center gap-3">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ""}
                    className="w-7 h-7 rounded-full outline outline-1 outline-black/10 dark:outline-white/10 shrink-0"
                  />
                )}
                <span className="text-sm font-medium text-ink dark:text-paper truncate">
                  {session.user.name}
                </span>
                <div className="ml-auto">
                  <NotificationBell userId={session.user.id} />
                </div>
              </div>
            )}

            {/* Primary navigation */}
            <div className="border-t border-black/[0.08] dark:border-white/[0.08] py-1">
              {session?.user && (
                <Link
                  to="/lists"
                  data-testid="nav-my-lists-mobile"
                  className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                  onClick={closeMobile}
                >
                  {t("nav.myLists")}
                </Link>
              )}
              {session?.user && (
                <Link
                  to="/feed"
                  data-testid="nav-feed-mobile"
                  className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                  onClick={closeMobile}
                >
                  {t("feed.nav")}
                </Link>
              )}
              <Link
                to="/explore"
                data-testid="nav-explore-mobile"
                className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                onClick={closeMobile}
              >
                {t("nav.explore")}
              </Link>
              <Link
                to="/users"
                data-testid="nav-users-mobile"
                className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                onClick={closeMobile}
              >
                {t("directory.nav")}
              </Link>
              <Link
                to="/collections"
                data-testid="nav-collections-mobile"
                className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                onClick={closeMobile}
              >
                {t("collections.nav")}
              </Link>
            </div>

            {/* Account / support */}
            {session?.user ? (
              <div className="border-t border-black/[0.08] dark:border-white/[0.08] py-1">
                <Link
                  to="/help"
                  data-testid="nav-help-mobile"
                  className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                  onClick={closeMobile}
                >
                  {t("help.nav")}
                </Link>
                <Link
                  to="/settings"
                  className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                  onClick={closeMobile}
                >
                  {t("user.settings")}
                </Link>
              </div>
            ) : (
              <div className="border-t border-black/[0.08] dark:border-white/[0.08] py-1">
                <Link
                  to="/help"
                  data-testid="nav-help-mobile"
                  className="block px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                  onClick={closeMobile}
                >
                  {t("help.nav")}
                </Link>
              </div>
            )}

            {/* Sign in / out */}
            <div className="border-t border-black/[0.08] dark:border-white/[0.08] py-1">
              {session?.user ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    signOut();
                  }}
                  data-testid="sign-out-btn-mobile"
                  className="cursor-pointer block w-full text-left px-6 py-3 text-sm font-medium text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150"
                >
                  {t("user.signOut")}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="cursor-pointer block w-full text-left px-6 py-3 text-sm font-medium text-ink dark:text-paper hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150"
                >
                  {t("user.signIn")}
                </Link>
              )}
            </div>

            {/* Footer: preferences */}
            <div className="border-t border-black/[0.08] dark:border-white/[0.08] px-6 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  toggle();
                  closeMobile();
                }}
                data-testid="theme-toggle-mobile"
                aria-label={
                  theme === "dark"
                    ? t("nav.switchToLight")
                    : t("nav.switchToDark")
                }
                className="cursor-pointer p-1.5 text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150"
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage(language === "es" ? "en" : "es");
                  closeMobile();
                }}
                data-testid="lang-switcher-mobile"
                aria-label={t("nav.switchLanguage")}
                className="cursor-pointer text-[11px] font-medium font-mono text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150 tabular-nums"
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
