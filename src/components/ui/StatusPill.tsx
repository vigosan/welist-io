import type { ReactNode } from "react";

export function StatusPill({
  children,
  pulse = false,
}: {
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-canvas px-2 py-0.5 text-[11px] text-muted dark:border-white/[0.08] dark:bg-canvas-dark">
      {pulse ? (
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inset-0 animate-ping rounded-full bg-ink/40 dark:bg-paper/40" />
          <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-ink dark:bg-paper" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-ink dark:bg-paper"
        />
      )}
      {children}
    </span>
  );
}
