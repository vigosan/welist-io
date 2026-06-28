import { useState } from "react";
import { Progress } from "@/components/ui";
import { useDuel } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

type Opponent = { id: string; name: string | null; image: string | null };

function pct(done: number, total: number) {
  return total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

export function DuelPanel({
  listId,
  opponents,
}: {
  listId: string;
  opponents: Opponent[];
}) {
  const { t } = useTranslation();
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const { data, isLoading } = useDuel(listId, opponentId, true);

  if (opponents.length === 0) return null;

  return (
    <div
      data-testid="duel-panel"
      className="rounded-2xl border border-black/[0.08] bg-canvas p-4 dark:border-white/[0.08] dark:bg-canvas-dark"
    >
      <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
        {t("duel.title")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opponents.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOpponentId(o.id)}
            data-testid={`duel-opponent-${o.id}`}
            className={[
              "cursor-pointer rounded-full border px-3 py-1 text-[13px] transition-colors active:scale-[0.97]",
              opponentId === o.id
                ? "border-ink bg-ink text-canvas dark:border-paper dark:bg-paper dark:text-canvas-dark"
                : "border-black/[0.08] text-muted hover:border-black/20 hover:text-ink dark:border-white/[0.08] dark:hover:border-white/20 dark:hover:text-paper",
            ].join(" ")}
          >
            {privateName(o.name)}
          </button>
        ))}
      </div>

      {opponentId && isLoading && (
        <p className="mt-4 text-[12px] text-muted">{t("duel.loading")}</p>
      )}

      {data && (
        <div className="mt-4 flex flex-col gap-3" data-testid="duel-result">
          <DuelRow
            label={t("duel.you")}
            done={data.me.done}
            total={data.totalItems}
            leading={data.me.done >= data.opponent.done}
          />
          <DuelRow
            label={privateName(data.opponent.name)}
            done={data.opponent.done}
            total={data.totalItems}
            leading={data.opponent.done > data.me.done}
          />
        </div>
      )}
    </div>
  );
}

function DuelRow({
  label,
  done,
  total,
  leading,
}: {
  label: string;
  done: number;
  total: number;
  leading: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className={`text-[13px] ${leading ? "font-semibold text-ink dark:text-paper" : "text-muted"}`}
        >
          {label}
        </span>
        <span className="font-mono text-[12px] text-muted tabular-nums">
          {done}/{total}
        </span>
      </div>
      <Progress value={pct(done, total)} />
    </div>
  );
}
