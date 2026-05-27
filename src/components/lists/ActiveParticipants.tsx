import { memo } from "react";
import { useTranslation } from "@/i18n/service";

interface Participant {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  participants: Participant[];
  total: number;
  onClick?: () => void;
}

export const ActiveParticipants = memo(function ActiveParticipants({
  participants,
  total,
  onClick,
}: Props) {
  const { t } = useTranslation();
  if (total === 0) return null;
  const overflow = total - participants.length;

  const content = (
    <>
      <div className="flex -space-x-1.5">
        {participants.map((p) => (
          <div
            key={p.id}
            data-testid={`active-participant-${p.id}`}
            title={p.name ?? ""}
            className="w-6 h-6 rounded-full ring-2 ring-canvas dark:ring-canvas-dark overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
          >
            {p.image ? (
              <img
                src={p.image}
                alt={p.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-300">
                {(p.name ?? "?")[0]?.toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      {overflow > 0 && (
        <span
          data-testid="active-participants-overflow"
          className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tabular-nums"
        >
          +{overflow}
        </span>
      )}
    </>
  );

  const label = t("list.activeParticipants", { count: total });

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid="active-participants"
        className="cursor-pointer flex items-center gap-1.5 hover:opacity-70 transition-opacity"
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-testid="active-participants"
      className="flex items-center gap-1.5"
      aria-label={label}
    >
      {content}
    </div>
  );
});
