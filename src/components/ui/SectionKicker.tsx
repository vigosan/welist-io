import type { ReactNode } from "react";

export function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      <span
        aria-hidden="true"
        className="inline-block h-px w-7 bg-ink dark:bg-paper"
      />
      {children}
    </span>
  );
}

export function SectionHeading({
  children,
  size = "md",
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const fontSize =
    size === "lg"
      ? "clamp(32px, 4vw, 52px)"
      : size === "sm"
        ? "clamp(24px, 3vw, 36px)"
        : "clamp(28px, 3.5vw, 44px)";
  return (
    <h2
      className="font-bold text-ink dark:text-paper"
      style={{
        fontSize,
        letterSpacing: "-0.03em",
        lineHeight: 1.0,
      }}
    >
      {children}
    </h2>
  );
}
