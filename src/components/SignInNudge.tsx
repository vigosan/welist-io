import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "@/i18n/service";

export function SignInNudge({ storageKey }: { storageKey: string }) {
  const { t } = useTranslation();
  const key = `signin-nudge-dismissed:${storageKey}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* noop */
    }
    setDismissed(true);
  }

  return (
    <div
      data-testid="signin-nudge"
      className="mb-5 flex items-center gap-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3"
    >
      <p className="flex-1 text-[12px] leading-[1.6] text-gray-500 dark:text-muted">
        {t("nudge.signInToSave")}
      </p>
      <Link
        to="/login"
        data-testid="signin-nudge-cta"
        className="cursor-pointer shrink-0 px-3 py-1.5 text-[12px] font-semibold tracking-[0.04em] bg-ink text-canvas dark:bg-paper dark:text-ink rounded-lg transition active:scale-[0.96]"
      >
        {t("nudge.signIn")}
      </Link>
      <button
        type="button"
        data-testid="signin-nudge-dismiss"
        aria-label={t("nudge.dismiss")}
        onClick={dismiss}
        className="cursor-pointer shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 transition active:scale-[0.96]"
      >
        ✕
      </button>
    </div>
  );
}
