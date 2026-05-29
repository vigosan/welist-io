import { useState } from "react";
import { Avatar } from "@/components/ui";
import { useCachedSession } from "@/hooks/useCachedSession";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useAddCollaborator,
  useCollaborators,
  useRemoveCollaborator,
  useUserSearch,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

interface Props {
  listId: string;
  isCollaborative: boolean;
}

export function CollaboratorsManager({ listId, isCollaborative }: Props) {
  const { t } = useTranslation();
  const { data: session } = useCachedSession();
  const owner = session?.user;
  const ownerId = owner?.id ?? null;

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const { data: collabData } = useCollaborators(listId, isCollaborative);
  const { data: searchData, isFetching: searching } =
    useUserSearch(debouncedQuery);
  const addCollaborator = useAddCollaborator(listId);
  const removeCollaborator = useRemoveCollaborator(listId);

  const collaborators = collabData?.collaborators ?? [];
  const existingIds = new Set([
    ...(ownerId ? [ownerId] : []),
    ...collaborators.map((c) => c.id),
  ]);
  const results = searchData?.users.filter((u) => !existingIds.has(u.id)) ?? [];

  function handleAdd(userId: string) {
    addCollaborator.mutate(userId, {
      onSuccess: () => setQuery(""),
    });
  }

  return (
    <div className="flex flex-col gap-2" data-testid="collaborators-manager">
      <span className="text-xs text-gray-500">{t("list.collaborators")}</span>

      {isCollaborative ? (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("list.collaboratorsSearchPlaceholder")}
            data-testid="collaborators-search-input"
            className="w-full text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 transition"
          />
          {debouncedQuery.length >= 2 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {results.length === 0 && !searching ? (
                <div className="px-3 py-2 text-xs text-gray-400">
                  {t("list.collaboratorsEmptySearch")}
                </div>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => handleAdd(u.id)}
                        disabled={addCollaborator.isPending}
                        data-testid={`collaborator-add-${u.id}`}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Avatar name={u.name} image={u.image} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-900 truncate">
                            {privateName(u.name)}
                          </div>
                          {u.email && (
                            <div className="text-[11px] text-gray-400 truncate">
                              {u.email}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          {t("list.collaboratorsRequireCollaborative")}
        </p>
      )}

      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
        <ul className="divide-y divide-gray-50">
          {owner && (
            <li
              key={ownerId ?? "owner"}
              className="flex items-center gap-3 px-3 py-2.5"
              data-testid="collaborator-row-owner"
            >
              <Avatar name={owner.name ?? null} image={owner.image ?? null} />
              <span className="text-xs text-gray-700 flex-1 truncate">
                {privateName(owner.name)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                {t("list.collaboratorsOwnerBadge")}
              </span>
            </li>
          )}
          {collaborators.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 px-3 py-2.5"
              data-testid={`collaborator-row-${c.id}`}
            >
              <Avatar name={c.name} image={c.image} />
              <span className="text-xs text-gray-700 flex-1 truncate">
                {privateName(c.name)}
              </span>
              <button
                type="button"
                onClick={() => removeCollaborator.mutate(c.id)}
                disabled={removeCollaborator.isPending}
                aria-label={t("list.collaboratorsRemove")}
                data-testid={`collaborator-remove-${c.id}`}
                className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
