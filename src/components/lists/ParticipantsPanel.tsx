import { Avatar } from "@/components/ui";
import { useRemoveCollaborator } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

type Challenger = {
  id: string;
  name: string | null;
  image: string | null;
  completedAt: string | null;
  doneCount: number;
  totalItems: number;
};

type Collaborator = {
  id: string;
  name: string | null;
  image: string | null;
};

interface Props {
  listId: string;
  isOwner: boolean;
  challengers: Challenger[];
  collaborators: Collaborator[];
}

export function ParticipantsPanel({
  listId,
  isOwner,
  challengers,
  collaborators,
}: Props) {
  const { t } = useTranslation();
  const removeCollaborator = useRemoveCollaborator(listId);
  if (challengers.length === 0 && collaborators.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 order-6">
      {challengers.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              {t("list.challengersCount", { count: challengers.length })}
            </span>
          </div>
          <ul className="divide-y divide-gray-50">
            {challengers.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={c.name} image={c.image} />
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-xs text-gray-700 truncate">
                    {privateName(c.name)}
                  </span>
                  {!c.completedAt && c.totalItems > 0 && (
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-[width] duration-300"
                        style={{
                          width: `${Math.round((c.doneCount / c.totalItems) * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 tabular-nums shrink-0">
                  {c.completedAt ? "✓" : `${c.doneCount}/${c.totalItems}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {collaborators.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              {t("list.collaboratorsCount", { count: collaborators.length })}
            </span>
          </div>
          <ul className="divide-y divide-gray-50">
            {collaborators.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={c.name} image={c.image} />
                <span className="text-xs text-gray-700 flex-1 truncate">
                  {privateName(c.name)}
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeCollaborator.mutate(c.id)}
                    disabled={removeCollaborator.isPending}
                    aria-label={t("list.collaboratorsRemove")}
                    data-testid={`participant-remove-collaborator-${c.id}`}
                    className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 shrink-0"
                  >
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
