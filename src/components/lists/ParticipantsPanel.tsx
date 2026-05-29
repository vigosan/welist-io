import { Avatar } from "@/components/ui";
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
  challengers: Challenger[];
  collaborators: Collaborator[];
}

export function ParticipantsPanel({ challengers, collaborators }: Props) {
  if (challengers.length === 0 && collaborators.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2 order-6">
      {challengers.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500">
              {challengers.length}{" "}
              {challengers.length === 1 ? "challenger" : "challengers"}
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
                        className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all"
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
              {collaborators.length}{" "}
              {collaborators.length === 1 ? "collaborator" : "collaborators"}
            </span>
          </div>
          <ul className="divide-y divide-gray-50">
            {collaborators.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={c.name} image={c.image} />
                <span className="text-xs text-gray-700 flex-1 truncate">
                  {privateName(c.name)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
