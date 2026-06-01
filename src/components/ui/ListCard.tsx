import type { ReactNode } from "react";
import { cardHover } from "./cardClass";

type Props = {
  eyebrow?: ReactNode;
  headerRight?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  body?: ReactNode;
  progress?: ReactNode;
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
  footerLeft,
  footerRight,
  className = "",
  "data-testid": testId,
}: Props) {
  return (
    <div
      data-testid={testId}
      className={`group relative rounded-2xl border border-black/[0.08] bg-canvas p-5 dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover} ${className}`}
    >
      {(eyebrow || headerRight) && (
        <div className="mb-2 flex items-center gap-3">
          {eyebrow}
          {headerRight && <div className="ml-auto">{headerRight}</div>}
        </div>
      )}
      <h3 className="mb-1.5 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink dark:text-paper">
        {title}
      </h3>
      {description && (
        <p className="mb-2.5 text-[12px] leading-[1.6] text-gray-500 dark:text-[#6b6b67]">
          {description}
        </p>
      )}
      {body}
      {progress && <div className="mt-2.5">{progress}</div>}
      {(footerLeft || footerRight) && (
        <div className="mt-3.5 flex items-center gap-3 border-t border-black/[0.05] pt-3 dark:border-white/[0.06]">
          <div className="min-w-0 flex-1">{footerLeft}</div>
          {footerRight}
        </div>
      )}
    </div>
  );
}
