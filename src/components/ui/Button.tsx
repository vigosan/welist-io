import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-75";

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12.5px]",
  md: "px-4 py-2 text-[13.5px]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-ink text-paper hover:bg-black dark:bg-paper dark:text-ink dark:hover:bg-white",
  secondary:
    "border border-black/[0.08] bg-canvas text-ink hover:border-ink/30 dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:hover:border-paper/30",
  ghost:
    "text-muted hover:text-ink dark:hover:text-paper hover:bg-black/[0.04] dark:hover:bg-white/[0.04]",
  danger:
    "border border-black/[0.08] bg-canvas text-ink hover:border-ink hover:bg-ink hover:text-paper dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:hover:border-paper dark:hover:bg-paper dark:hover:text-canvas-dark",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={[base, sizes[size], variants[variant], className].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
