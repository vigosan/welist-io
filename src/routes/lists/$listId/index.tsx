import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useItems, useAddItem, useToggleItem, useDeleteItem, useUpdateItem } from "@/hooks/useItems";
import { ItemRow } from "@/components/items/ItemRow";
import type { List } from "@/db/schema";

export const Route = createFileRoute("/lists/$listId/")({
  component: ListDetailPage,
});

function ListDetailPage() {
  const { listId } = Route.useParams();
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: list } = useQuery({
    queryKey: ["list", listId],
    queryFn: () => apiClient<List>(`/api/lists/${listId}`),
  });

  const { data: items = [] } = useItems(listId);
  const addItem = useAddItem(listId);
  const toggleItem = useToggleItem(listId);
  const deleteItem = useDeleteItem(listId);
  const updateItem = useUpdateItem(listId);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    addItem.mutate({ text: trimmed }, { onSuccess: () => setNewItem("") });
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                {list?.name ?? "…"}
              </h1>
              {items.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{doneCount} / {items.length} completados</p>
              )}
            </div>
            <button
              onClick={handleShare}
              data-testid="share-btn"
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              {copied ? (
                "¡Copiado!"
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Compartir
                </>
              )}
            </button>
          </div>

          {items.length > 0 && (
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-4 pb-4 space-y-2 max-h-[420px] overflow-y-auto">
          {items.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Añade el primer elemento a tu lista.
            </p>
          )}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onToggle={() => toggleItem.mutate(item.id)}
              onDelete={() => deleteItem.mutate(item.id)}
              onEdit={(text) => updateItem.mutate({ id: item.id, text })}
            />
          ))}
        </div>

        {/* Add item */}
        <div className="px-4 pb-4">
          <form onSubmit={handleAdd} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Añadir elemento…"
              data-testid="add-item-input"
              className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              disabled={!newItem.trim() || addItem.isPending}
              data-testid="add-item-submit"
              className="px-5 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Añadir
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
