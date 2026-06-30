import type { ReactNode } from "react";
import { cardHover } from "./cardClass";

type Props = {
  eyebrow?: ReactNode;
  headerRight?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  body?: ReactNode;
  progress?: ReactNode;
  /** Large mono numeral rendered as the card's data anchor (e.g. "73"). */
  stat?: ReactNode;
  /** Small caption under the stat (e.g. "% hecho"). */
  statLabel?: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  className?: string;
  "data-testid"?: string;
};

export function ListCard({
  eyebrow,
  headerRight,
  title,
  description,
  body,
  progress,
  stat,
  statLabel,
  footerLeft,
  footerRight,
  className = "",
  "data-testid": testId,
}: Props) {
  return (
    <div
      data-testid={testId}
      className={`group relative rounded-2xl border border-black/[0.08] bg-canvas p-6 dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover} ${className}`}
    >
      {(eyebrow || headerRight) && (
        <div className="mb-3 flex items-center gap-3">
          {eyebrow}
          {headerRight && <div className="ml-auto">{headerRight}</div>}
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="mb-1.5 text-[17px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink dark:text-paper [text-wrap:balance]">
            {title}
          </h3>
          {description && (
            <p className="text-[13px] leading-[1.6] text-gray-500 dark:text-[#6b6b67] [text-wrap:pretty]">
              {description}
            </p>
          )}
        </div>
        {stat != null && (
          <div className="shrink-0 text-right leading-none">
            <div className="font-mono text-[34px] font-medium tabular-nums tracking-[-0.04em] text-ink dark:text-paper">
              {stat}
            </div>
            {statLabel && (
              <div className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted">
                {statLabel}
              </div>
            )}
          </div>
        )}
      </div>
      {body && <div className="mt-3">{body}</div>}
      {progress && <div className="mt-4">{progress}</div>}
      {(footerLeft || footerRight) && (
        <div className="mt-4 flex items-center gap-3 border-t border-black/[0.06] pt-3.5 dark:border-white/[0.06]">
          <div className="min-w-0 flex-1">{footerLeft}</div>
          {footerRight}
        </div>
      )}
    </div>
  );
}
