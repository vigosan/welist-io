import { useState } from "react";
import {
  useAddListToCollection,
  useCreateCollection,
  useMyCollections,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export function CollectionPicker({
  listId,
  onClose,
}: {
  listId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: collections, isLoading } = useMyCollections(true);
  const addToCollection = useAddListToCollection();
  const createCollection = useCreateCollection();
  const [name, setName] = useState("");
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  function add(collectionId: string) {
    addToCollection.mutate(
      { collectionId, listId },
      { onSuccess: () => setAddedTo((prev) => new Set(prev).add(collectionId)) }
    );
  }

  function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || createCollection.isPending) return;
    createCollection.mutate(
      { name: trimmed },
      {
        onSuccess: (created) => {
          setName("");
          add(created.id);
        },
      }
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-canvas p-5 dark:bg-canvas-dark sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="collection-picker"
      >
        <h2 className="text-base font-bold text-gray-900 dark:text-paper">
          {t("collections.addTo")}
        </h2>

        <div className="mt-4 flex max-h-64 flex-col gap-2 overflow-y-auto">
          {isLoading && (
            <p className="text-xs text-gray-400">{t("collections.title")}…</p>
          )}
          {!isLoading && collections?.length === 0 && (
            <p className="text-xs text-gray-400">{t("collections.empty")}</p>
          )}
          {collections?.map((col) => {
            const added = addedTo.has(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => !added && add(col.id)}
                disabled={added || addToCollection.isPending}
                data-testid={`pick-collection-${col.id}`}
                className="flex items-center justify-between rounded-xl border border-black/[0.08] px-3 py-2 text-left text-sm text-gray-900 transition-colors hover:border-gray-400 disabled:opacity-60 dark:border-white/[0.08] dark:text-paper"
              >
                <span className="truncate">{col.name}</span>
                <span className="ml-2 shrink-0 text-xs text-gray-400">
                  {added
                    ? `✓ ${t("collections.added")}`
                    : t("collections.create")}
                </span>
              </button>
            );
          })}
        </div>

        <form onSubmit={createAndAdd} className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("collections.createPlaceholder")}
            data-testid="picker-new-collection-input"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-paper"
          />
          <button
            type="submit"
            disabled={!name.trim() || createCollection.isPending}
            className="cursor-pointer rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-canvas disabled:opacity-40 dark:bg-paper dark:text-ink"
          >
            {t("collections.create")}
          </button>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:text-gray-900 dark:border-white/[0.08]"
        >
          {t("collections.close")}
        </button>
      </div>
    </div>
  );
}
