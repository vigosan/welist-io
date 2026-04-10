import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useList, useUpdateSlug, useUpdateName } from "@/hooks/useList";
import { useItems, useAddItem, useToggleItem, useDeleteItem, useUpdateItem } from "@/hooks/useItems";
import { ItemRow } from "@/components/items/ItemRow";

export const Route = createFileRoute("/lists/$listId/")({
  component: ListDetailPage,
});

function ListDetailPage() {
  const { listId } = Route.useParams();
  const navigate = useNavigate();
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const { data: list } = useList(listId);

  const { data: items = [] } = useItems(listId);
  const addItem = useAddItem(listId);
  const toggleItem = useToggleItem(listId);
  const deleteItem = useDeleteItem(listId);
  const updateItem = useUpdateItem(listId);
  const updateSlug = useUpdateSlug(listId);
  const updateName = useUpdateName(listId);

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

  function startEditingSlug() {
    setSlugValue(list?.slug ?? "");
    setSlugError("");
    setEditingSlug(true);
  }

  function handleSlugSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = slugValue.trim();
    if (!trimmed) return;
    if (trimmed === list?.slug) { setEditingSlug(false); return; }
    setSlugError("");
    updateSlug.mutate(trimmed, {
      onSuccess: (updated) => {
        setEditingSlug(false);
        navigate({ to: "/lists/$listId", params: { listId: updated.slug ?? updated.id } });
      },
      onError: async (err: any) => {
        const body = await err?.response?.json?.().catch(() => ({}));
        setSlugError(body?.error === "slug_taken" ? "Este slug ya está en uso" : "Error al guardar");
      },
    });
  }

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;
  const currentSlug = list?.slug ?? listId;

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-start justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/[0.06] w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-6">
          {editingName ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              const trimmed = nameValue.trim();
              if (trimmed && trimmed !== list?.name) updateName.mutate(trimmed);
              setEditingName(false);
            }}>
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={(e) => { const t = e.target.value.trim(); if (t && t !== list?.name) updateName.mutate(t); setEditingName(false); }}
                data-testid="list-name-edit-input"
                className="w-full text-xl font-semibold text-gray-900 leading-tight bg-transparent outline-none border-b-2 border-gray-900"
              />
            </form>
          ) : (
            <h1
              className="text-xl font-semibold text-gray-900 leading-tight text-pretty cursor-default"
              onDoubleClick={() => { setNameValue(list?.name ?? ""); setEditingName(true); }}
            >
              {list?.name ?? "…"}
            </h1>
          )}

          {/* Meta row: stats + slug + share */}
          <div className="flex items-center gap-2 mt-2">
            {items.length > 0 && (
              <span className="text-xs text-gray-400 tabular-nums shrink-0">{doneCount} / {items.length} completados</span>
            )}
            {items.length > 0 && <span className="text-gray-200 text-xs">·</span>}

            <div className="min-w-0">
              {editingSlug ? (
                <form onSubmit={handleSlugSubmit} className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 shrink-0">/lists/</span>
                  <input
                    autoFocus
                    value={slugValue}
                    onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="mi-lista"
                    data-testid="slug-input"
                    className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-gray-400 w-36"
                  />
                  <button type="submit" disabled={!slugValue.trim() || updateSlug.isPending} className="text-xs text-gray-500 hover:text-gray-900 transition disabled:opacity-40 p-1">✓</button>
                  <button type="button" onClick={() => setEditingSlug(false)} className="text-xs text-gray-400 hover:text-gray-600 transition p-1">✕</button>
                </form>
              ) : (
                <button
                  onClick={startEditingSlug}
                  data-testid="edit-slug-btn"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition truncate max-w-full"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="truncate">/lists/{currentSlug.length > 20 ? `${currentSlug.slice(0, 8)}…` : currentSlug}</span>
                </button>
              )}
              {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
            </div>

            <button
              onClick={handleShare}
              data-testid="share-btn"
              title={copied ? "¡Copiado!" : "Compartir enlace"}
              className="relative shrink-0 ml-auto w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-900 hover:text-white transition active:scale-[0.96] overflow-hidden"
            >
              <span className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>
              <span className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </button>
          </div>

          {progress > 0 && (
            <div className="mt-4 h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-4 pb-4 space-y-1 max-h-[420px] overflow-y-auto">
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
          <form onSubmit={handleAdd} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
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
              className="px-5 py-2 text-sm font-semibold bg-gray-950 text-white rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
            >
              Añadir
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
