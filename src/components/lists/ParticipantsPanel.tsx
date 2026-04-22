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
  panel: "challengers" | "collaborators";
  challengers: Challenger[];
  collaborators: Collaborator[];
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    return (
      <img src={image} alt={name ?? ""} className="w-6 h-6 rounded-full shrink-0" />
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
      <span className="text-[8px] text-gray-500 font-medium">
        {(name ?? "?")[0]?.toUpperCase()}
      </span>
    </div>
  );
}

export function ParticipantsPanel({ panel, challengers, collaborators }: Props) {
  if (panel === "challengers" && challengers.length > 0) {
    return (
      <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden order-6">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
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
                  {c.name ?? "—"}
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
    );
  }

  if (panel === "collaborators" && collaborators.length > 0) {
    return (
      <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden order-6">
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
                {c.name ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
