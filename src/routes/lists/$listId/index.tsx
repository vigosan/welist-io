import { useSession } from "@hono/auth-js/react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AppNav } from "@/components/AppNav";
import { CommandPalette } from "@/components/CommandPalette";
import { BulkPastePreview } from "@/components/items/BulkPastePreview";
import { ItemRow } from "@/components/items/ItemRow";
import { ListSettingsPanel } from "@/components/ListSettingsPanel";
import { ListMap } from "@/components/maps/ListMap";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import {
  useAddItem,
  useBulkAddItems,
  useDeleteItem,
  useItems,
  useReorderItems,
  useToggleItem,
  useUpdateItem,
} from "@/hooks/useItems";
import { useItemsFilter } from "@/hooks/useItemsFilter";
import { useCollaborators, useToggleCollaborative } from "@/hooks/useList";
import { useListHeader } from "@/hooks/useListHeader";
import {
  useListPrice,
  useRemovePrice,
  useSetPrice,
} from "@/hooks/useListPrice";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { useTranslation } from "@/i18n/service";
import { fireConfetti } from "@/lib/confetti";
import { BULK_ITEM_LIMIT } from "@/lib/constants";
import { PARTIAL_PLACE_REGEX } from "@/lib/places";
import { tagColor } from "@/lib/tags";
import type { Coords } from "@/services/items.service";

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
  const [participantsPanel, setParticipantsPanel] = useState<
    "challengers" | "collaborators" | null
  >(null);
  const [pendingCoords, setPendingCoords] = useState<Coords | null>(null);
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false);
  const [activePlace, setActivePlace] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const addInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  function openSearch() {
    setSearchActive(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    setSearchActive(false);
    setSearchQuery("");
  }

  function setStatusFilter(s: "all" | "pending" | "done") {
    navigate({
      search: (prev) => ({ ...prev, status: s }),
      replace: true,
    });
  }
  function setActiveTag(t: string | null) {
    navigate({
      search: (prev) => ({ ...prev, tag: t ?? undefined }),
      replace: true,
    });
  }

  const toggleCollaborative = useToggleCollaborative(listId);
  const { data: session } = useSession();

  const { data: listPrice } = useListPrice(listId, settingsOpen);
  const setPrice = useSetPrice(listId);
  const removePrice = useRemovePrice(listId);
  const { data: stripeStatus } = useStripeAccountStatus(settingsOpen);

  const {
    list,
    listLoading,
    listError,
    refetchList,
    editingName,
    setEditingName,
    nameValue,
    setNameValue,
    updateName,
    editingSlug,
    setEditingSlug,
    slugValue,
    setSlugValue,
    slugError,
    startEditingSlug,
    handleSlugSubmit,
    updateSlug,
    editingDescription,
    setEditingDescription,
    descriptionValue,
    setDescriptionValue,
    updateDescription,
    copied,
    handleShare,
    togglePublic,
  } = useListHeader({
    listId,
    onSlugUpdated: (updated) =>
      navigate({
        to: "/lists/$listId",
        params: { listId: updated.slug ?? updated.id },
      }),
  });

  useEffect(() => {
    if (list?.name) document.title = `${list.name} — Welist`;
    return () => {
      document.title = "Welist";
    };
  }, [list?.name]);

  if (listError) throw notFound();

  const isOwner = !list
    ? false
    : list.ownerId === null || list.ownerId === session?.user?.id;
  const isParticipant = !!list?.participated && !isOwner && !!list?.public;
  const canWrite =
    isOwner ||
    (isParticipant && !!list?.collaborative) ||
    (!list?.public && !!list?.collaborative);
  const canToggle = canWrite || isParticipant;
  const { data: participantData } = useCollaborators(
    listId,
    isOwner && (!!list?.public || !!list?.collaborative)
  );
  const collaborators = participantData?.collaborators ?? [];
  const challengers = participantData?.challengers ?? [];

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useItems(listId);

  const {
    allTags,
    allPlaces,
    tagSuggestions,
    placeSuggestions,
    partialPlace,
    filteredItems,
    resetOrder,
    setOrder,
  } = useItemsFilter({
    items,
    itemsLoading,
    statusFilter,
    activeTag,
    activePlace,
    searchQuery,
    newItemText: newItem,
  });

  const geocodingQuery =
    placeDropdownOpen && partialPlace !== null && partialPlace.length >= 3
      ? partialPlace
      : "";
  const { results: geocodingResults, isLoading: geocodingLoading } =
    useGeocodingSearch(geocodingQuery);

  const {
    containerRef: pullRef,
    pullDistance,
    refreshing,
  } = usePullToRefresh(
    useCallback(async () => {
      resetOrder();
      await Promise.all([refetchList(), refetchItems()]);
    }, [resetOrder, refetchList, refetchItems])
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
      setOrder(ids);
      reorderItems.mutate(ids, { onError: () => resetOrder() });
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
    addItem.mutate(
      { text: trimmed, coords: pendingCoords ?? undefined },
      {
        onSuccess: () => {
          setNewItem("");
          setPendingCoords(null);
          setPlaceDropdownOpen(false);
        },
      }
    );
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    setPendingBulk(lines.slice(0, BULK_ITEM_LIMIT));
    setNewItem("");
  }

  function handleBulkConfirm() {
    if (!pendingBulk) return;
    bulkAddItems.mutate(pendingBulk, {
      onSuccess: () => setPendingBulk(null),
    });
  }

  const doneCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0;
  const hasGeoItems = items.some(
    (i) => i.latitude !== null && i.longitude !== null
  );
  const prevProgress = useRef(0);
  useEffect(() => {
    if (progress === 100 && prevProgress.current < 100 && items.length > 0)
      fireConfetti();
    prevProgress.current = progress;
  }, [progress, items.length]);

  const currentSlug = list?.slug ?? listId;

  return (
    <>
      <div className="min-h-dvh bg-[#FAFAF8] dark:bg-gray-950 flex flex-col">
        <AppNav />
        <div className="flex-1 flex flex-col sm:items-center sm:p-6">
          <div className="flex-1 flex flex-col w-full sm:max-w-3xl bg-white dark:bg-gray-900 sm:rounded-3xl sm:border sm:border-gray-100 dark:sm:border-gray-800 overflow-hidden sm:max-h-[calc(100dvh-3.25rem-3rem)]">
            <div className="px-5 pt-5 pb-4 shrink-0">
              <Link
                to="/lists"
                className="cursor-pointer text-xs text-gray-400 hover:text-gray-700 transition"
              >
                {t("list.back")}
              </Link>
              <div className="mt-4">
                {listLoading ? (
                  <div className="h-7 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
                ) : editingName ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const trimmed = nameValue.trim();
                      if (trimmed && trimmed !== list?.name)
                        updateName.mutate(trimmed);
                      setEditingName(false);
                    }}
                  >
                    <input
                      autoFocus
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onBlur={(e) => {
                        const t = e.target.value.trim();
                        if (t && t !== list?.name) updateName.mutate(t);
                        setEditingName(false);
                      }}
                      data-testid="list-name-edit-input"
                      className="w-full text-xl font-bold text-gray-900 leading-tight bg-transparent outline-none border-b-2 border-gray-900"
                    />
                  </form>
                ) : (
                  <h1
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight text-pretty cursor-default"
                    onDoubleClick={
                      isOwner
                        ? () => {
                            setNameValue(list?.name ?? "");
                            setEditingName(true);
                          }
                        : undefined
                    }
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
                          if (e.key === "Escape") {
                            setEditingDescription(false);
                          }
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
                          onClick={() => {
                            setDescriptionValue(list?.description ?? "");
                            setEditingDescription(true);
                          }}
                          data-testid="description-btn"
                          className="cursor-pointer w-full text-left text-sm leading-relaxed transition"
                        >
                          {list?.description ? (
                            <span
                              className={`text-gray-500 ${descriptionExpanded ? "" : "line-clamp-2"}`}
                            >
                              {list.description}
                            </span>
                          ) : (
                            <span className="text-gray-300 hover:text-gray-400">
                              {t("list.addDescriptionPlaceholder")}
                            </span>
                          )}
                        </button>
                        {list?.description && list.description.length > 80 && (
                          <button
                            type="button"
                            onClick={() => setDescriptionExpanded((v) => !v)}
                            className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition mt-0.5"
                          >
                            {descriptionExpanded
                              ? t("list.expandLess")
                              : t("list.expandMore")}
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    <div>
                      <span
                        className={`text-sm text-gray-500 leading-relaxed ${descriptionExpanded ? "" : "line-clamp-2"}`}
                      >
                        {list?.description}
                      </span>
                      {list?.description && list.description.length > 80 && (
                        <button
                          type="button"
                          onClick={() => setDescriptionExpanded((v) => !v)}
                          className="cursor-pointer block text-xs text-gray-400 hover:text-gray-600 transition mt-0.5"
                        >
                          {descriptionExpanded
                            ? t("list.expandLess")
                            : t("list.expandMore")}
                        </button>
                      )}
                    </div>
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
                          {t("list.progress", {
                            done: doneCount,
                            total: items.length,
                          })}
                        </span>
                      )}
                      {items.length > 0 && (
                        <span className="text-gray-200 text-xs shrink-0">
                          ·
                        </span>
                      )}

                      <div className="min-w-0">
                        {isOwner && editingSlug ? (
                          <form
                            onSubmit={handleSlugSubmit}
                            className="flex items-center gap-1.5"
                          >
                            <span className="text-xs text-gray-400 shrink-0">
                              /lists/
                            </span>
                            <input
                              autoFocus
                              value={slugValue}
                              onChange={(e) =>
                                setSlugValue(
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9-]/g, "")
                                )
                              }
                              placeholder="mi-lista"
                              aria-label={t("list.confirmSlug")}
                              data-testid="slug-input"
                              className="text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-gray-400 w-32 transition"
                            />
                            <button
                              type="submit"
                              aria-label={t("list.confirmSlug")}
                              disabled={
                                !slugValue.trim() || updateSlug.isPending
                              }
                              className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 transition disabled:opacity-40 p-1"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              aria-label={t("list.cancelSlug")}
                              onClick={() => setEditingSlug(false)}
                              className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition p-1"
                            >
                              ✕
                            </button>
                          </form>
                        ) : isOwner ? (
                          <button
                            type="button"
                            onClick={startEditingSlug}
                            data-testid="edit-slug-btn"
                            className="cursor-pointer flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition truncate max-w-full"
                          >
                            <svg
                              aria-hidden="true"
                              className="w-3 h-3 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                            <span className="truncate">
                              /lists/
                              {currentSlug.length > 20
                                ? `${currentSlug.slice(0, 8)}…`
                                : currentSlug}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 truncate">
                            /lists/
                            {currentSlug.length > 20
                              ? `${currentSlug.slice(0, 8)}…`
                              : currentSlug}
                          </span>
                        )}
                        {slugError && (
                          <p className="text-xs text-gray-400 mt-1">
                            {slugError}
                          </p>
                        )}
                      </div>

                      {isOwner && challengers.length > 0 && (
                        <>
                          <span className="text-gray-200 text-xs shrink-0">
                            ·
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setParticipantsPanel((p) =>
                                p === "challengers" ? null : "challengers"
                              )
                            }
                            className="cursor-pointer flex items-center gap-1 shrink-0 hover:opacity-70 transition-opacity"
                            aria-label={`${challengers.length} challengers`}
                          >
                            <div className="flex -space-x-1">
                              {challengers.slice(0, 5).map((c) =>
                                c.image ? (
                                  <img
                                    key={c.id}
                                    src={c.image}
                                    alt={c.name ?? ""}
                                    className="w-4 h-4 rounded-full outline outline-1 outline-white"
                                  />
                                ) : (
                                  <div
                                    key={c.id}
                                    className="w-4 h-4 rounded-full bg-gray-200 outline outline-1 outline-white flex items-center justify-center"
                                  >
                                    <span className="text-[6px] text-gray-500 font-medium">
                                      {(c.name ?? "?")[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                            <span className="text-xs text-gray-400 tabular-nums">
                              {challengers.length}
                            </span>
                          </button>
                        </>
                      )}

                      {isOwner && collaborators.length > 0 && (
                        <>
                          <span className="text-gray-200 text-xs shrink-0">
                            ·
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setParticipantsPanel((p) =>
                                p === "collaborators" ? null : "collaborators"
                              )
                            }
                            className="cursor-pointer flex items-center gap-1 shrink-0 hover:opacity-70 transition-opacity"
                            aria-label={`${collaborators.length} collaborators`}
                          >
                            <div className="flex -space-x-1">
                              {collaborators.slice(0, 5).map((c) =>
                                c.image ? (
                                  <img
                                    key={c.id}
                                    src={c.image}
                                    alt={c.name ?? ""}
                                    className="w-4 h-4 rounded-full outline outline-1 outline-white"
                                  />
                                ) : (
                                  <div
                                    key={c.id}
                                    className="w-4 h-4 rounded-full bg-gray-200 outline outline-1 outline-white flex items-center justify-center"
                                  >
                                    <span className="text-[6px] text-gray-500 font-medium">
                                      {(c.name ?? "?")[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                            <span className="text-xs text-gray-400 tabular-nums">
                              {collaborators.length}
                            </span>
                          </button>
                        </>
                      )}

                      {isParticipant && (
                        <>
                          <span className="text-gray-200 text-xs shrink-0">
                            ·
                          </span>
                          <span className="text-xs text-gray-400 shrink-0">
                            {list?.participationCompletedAt
                              ? t("list.challengeCompleted")
                              : t("list.challengeInProgress")}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasGeoItems && (
                        <button
                          type="button"
                          onClick={() =>
                            setViewMode((v) => (v === "list" ? "map" : "list"))
                          }
                          data-testid="map-toggle-btn"
                          aria-label={
                            viewMode === "list"
                              ? t("list.mapView")
                              : t("list.listView")
                          }
                          title={
                            viewMode === "list"
                              ? t("list.mapView")
                              : t("list.listView")
                          }
                          className={`cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border transition active:scale-[0.96] ${viewMode === "map" ? "border-gray-900 text-gray-900 dark:border-gray-100 dark:text-gray-100" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700"}`}
                        >
                          {viewMode === "list" ? (
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
                                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                              />
                            </svg>
                          ) : (
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
                                d="M4 6h16M4 10h16M4 14h16M4 18h16"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                      {!searchActive && (
                        <button
                          type="button"
                          onClick={openSearch}
                          data-testid="search-btn"
                          aria-label={t("list.searchAriaLabel")}
                          title={t("list.searchTitle")}
                          className="cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96]"
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
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                        </button>
                      )}

                      <span aria-live="polite" className="sr-only">
                        {copied ? t("list.linkCopied") : ""}
                      </span>
                      <button
                        type="button"
                        onClick={handleShare}
                        data-testid="share-btn"
                        aria-label={
                          copied ? t("list.linkCopied") : t("list.shareLink")
                        }
                        title={
                          copied ? t("list.copiedTooltip") : t("list.shareLink")
                        }
                        className="cursor-pointer relative h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96] overflow-hidden"
                      >
                        <span
                          className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
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
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                        </span>
                        <span
                          className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${copied ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
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
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaletteOpen(true)}
                        data-testid="command-palette-btn"
                        aria-label="Command palette (⌘K)"
                        title="Command palette (⌘K)"
                        className="cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition active:scale-[0.96]"
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
                            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>

                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setSettingsOpen((v) => !v)}
                          data-testid="settings-btn"
                          aria-label={t("list.settings")}
                          title={t("list.settings")}
                          className={`cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border transition active:scale-[0.96] ${
                            settingsOpen
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          }`}
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
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {!listLoading &&
                isOwner &&
                participantsPanel === "challengers" &&
                challengers.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {challengers.length}{" "}
                        {challengers.length === 1
                          ? "challenger"
                          : "challengers"}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {challengers.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          {c.image ? (
                            <img
                              src={c.image}
                              alt={c.name ?? ""}
                              className="w-6 h-6 rounded-full shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                              <span className="text-[8px] text-gray-500 font-medium">
                                {(c.name ?? "?")[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
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
                            {c.completedAt
                              ? "✓"
                              : `${c.doneCount}/${c.totalItems}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {!listLoading &&
                isOwner &&
                participantsPanel === "collaborators" &&
                collaborators.length > 0 && (
                  <div className="mt-2 border border-gray-100 rounded-xl overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-500">
                        {collaborators.length}{" "}
                        {collaborators.length === 1
                          ? "collaborator"
                          : "collaborators"}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-50">
                      {collaborators.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center gap-3 px-3 py-2.5"
                        >
                          {c.image ? (
                            <img
                              src={c.image}
                              alt={c.name ?? ""}
                              className="w-6 h-6 rounded-full shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                              <span className="text-[8px] text-gray-500 font-medium">
                                {(c.name ?? "?")[0]?.toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-gray-700 flex-1 truncate">
                            {c.name ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {!listLoading && isOwner && settingsOpen && (
                <div className="mt-3 flex flex-col gap-2">
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
                  {challengers.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("stats.title")}
                      </span>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {challengers.length}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {t("stats.challengers")}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {challengers.filter((c) => c.completedAt).length}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {t("stats.completed")}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {challengers.length > 0
                              ? `${Math.round((challengers.filter((c) => c.completedAt).length / challengers.length) * 100)}%`
                              : "0%"}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {t("stats.completionRate")}
                          </span>
                        </div>
                      </div>
                      {items.length > 0 &&
                        challengers.length > 0 &&
                        (() => {
                          const itemCompletionRates = items.map((item) => {
                            const doneCount = challengers.filter(
                              (c) => c.doneCount > 0 && c.totalItems > 0
                            ).length;
                            return { item, approxRate: doneCount };
                          });
                          const avgProgress =
                            challengers.length > 0
                              ? Math.round(
                                  (challengers.reduce(
                                    (sum, c) =>
                                      sum +
                                      (c.totalItems > 0
                                        ? c.doneCount / c.totalItems
                                        : 0),
                                    0
                                  ) /
                                    challengers.length) *
                                    100
                                )
                              : 0;
                          void itemCompletionRates;
                          return (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {t("stats.avgProgress")}
                              </span>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-300"
                                  style={{ width: `${avgProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                {avgProgress}%
                              </span>
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </div>
              )}

              {!listLoading && progress > 0 && (
                <div className="mt-3 h-0.5 bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-full">
                  <div
                    className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {!itemsLoading && items.length > 0 && (
                <div className="mt-3 -mx-5">
                  <div className="flex flex-wrap gap-1.5 px-5 pb-0.5">
                    {(["pending", "done"] as const).map((s) => (
                      <button
                        type="button"
                        key={s}
                        data-testid={`status-filter-${s}`}
                        onClick={() =>
                          setStatusFilter(statusFilter === s ? "all" : s)
                        }
                        className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                          statusFilter === s
                            ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        {s === "pending"
                          ? t("list.filterPending")
                          : t("list.filterDone")}
                      </button>
                    ))}
                    {allTags.length > 0 && (
                      <div className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />
                    )}
                    {allTags.map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        data-testid={`tag-filter-${tag}`}
                        onClick={() =>
                          setActiveTag(activeTag === tag ? null : tag)
                        }
                        className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                          activeTag === tag
                            ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                            : tagColor(tag)
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                    {allPlaces.length > 0 && (
                      <div className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />
                    )}
                    {allPlaces.map((place) => (
                      <button
                        type="button"
                        key={place}
                        data-testid={`place-filter-${place}`}
                        onClick={() =>
                          setActivePlace(
                            activePlace === place ? undefined : place
                          )
                        }
                        className={`cursor-pointer shrink-0 inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                          activePlace === place
                            ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          className="w-2.5 h-2.5 shrink-0"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.007 3.864-5.175 3.864-9.15C20.15 5.413 16.415 2 12 2 7.585 2 3.85 5.413 3.85 10.174c0 3.975 1.92 7.143 3.864 9.15a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {place}
                      </button>
                    ))}
                  </div>
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
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <svg
                    aria-hidden="true"
                    className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") closeSearch();
                    }}
                    placeholder={t("list.searchPlaceholder")}
                    aria-label={t("list.searchAriaLabel")}
                    data-testid="search-input"
                    className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
                  />
                  {searchQuery && (
                    <span className="text-xs text-gray-400 tabular-nums shrink-0">
                      {t("list.results", {
                        count: filteredItems.length,
                      })}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={t("list.closeSearch")}
                    onClick={closeSearch}
                    data-testid="search-close"
                    className="cursor-pointer text-gray-300 hover:text-gray-500 transition"
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
                </div>
              </div>
            )}

            {viewMode === "map" && hasGeoItems && (
              <div className="relative" style={{ height: "400px" }}>
                <ListMap items={filteredItems} />
              </div>
            )}

            <div
              ref={pullRef}
              className={`flex-1 overflow-y-auto overscroll-y-contain px-3 py-1 ${viewMode === "map" ? "hidden" : ""}`}
            >
              {itemsLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 4 }, (_, i) => i).map((i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                      </div>
                      <div
                        className="flex-1 h-4 rounded-md bg-gray-200 animate-pulse"
                        style={{
                          width: `${55 + ((i * 13) % 35)}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">
                  {searchQuery
                    ? t("list.noResults", {
                        query: searchQuery,
                      })
                    : items.length === 0
                      ? t("list.addFirst")
                      : t("list.noItemsFilter")}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem.mutate(item.id)}
                      onDelete={() => deleteItem.mutate(item.id)}
                      onEdit={(text, coords) =>
                        updateItem.mutate({
                          id: item.id,
                          text,
                          coords,
                        })
                      }
                      onTagClick={(tag) =>
                        setActiveTag(activeTag === tag ? null : tag)
                      }
                      activeTag={activeTag}
                      onPlaceClick={(place) =>
                        setActivePlace(
                          activePlace === place ? undefined : place
                        )
                      }
                      activePlace={activePlace}
                      canWrite={canWrite}
                      canToggle={canToggle}
                      onDragStart={
                        isOwner && !item.done
                          ? handleDragStart(item.id)
                          : undefined
                      }
                      onDragOver={
                        isOwner && !item.done
                          ? handleDragOver(item.id)
                          : undefined
                      }
                      onDrop={
                        isOwner && !item.done ? handleDrop(item.id) : undefined
                      }
                      onDragEnd={
                        isOwner && !item.done ? handleDragEnd : undefined
                      }
                      isDragOver={dragOverId === item.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {canWrite && (
              <div className="relative shrink-0 px-4 pt-3 pb-6 space-y-2">
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
                              setNewItem((prev) =>
                                prev.replace(/#([a-zA-ZÀ-ÿ\w-]*)$/, `#${tag} `)
                              );
                              addInputRef.current?.focus();
                            }}
                            className={`cursor-pointer inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition active:scale-[0.96] ${tagColor(tag)}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    {placeSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {placeSuggestions.map((place) => (
                          <button
                            key={place}
                            type="button"
                            onClick={() => {
                              setNewItem((prev) =>
                                prev.replace(
                                  PARTIAL_PLACE_REGEX,
                                  `@${place} `
                                )
                              );
                              setPlaceDropdownOpen(false);
                              addInputRef.current?.focus();
                            }}
                            className="cursor-pointer inline-flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition active:scale-[0.96]"
                          >
                            <svg
                              aria-hidden="true"
                              className="w-2.5 h-2.5 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                fillRule="evenodd"
                                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.007 3.864-5.175 3.864-9.15C20.15 5.413 16.415 2 12 2 7.585 2 3.85 5.413 3.85 10.174c0 3.975 1.92 7.143 3.864 9.15a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {place}
                          </button>
                        ))}
                      </div>
                    )}
                    {placeDropdownOpen &&
                      partialPlace !== null &&
                      partialPlace.length >= 3 && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden z-10">
                          {geocodingLoading && (
                            <div className="px-3 py-2 text-xs text-gray-400">
                              {t("list.addPlace")}…
                            </div>
                          )}
                          {!geocodingLoading &&
                            geocodingResults.length === 0 && (
                              <div className="px-3 py-2 text-xs text-gray-400">
                                {t("list.noResults", { query: partialPlace })}
                              </div>
                            )}
                          {geocodingResults.map((result) => (
                            <button
                              key={`${result.latitude}-${result.longitude}`}
                              type="button"
                              onClick={() => {
                                setNewItem((prev) =>
                                  prev.replace(
                                    PARTIAL_PLACE_REGEX,
                                    `@${result.name} `
                                  )
                                );
                                setPendingCoords({
                                  latitude: result.latitude,
                                  longitude: result.longitude,
                                  placeName: result.name,
                                });
                                setPlaceDropdownOpen(false);
                                addInputRef.current?.focus();
                              }}
                              className="cursor-pointer w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b last:border-0 border-gray-100 dark:border-gray-700"
                            >
                              <svg
                                aria-hidden="true"
                                className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.007 3.864-5.175 3.864-9.15C20.15 5.413 16.415 2 12 2 7.585 2 3.85 5.413 3.85 10.174c0 3.975 1.92 7.143 3.864 9.15a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {result.name}
                                </div>
                                {(result.city || result.country) && (
                                  <div className="text-xs text-gray-400 truncate">
                                    {[result.city, result.country]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    <form
                      onSubmit={handleAdd}
                      className="flex gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl"
                    >
                      <input
                        ref={addInputRef}
                        value={newItem}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewItem(val);
                          const hasAt = PARTIAL_PLACE_REGEX.test(val);
                          setPlaceDropdownOpen(hasAt);
                          if (!hasAt) setPendingCoords(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape" && placeDropdownOpen) {
                            e.preventDefault();
                            setNewItem((v) =>
                              v
                                .replace(PARTIAL_PLACE_REGEX, "")
                                .trimEnd()
                            );
                            setPlaceDropdownOpen(false);
                          }
                        }}
                        onPaste={handlePaste}
                        placeholder={t("list.addItemPlaceholder")}
                        aria-label={t("list.addItemAriaLabel")}
                        data-testid="add-item-input"
                        className="flex-1 pl-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newItem.trim() || addItem.isPending}
                        data-testid="add-item-submit"
                        className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
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
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />
    </>
  );
}
