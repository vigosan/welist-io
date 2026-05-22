import { memo, useMemo } from "react";
import { useTranslation } from "@/i18n/service";

interface Day {
  date: string;
  count: number;
}

interface Props {
  days: Day[];
  today?: Date;
}

interface Cell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const LEVEL_CLASS: Record<Cell["level"], string> = {
  0: "bg-gray-100 dark:bg-gray-800",
  1: "bg-gray-300 dark:bg-gray-600",
  2: "bg-gray-500 dark:bg-gray-400",
  3: "bg-gray-700 dark:bg-gray-300",
  4: "bg-gray-900 dark:bg-gray-100",
};

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bucket(count: number): Cell["level"] {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

function buildWeeks(days: Day[], today: Date): Cell[][] {
  const counts = new Map(days.map((d) => [d.date, d.count]));
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - 364);
  const startWeekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startWeekday);
  const endWeekday = (end.getDay() + 6) % 7;
  const endPadded = new Date(end);
  endPadded.setDate(end.getDate() + (6 - endWeekday));

  const weeks: Cell[][] = [];
  let current: Cell[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= endPadded.getTime()) {
    const iso = toIsoDate(cursor);
    const count = counts.get(iso) ?? 0;
    current.push({ date: iso, count, level: bucket(count) });
    if (current.length === 7) {
      weeks.push(current);
      current = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return weeks;
}

export const ActivityHeatmap = memo(function ActivityHeatmap({
  days,
  today,
}: Props) {
  const { t } = useTranslation();
  const weeks = useMemo(
    () => buildWeeks(days, today ?? new Date()),
    [days, today]
  );
  return (
    <div
      data-testid="heatmap-grid"
      className="flex gap-[3px] overflow-x-auto py-1"
    >
      {weeks.map((week, wi) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: week index is positional and stable
          key={`w-${wi}`}
          data-testid={`heatmap-week-${wi}`}
          className="flex flex-col gap-[3px]"
        >
          {week.map((cell) => (
            <div
              key={cell.date}
              data-testid={`heatmap-cell-${cell.date}`}
              data-count={cell.count}
              data-level={cell.level}
              title={t("profile.activityCell", {
                date: cell.date,
                count: cell.count,
              })}
              className={`w-[11px] h-[11px] rounded-[2px] ${LEVEL_CLASS[cell.level]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
});
