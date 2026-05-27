export const cardBase =
  "rounded-2xl border border-black/[0.08] bg-canvas dark:border-white/[0.08] dark:bg-canvas-dark";

export const cardHover =
  "transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-[0_18px_36px_-28px_rgba(0,0,0,0.3)] dark:hover:border-paper/30";

export const card = `${cardBase} ${cardHover}`;
