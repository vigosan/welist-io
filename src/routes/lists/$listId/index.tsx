import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useList, useUpdateSlug, useUpdateName, useTogglePublic } from "@/hooks/useList";
import { useItems, useAddItem, useToggleItem, useDeleteItem, useUpdateItem } from "@/hooks/useItems";
import { ItemRow } from "@/components/items/ItemRow";
import { CommandPalette } from "@/components/CommandPalette";
import type { Action } from "@/components/CommandPalette";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { parseTags, tagColor, getPartialTag } from "@/lib/tags";

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
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const { data: list, isLoading: listLoading, refetch: refetchList } = useList(listId);

  useEffect(() => {
    if (list?.name) document.title = `${list.name} — Welist`;
    return () => { document.title = "Welist"; };
  }, [list?.name]);

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useItems(listId);
  const { containerRef: pullRef, pullDistance, refreshing } = usePullToRefresh(
    useCallback(() => Promise.all([refetchList(), refetchItems()]), [refetchList, refetchItems]),
  );
  const addItem = useAddItem(listId);
  const toggleItem = useToggleItem(listId);
  const deleteItem = useDeleteItem(listId);
  const updateItem = useUpdateItem(listId);
  const updateSlug = useUpdateSlug(listId);
  const updateName = useUpdateName(listId);
  const togglePublic = useTogglePublic(listId);

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

  const allTags = useMemo(() => {
    const seen = new Set<string>();
    items.forEach((i) => parseTags(i.text).tags.forEach((t) => seen.add(t)));
    return [...seen].sort();
  }, [items]);

  const partialTag = useMemo(() => getPartialTag(newItem), [newItem]);
  const tagSuggestions = useMemo(
    () => partialTag !== null ? allTags.filter((t) => t.startsWith(partialTag)) : [],
    [partialTag, allTags],
  );

  function completeTag(tag: string) {
    setNewItem((prev) => prev.replace(/#([a-zA-ZÀ-ÿ\w-]*)$/, `#${tag} `));
    addInputRef.current?.focus();
  }

  const filteredItems = useMemo(
    () => activeTag ? items.filter((i) => parseTags(i.text).tags.includes(activeTag)) : items,
    [items, activeTag],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const paletteActions: Action[] = [
    { id: "add-item", label: "Añadir elemento", onSelect: () => addInputRef.current?.focus() },
    { id: "share", label: "Copiar enlace", onSelect: handleShare },
    {
      id: "toggle-public",
      label: list?.public ? "Hacer privada" : "Hacer pública",
      onSelect: () => togglePublic.mutate(!list?.public),
    },
    { id: "rename", label: "Cambiar nombre", onSelect: () => { setNameValue(list?.name ?? ""); setEditingName(true); } },
    ...allTags.map((tag) => ({
      id: `filter-${tag}`,
      label: `Filtrar por #${tag}`,
      onSelect: () => setActiveTag(activeTag === tag ? null : tag),
    })),
    ...(activeTag ? [{ id: "clear-filter", label: "Limpiar filtro de tags", onSelect: () => setActiveTag(null) }] : []),
  ];

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;
  const currentSlug = list?.slug ?? listId;

  return (
    <>
    <div className="h-dvh bg-[#FAFAF8] flex flex-col sm:items-center sm:p-6">
      <div className="flex-1 flex flex-col w-full sm:max-w-md bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 shrink-0">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-700 transition">
            ← Welist
          </Link>
          <div className="mt-4">
          {listLoading ? (
            <div className="h-7 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
          ) : editingName ? (
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
                className="w-full text-xl font-bold text-gray-900 leading-tight bg-transparent outline-none border-b-2 border-gray-900"
              />
            </form>
          ) : (
            <h1
              className="text-xl font-bold text-gray-900 leading-tight text-pretty cursor-default"
              onDoubleClick={() => { setNameValue(list?.name ?? ""); setEditingName(true); }}
            >
              {list?.name ?? "…"}
            </h1>
          )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {listLoading ? (
              <>
                <div className="h-3.5 w-28 rounded bg-gray-200 animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse" />
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="h-7 w-20 rounded-md bg-gray-200 animate-pulse" />
                  <div className="h-7 w-7 rounded-md bg-gray-200 animate-pulse" />
                </div>
              </>
            ) : (
              <>
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
                    className="text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-gray-400 w-32 transition"
                  />
                  <button type="submit" disabled={!slugValue.trim() || updateSlug.isPending} className="text-xs text-gray-500 hover:text-gray-900 transition disabled:opacity-40 p-1">✓</button>
                  <button type="button" onClick={() => setEditingSlug(false)} className="text-xs text-gray-400 hover:text-gray-600 transition p-1">✕</button>
                </form>
              ) : (
                <button
                  onClick={startEditingSlug}
                  data-testid="edit-slug-btn"
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition truncate max-w-full"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="truncate">/lists/{currentSlug.length > 20 ? `${currentSlug.slice(0, 8)}…` : currentSlug}</span>
                </button>
              )}
              {slugError && <p className="text-xs text-red-400 mt-1">{slugError}</p>}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => togglePublic.mutate(!list?.public)}
                data-testid="toggle-public-btn"
                title={list?.public ? "Lista pública — clic para hacer privada" : "Lista privada — clic para hacer pública"}
                className={`h-7 flex items-center gap-1 px-2 rounded-md text-xs font-medium border transition active:scale-[0.96] ${
                  list?.public
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                }`}
              >
                {list?.public ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pública
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privada
                  </>
                )}
              </button>

              <button
                onClick={handleShare}
                data-testid="share-btn"
                title={copied ? "¡Copiado!" : "Compartir enlace"}
                className="relative h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96] overflow-hidden"
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
              </>
            )}
          </div>

          {!listLoading && progress > 0 && (
            <div className="mt-3 h-0.5 bg-gray-100 overflow-hidden rounded-full">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {!itemsLoading && allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  data-testid={`tag-filter-${tag}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    activeTag === tag
                      ? "border-gray-900 bg-gray-900 text-white"
                      : tagColor(tag)
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pull to refresh indicator */}
        <div
          className="shrink-0 flex items-end justify-center overflow-hidden"
          style={{
            height: refreshing ? 36 : pullDistance,
            transition: pullDistance === 0 ? "height 0.2s ease" : "none",
          }}
        >
          <div
            className={`mb-2 w-5 h-5 rounded-full border-2 border-gray-200 border-t-gray-600 ${refreshing ? "animate-spin" : ""}`}
          />
        </div>

        {/* Items — scrollable, fills remaining space */}
        <div ref={pullRef} className="flex-1 overflow-y-auto overscroll-none px-3 py-1">
          {itemsLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50">
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                  </div>
                  <div className="flex-1 h-4 rounded-md bg-gray-200 animate-pulse" style={{ width: `${55 + (i * 13) % 35}%` }} />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">
              {activeTag ? `No hay elementos con #${activeTag}.` : "Añade el primer elemento a tu lista."}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggleItem.mutate(item.id)}
                  onDelete={() => deleteItem.mutate(item.id)}
                  onEdit={(text) => updateItem.mutate({ id: item.id, text })}
                  onTagClick={(tag) => setActiveTag(activeTag === tag ? null : tag)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — always visible at bottom */}
        <div className="shrink-0 px-4 pt-3 pb-6 space-y-2">
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => completeTag(tag)}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition active:scale-[0.96] ${tagColor(tag)}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleAdd} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <input
              ref={addInputRef}
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
              className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
            >
              Añadir
            </button>
          </form>
        </div>

      </div>
    </div>

    <CommandPalette
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      actions={paletteActions}
    />
    </>
  );
}
