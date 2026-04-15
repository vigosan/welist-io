import { createFileRoute, useNavigate, Link, notFound } from "@tanstack/react-router";
import { useSession } from "@hono/auth-js/react";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useItems, useAddItem, useToggleItem, useDeleteItem, useUpdateItem, useBulkAddItems, useReorderItems } from "@/hooks/useItems";
import { useToggleCollaborative } from "@/hooks/useList";
import { useListHeader } from "@/hooks/useListHeader";
import { useListPrice, useSetPrice, useRemovePrice } from "@/hooks/useListPrice";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { ListSettingsPanel } from "@/components/ListSettingsPanel";
import { useItemsFilter } from "@/hooks/useItemsFilter";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { ItemRow } from "@/components/items/ItemRow";
import { BulkPastePreview } from "@/components/items/BulkPastePreview";
import { CommandPalette } from "@/components/CommandPalette";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { tagColor } from "@/lib/tags";
import { fireConfetti } from "@/lib/confetti";
import { BULK_ITEM_LIMIT } from "@/lib/constants";
import { useTranslation } from "@/i18n/service";

const searchSchema = z.object({
  status: z.enum(["all", "pending", "done"]).optional().default("all"),
  tag: z.string().optional(),
});

export const Route = createFileRoute("/lists/$listId/")({
  validateSearch: searchSchema,
  component: ListDetailPage,
});

function ListDetailPage() {
  const { listId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const { status: statusFilter, tag: activeTag } = Route.useSearch();
  const [newItem, setNewItem] = useState("");
  const [pendingBulk, setPendingBulk] = useState<string[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  function openSearch() {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearch() {
    setSearchActive(false);
    setSearchQuery("");
  }

  function setStatusFilter(s: "all" | "pending" | "done") {
    navigate({ search: (prev) => ({ ...prev, status: s === "all" ? undefined : s }), replace: true });
  }
  function setActiveTag(t: string | null) {
    navigate({ search: (prev) => ({ ...prev, tag: t ?? undefined }), replace: true });
  }

  const toggleCollaborative = useToggleCollaborative(listId);
  const { data: session } = useSession();

  const { data: listPrice } = useListPrice(listId, settingsOpen);
  const setPrice = useSetPrice(listId);
  const removePrice = useRemovePrice(listId);
  const { data: stripeStatus } = useStripeAccountStatus(settingsOpen);

  const {
    list, listLoading, listError, refetchList,
    editingName, setEditingName, nameValue, setNameValue, updateName,
    editingSlug, setEditingSlug, slugValue, setSlugValue, slugError,
    startEditingSlug, handleSlugSubmit, updateSlug,
    editingDescription, setEditingDescription, descriptionValue, setDescriptionValue, updateDescription,
    copied, handleShare,
    togglePublic,
  } = useListHeader({
    listId,
    onSlugUpdated: (updated) => navigate({ to: "/lists/$listId", params: { listId: updated.slug ?? updated.id } }),
  });

  useEffect(() => {
    if (list?.name) document.title = `${list.name} — Welist`;
    return () => { document.title = "Welist"; };
  }, [list?.name]);

  if (listError) throw notFound();

  const isOwner = !list ? false : (list.ownerId === null || list.ownerId === session?.user?.id);
  const isParticipant = !!list?.participated && !isOwner && !!list?.public;
  const canWrite = isOwner || (isParticipant && !!list?.collaborative) || (!list?.public && !!list?.collaborative);

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useItems(listId);

  const { allTags, tagSuggestions, filteredItems, resetOrder } = useItemsFilter({
    items,
    itemsLoading,
    statusFilter,
    activeTag,
    searchQuery,
    newItemText: newItem,
  });

  const { containerRef: pullRef, pullDistance, refreshing } = usePullToRefresh(
    useCallback(async () => {
      resetOrder();
      await Promise.all([refetchList(), refetchItems()]);
    }, [resetOrder, refetchList, refetchItems]),
  );

  const { paletteOpen, setPaletteOpen, paletteActions } = useCommandPalette({
    list,
    allTags,
    activeTag,
    addInputRef,
    handleShare,
    setActiveTag,
    setStatusFilter,
    setNameValue,
    setEditingName,
    togglePublicMutate: (v) => togglePublic.mutate(v),
    onSearch: openSearch,
  });

  const addItem = useAddItem(listId);
  const bulkAddItems = useBulkAddItems(listId);
  const toggleItem = useToggleItem(listId);
  const deleteItem = useDeleteItem(listId);
  const updateItem = useUpdateItem(listId);
  const reorderItems = useReorderItems(listId);

  const dragItemId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    return (e: React.DragEvent) => {
      dragItemId.current = id;
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (dragOverId !== id) setDragOverId(id);
    };
  }

  function handleDrop(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const fromId = dragItemId.current;
      if (!fromId || fromId === id) return;
      const ids = filteredItems.map((i) => i.id);
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(id);
      if (fromIdx === -1 || toIdx === -1) return;
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, fromId);
      reorderItems.mutate(ids);
      setDragOverId(null);
    };
  }

  function handleDragEnd() {
    dragItemId.current = null;
    setDragOverId(null);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    addItem.mutate({ text: trimmed }, { onSuccess: () => setNewItem("") });
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    setPendingBulk(lines.slice(0, BULK_ITEM_LIMIT));
    setNewItem("");
  }

  function handleBulkConfirm() {
    if (!pendingBulk) return;
    bulkAddItems.mutate(pendingBulk, { onSuccess: () => setPendingBulk(null) });
  }

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;
  const prevProgress = useRef(0);
  useEffect(() => {
    if (progress === 100 && prevProgress.current < 100 && items.length > 0) fireConfetti();
    prevProgress.current = progress;
  }, [progress, items.length]);

  const currentSlug = list?.slug ?? listId;

  return (
    <>
    <div className="h-dvh bg-[#FAFAF8] flex flex-col sm:items-center sm:p-6">
      <div className="flex-1 flex flex-col w-full sm:max-w-xl bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">

        <div className="px-5 pt-5 pb-4 shrink-0">
          <Link to="/lists" className="cursor-pointer text-xs text-gray-400 hover:text-gray-700 transition">
            {t("list.back")}
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
              onDoubleClick={isOwner ? () => { setNameValue(list?.name ?? ""); setEditingName(true); } : undefined}
            >
              {list?.name ?? "…"}
            </h1>
          )}
          </div>

          {!listLoading && (isOwner || !!list?.description) && (
            <div className="mt-2">
              {isOwner ? (
                editingDescription ? (
                  <textarea
                    autoFocus
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    onBlur={() => {
                      const trimmed = descriptionValue.trim();
                      updateDescription.mutate(trimmed || null);
                      setEditingDescription(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setEditingDescription(false); }
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const trimmed = descriptionValue.trim();
                        updateDescription.mutate(trimmed || null);
                        setEditingDescription(false);
                      }
                    }}
                    placeholder={t("list.addDescriptionPlaceholder")}
                    maxLength={500}
                    rows={2}
                    data-testid="description-textarea"
                    className="w-full text-sm text-gray-600 leading-relaxed bg-transparent outline-none resize-none border-b border-gray-200 focus:border-gray-400 transition placeholder-gray-300"
                  />
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => { setDescriptionValue(list?.description ?? ""); setEditingDescription(true); }}
                      data-testid="description-btn"
                      className="cursor-pointer w-full text-left text-sm leading-relaxed transition"
                    >
                      {list?.description
                        ? <span className={`text-gray-500 ${descriptionExpanded ? "" : "line-clamp-2"}`}>{list.description}</span>
                        : <span className="text-gray-300 hover:text-gray-400">{t("list.addDescriptionPlaceholder")}</span>
                      }
                    </button>
                    {list?.description && list.description.length > 80 && (
                      <button
                        type="button"
                        onClick={() => setDescriptionExpanded((v) => !v)}
                        className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition mt-0.5"
                      >
                        {descriptionExpanded ? t("list.expandLess") : t("list.expandMore")}
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div>
                  <span className={`text-sm text-gray-500 leading-relaxed ${descriptionExpanded ? "" : "line-clamp-2"}`}>{list?.description}</span>
                  {list?.description && list.description.length > 80 && (
                    <button
                      type="button"
                      onClick={() => setDescriptionExpanded((v) => !v)}
                      className="cursor-pointer block text-xs text-gray-400 hover:text-gray-600 transition mt-0.5"
                    >
                      {descriptionExpanded ? t("list.expandLess") : t("list.expandMore")}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {isParticipant && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="text-xs text-gray-500 flex-1">
                {list?.participationCompletedAt
                  ? t("list.challengeCompleted")
                  : t("list.challengeInProgress")}
              </span>
              {list?.collaborative && (
                <span className="text-xs text-gray-400">{t("list.canContribute")}</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-2">
            {listLoading ? (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="h-3.5 w-28 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3.5 w-24 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="h-7 w-20 rounded-md bg-gray-200 animate-pulse" />
                  <div className="h-7 w-7 rounded-md bg-gray-200 animate-pulse" />
                </div>
              </>
            ) : (
              <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
            {items.length > 0 && (
              <span className="text-xs text-gray-400 tabular-nums shrink-0">
                {t("list.progress", { done: doneCount, total: items.length })}
              </span>
            )}
            {items.length > 0 && <span className="text-gray-200 text-xs shrink-0">·</span>}

            <div className="min-w-0">
              {isOwner && editingSlug ? (
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
                  <button type="submit" disabled={!slugValue.trim() || updateSlug.isPending} className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 transition disabled:opacity-40 p-1">✓</button>
                  <button type="button" onClick={() => setEditingSlug(false)} className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition p-1">✕</button>
                </form>
              ) : isOwner ? (
                <button
                  onClick={startEditingSlug}
                  data-testid="edit-slug-btn"
                  className="cursor-pointer flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition truncate max-w-full"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span className="truncate">/lists/{currentSlug.length > 20 ? `${currentSlug.slice(0, 8)}…` : currentSlug}</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400 truncate">/lists/{currentSlug.length > 20 ? `${currentSlug.slice(0, 8)}…` : currentSlug}</span>
              )}
              {slugError && <p className="text-xs text-gray-400 mt-1">{slugError}</p>}
            </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!searchActive && (
                <button
                  onClick={openSearch}
                  data-testid="search-btn"
                  aria-label={t("list.searchAriaLabel")}
                  title={t("list.searchTitle")}
                  className="cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96]"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              <span aria-live="polite" className="sr-only">{copied ? t("list.linkCopied") : ""}</span>
              <button
                onClick={handleShare}
                data-testid="share-btn"
                aria-label={copied ? t("list.linkCopied") : t("list.shareLink")}
                title={copied ? t("list.copiedTooltip") : t("list.shareLink")}
                className="cursor-pointer relative h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96] overflow-hidden"
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

              {isOwner && (
                <button
                  onClick={() => setSettingsOpen((v) => !v)}
                  data-testid="settings-btn"
                  aria-label={t("list.settings")}
                  title={t("list.settings")}
                  className={`cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border transition active:scale-[0.96] ${
                    settingsOpen
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
              </>
            )}
          </div>

          {!listLoading && isOwner && settingsOpen && (
            <div className="mt-3">
              <ListSettingsPanel
                isPublic={!!list?.public}
                isCollaborative={!!list?.collaborative}
                priceInCents={listPrice?.priceInCents ?? null}
                stripeConnected={!!stripeStatus?.onboardingComplete}
                onTogglePublic={(v) => togglePublic.mutate(v)}
                onToggleCollaborative={(v) => toggleCollaborative.mutate(v)}
                onSetPrice={(cents) => setPrice.mutate(cents)}
                onRemovePrice={() => removePrice.mutate()}
              />
            </div>
          )}

          {!listLoading && progress > 0 && (
            <div className="mt-3 h-0.5 bg-gray-100 overflow-hidden rounded-full">
              <div
                className="h-full bg-gray-900 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {!itemsLoading && items.length > 0 && (
            <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-none -mx-5 px-5 pb-0.5">
              {(["pending", "done"] as const).map((s) => (
                <button
                  key={s}
                  data-testid={`status-filter-${s}`}
                  onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    statusFilter === s
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {s === "pending" ? t("list.filterPending") : t("list.filterDone")}
                </button>
              ))}
              {allTags.map((tag) => (
                <button
                  key={tag}
                  data-testid={`tag-filter-${tag}`}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
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

        {searchActive && (
          <div className="shrink-0 px-3 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
                placeholder={t("list.searchPlaceholder")}
                data-testid="search-input"
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              />
              {searchQuery && (
                <span className="text-xs text-gray-400 tabular-nums shrink-0">
                  {t("list.results", { count: filteredItems.length })}
                </span>
              )}
              <button
                type="button"
                onClick={closeSearch}
                data-testid="search-close"
                className="cursor-pointer text-gray-300 hover:text-gray-500 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
              {searchQuery
                ? t("list.noResults", { query: searchQuery })
                : activeTag || (statusFilter && statusFilter !== "all")
                  ? t("list.noItemsFilter")
                  : t("list.addFirst")}
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
                  canWrite={canWrite}
                  onDragStart={isOwner ? handleDragStart(item.id) : undefined}
                  onDragOver={isOwner ? handleDragOver(item.id) : undefined}
                  onDrop={isOwner ? handleDrop(item.id) : undefined}
                  onDragEnd={isOwner ? handleDragEnd : undefined}
                  isDragOver={dragOverId === item.id}
                />
              ))}
            </div>
          )}
        </div>

        {canWrite && (
          <div className="shrink-0 px-4 pt-3 pb-6 space-y-2">
            {pendingBulk ? (
              <BulkPastePreview
                texts={pendingBulk}
                isPending={bulkAddItems.isPending}
                onChange={setPendingBulk}
                onConfirm={handleBulkConfirm}
                onCancel={() => setPendingBulk(null)}
              />
            ) : (
              <>
                {tagSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {tagSuggestions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNewItem((prev) => prev.replace(/#([a-zA-ZÀ-ÿ\w-]*)$/, `#${tag} `));
                          addInputRef.current?.focus();
                        }}
                        className={`cursor-pointer inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition active:scale-[0.96] ${tagColor(tag)}`}
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
                    onPaste={handlePaste}
                    placeholder={t("list.addItemPlaceholder")}
                    data-testid="add-item-input"
                    className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newItem.trim() || addItem.isPending}
                    data-testid="add-item-submit"
                    className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
                  >
                    {t("list.addItem")}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

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
