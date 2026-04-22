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
      className={[
        "cursor-pointer text-[13px] transition-colors duration-150",
        "no-underline",
        isActive
          ? "text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
          : "text-gray-500 dark:text-[#a0a09c] font-normal hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]",
      ].join(" ")}
      style={{
        letterSpacing: "0.01em",
        borderBottom: isActive
          ? "1px solid currentColor"
          : "1px solid transparent",
        paddingBottom: 2,
      }}
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
  const [loginHov, setLoginHov] = useState(false);

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
      <nav
        className="shrink-0 sticky top-0 z-50 bg-[#f8f7f5] dark:bg-[#0c0c0b] border-b border-black/[0.08] dark:border-white/[0.08]"
        style={{ height: 52 }}
      >
        <div className="flex items-center justify-between px-4 sm:px-12 h-full">
          <Link
            to="/"
            data-testid="nav-logo"
            className="cursor-pointer text-[15px] font-bold text-[#0c0c0b] dark:text-[#f0ede8] hover:opacity-70 transition-opacity duration-150 no-underline"
            style={{ letterSpacing: "-0.01em" }}
          >
            welist
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-7">
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
            {session?.user && (
              <NavLink
                to="/lists"
                label={t("nav.myLists")}
                testId="nav-my-lists"
              />
            )}
            <NavLink to="/help" label={t("help.nav")} testId="nav-help" />

            <div className="w-px h-3.5 bg-black/[0.08] dark:bg-white/[0.08]" />

            <button
              type="button"
              onClick={toggle}
              data-testid="theme-toggle"
              aria-label={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className="cursor-pointer text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => setLanguage(language === "es" ? "en" : "es")}
              data-testid="lang-switcher"
              className="cursor-pointer text-[11px] font-medium text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150 tabular-nums"
              style={{ fontFamily: "'Space Mono', monospace" }}
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
              <button
                type="button"
                onMouseEnter={() => setLoginHov(true)}
                onMouseLeave={() => setLoginHov(false)}
                className="cursor-pointer text-[12px] font-medium transition-all duration-150"
                style={{
                  padding: "5px 14px",
                  borderRadius: 6,
                  border: loginHov
                    ? "none"
                    : `1px solid ${theme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.20)"}`,
                  background: loginHov
                    ? theme === "dark"
                      ? "#f0ede8"
                      : "#0c0c0b"
                    : "transparent",
                  color: loginHov
                    ? theme === "dark"
                      ? "#0c0c0b"
                      : "#f8f7f5"
                    : theme === "dark"
                      ? "#f0ede8"
                      : "#0c0c0b",
                  fontWeight: 500,
                }}
              >
                {t("user.signIn")}
              </button>
            )}
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
              className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-md text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150"
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
        {mobileOpen && (
          <div className="sm:hidden absolute top-[52px] left-0 right-0 z-50 bg-[#f8f7f5] dark:bg-[#0c0c0b] border-t border-black/[0.08] dark:border-white/[0.08]">
            <Link
              to="/explore"
              data-testid="nav-explore-mobile"
              className="block px-6 py-3 text-sm font-medium text-[#0c0c0b] dark:text-[#f0ede8] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
              onClick={closeMobile}
            >
              {t("nav.explore")}
            </Link>
            <Link
              to="/users"
              data-testid="nav-users-mobile"
              className="block px-6 py-3 text-sm font-medium text-[#0c0c0b] dark:text-[#f0ede8] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
              onClick={closeMobile}
            >
              {t("directory.nav")}
            </Link>
            {session?.user && (
              <Link
                to="/lists"
                data-testid="nav-my-lists-mobile"
                className="block px-6 py-3 text-sm font-medium text-[#0c0c0b] dark:text-[#f0ede8] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
                onClick={closeMobile}
              >
                {t("nav.myLists")}
              </Link>
            )}
            <Link
              to="/help"
              data-testid="nav-help-mobile"
              className="block px-6 py-3 text-sm font-medium text-[#0c0c0b] dark:text-[#f0ede8] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors duration-150 no-underline"
              onClick={closeMobile}
            >
              {t("help.nav")}
            </Link>
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
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                className="cursor-pointer p-1.5 text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150"
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
                className="cursor-pointer text-[11px] font-medium text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150 tabular-nums"
                style={{ fontFamily: "'Space Mono', monospace" }}
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
