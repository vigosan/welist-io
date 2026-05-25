import { signIn, signOut } from "@hono/auth-js/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCachedSession } from "@/hooks/useCachedSession";
import { useTranslation } from "@/i18n/service";

export function UserMenu() {
  const { data: session, status } = useCachedSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  if (status === "loading") {
    return <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse" />;
  }

  if (session?.user) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          data-testid="user-avatar-btn"
          aria-label={t("user.menuAriaLabel")}
          aria-expanded={open}
          className="cursor-pointer w-7 h-7 rounded-full outline outline-1 outline-black/10 overflow-hidden"
        >
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-7 h-7 rounded-full"
            />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 min-w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl z-50 py-1">
            <Link
              to="/lists"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t("user.myLists")}
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="block w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t("user.settings")}
            </Link>
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              data-testid="sign-out-btn"
              className="cursor-pointer block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t("user.signOut")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("google")}
      data-testid="sign-in-btn"
      className="cursor-pointer h-7 flex items-center px-2.5 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-[border-color,color] duration-150 active:scale-[0.96]"
    >
      {t("user.signIn")}
    </button>
  );
}
