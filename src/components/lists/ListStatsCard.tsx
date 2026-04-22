import { useTranslation } from "@/i18n/service";

type Challenger = {
  id: string;
  completedAt: string | null;
  doneCount: number;
  totalItems: number;
};

interface Props {
  challengers: Challenger[];
  itemCount: number;
}

export function ListStatsCard({ challengers, itemCount }: Props) {
  const { t } = useTranslation();

  if (challengers.length === 0) return null;

  const completedCount = challengers.filter((c) => c.completedAt).length;
  const completionRate =
    challengers.length > 0
      ? Math.round((completedCount / challengers.length) * 100)
      : 0;

  const avgProgress =
    challengers.length > 0 && itemCount > 0
      ? Math.round(
          (challengers.reduce(
            (sum, c) =>
              sum + (c.totalItems > 0 ? c.doneCount / c.totalItems : 0),
            0
          ) /
            challengers.length) *
            100
        )
      : 0;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t("stats.title")}
      </span>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {challengers.length}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("stats.challengers")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {completedCount}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("stats.completed")}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
            {completionRate}%
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("stats.completionRate")}
          </span>
        </div>
      </div>
      {itemCount > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("stats.avgProgress")}
          </span>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-300"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {avgProgress}%
          </span>
        </div>
      )}
    </div>
  );
}
