import { Star } from "lucide-react";
import { useState } from "react";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

type DisplayProps = {
  avg: number | null;
  count: number;
  size?: Size;
};

export function StarRatingDisplay({ avg, count, size = "sm" }: DisplayProps) {
  const sizeClass = SIZE_CLASS[size];
  const filled = avg != null && avg > 0;
  return (
    <span
      data-testid="rating-display"
      className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 tabular-nums"
    >
      <Star
        aria-hidden="true"
        className={`${sizeClass} ${filled ? "fill-gray-900 text-gray-900 dark:fill-gray-100 dark:text-gray-100" : "text-gray-300 dark:text-gray-600"}`}
      />
      {avg != null ? (
        <>
          <span data-testid="rating-avg">{avg.toFixed(1)}</span>
          <span className="text-gray-400 dark:text-gray-500">({count})</span>
        </>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">—</span>
      )}
    </span>
  );
}

type InteractiveProps = {
  value: number | null;
  onChange: (value: number) => void;
  onClear?: () => void;
  disabled?: boolean;
  size?: Size;
};

export function StarRatingInput({
  value,
  onChange,
  onClear,
  disabled,
  size = "md",
}: InteractiveProps) {
  const [hover, setHover] = useState<number | null>(null);
  const sizeClass = SIZE_CLASS[size];
  const active = hover ?? value ?? 0;

  return (
    <div
      data-testid="rating-input"
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= active;
        return (
          <button
            key={star}
            type="button"
            data-testid={`rating-star-${star}`}
            disabled={disabled}
            onClick={() => {
              if (value === star && onClear) onClear();
              else onChange(star);
            }}
            onMouseEnter={() => setHover(star)}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            className="rounded-md p-0.5 transition active:scale-[0.92] disabled:opacity-50"
          >
            <Star
              className={`${sizeClass} transition-colors ${
                isFilled
                  ? "fill-gray-900 text-gray-900 dark:fill-gray-100 dark:text-gray-100"
                  : "text-gray-300 dark:text-gray-600 hover:text-gray-500"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
