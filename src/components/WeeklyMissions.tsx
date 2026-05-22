import { memo } from "react";
import { useTranslation } from "@/i18n/service";
import type { MissionType } from "@/lib/missions";

interface Mission {
  type: MissionType;
  progress: number;
  target: number;
}

interface Props {
  missions: Mission[];
}

export const WeeklyMissions = memo(function WeeklyMissions({
  missions,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="weekly-missions"
      className="rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-5 dark:border-paper/[0.08] dark:bg-paper/[0.03]"
    >
      <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
        {t("missions.title")}
      </p>
      <ul className="flex flex-col gap-3">
        {missions.map((m) => {
          const completed = m.progress >= m.target;
          const display = Math.min(m.progress, m.target);
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          return (
            <li
              key={m.type}
              data-testid={`mission-${m.type}`}
              data-completed={completed ? "true" : "false"}
              className="flex flex-col gap-1.5"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-sm font-medium ${completed ? "text-ink/50 line-through dark:text-paper/50" : "text-ink dark:text-paper"}`}
                >
                  {t(`missions.${m.type}.title`)}
                </span>
                <span className="text-xs tabular-nums text-ink/50 dark:text-paper/50">
                  {display} / {m.target}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.06] dark:bg-paper/[0.08]">
                <div
                  className={`h-full transition-all duration-300 ${completed ? "bg-ink dark:bg-paper" : "bg-ink/60 dark:bg-paper/60"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
