export const cardBase =
  "rounded-2xl border border-black/[0.08] bg-canvas dark:border-white/[0.08] dark:bg-canvas-dark";

export const cardHover =
  "transition-colors duration-200 hover:border-ink/30 dark:hover:border-paper/30";

// Editorial lift: a real, GPU-cheap elevation on hover (translate + layered
// shadow) instead of the near-invisible border-color shift. Monochrome.
export const cardLift =
  "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.2,0.7,0.25,1)] [transform:translateZ(0)] hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_1px_2px_-1px_rgba(0,0,0,0.08),0_12px_28px_-12px_rgba(0,0,0,0.18)] dark:hover:border-paper/20 dark:hover:shadow-[0_1px_2px_-1px_rgba(0,0,0,0.5),0_12px_28px_-12px_rgba(0,0,0,0.6)]";

export const card = `${cardBase} ${cardHover}`;
