import { signIn } from "@hono/auth-js/react";
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
      <p className="flex-1 text-[12px] leading-[1.6] text-gray-500 dark:text-[#a0a09c]">
        {t("nudge.signInToSave")}
      </p>
      <button
        type="button"
        data-testid="signin-nudge-cta"
        onClick={() => signIn("google")}
        className="cursor-pointer shrink-0 px-3 py-1.5 text-[12px] font-semibold tracking-[0.04em] bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] rounded-lg transition active:scale-[0.96]"
      >
        {t("nudge.signIn")}
      </button>
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
