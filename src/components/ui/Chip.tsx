import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Chip({ active = false, className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={[
        "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] transition-colors active:scale-[0.97]",
        active
          ? "border-ink bg-ink text-canvas dark:border-paper dark:bg-paper dark:text-canvas-dark"
          : "border-black/[0.08] bg-canvas text-muted hover:border-black/20 hover:text-ink dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-white/20 dark:hover:text-paper",
        className,
      ].join(" ")}
      {...rest}
    />
  );
}
