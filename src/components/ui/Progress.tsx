type Props = {
  value: number;
  className?: string;
  "data-testid"?: string;
  barTestId?: string;
};

export function Progress({
  value,
  className = "",
  "data-testid": testId,
  barTestId,
}: Props) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      data-testid={testId}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={[
        "relative h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]",
        className,
      ].join(" ")}
    >
      <div
        data-testid={barTestId}
        className="absolute inset-y-0 left-0 bg-ink transition-[width] duration-700 dark:bg-paper"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
