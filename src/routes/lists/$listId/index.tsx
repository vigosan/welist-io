import { useSession } from "@hono/auth-js/react";
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { AppNav } from "@/components/AppNav";
import { CommandPalette } from "@/components/CommandPalette";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddItemForm } from "@/components/items/AddItemForm";
import { ItemRow } from "@/components/items/ItemRow";
import { ListSettingsPanel } from "@/components/ListSettingsPanel";
import { ActiveParticipants } from "@/components/lists/ActiveParticipants";
import { ListDropdownMenu } from "@/components/lists/ListDropdownMenu";
import { ListFilterBar } from "@/components/lists/ListFilterBar";
import { ListSearchBar } from "@/components/lists/ListSearchBar";
import { ListSettingsChip } from "@/components/lists/ListSettingsChip";
import { ListStatsCard } from "@/components/lists/ListStatsCard";
import { ListViewChip } from "@/components/lists/ListViewChip";
import { ParticipantsPanel } from "@/components/lists/ParticipantsPanel";
import { SignInNudge } from "@/components/SignInNudge";

const ListMap = lazy(() =>
  import("@/components/maps/ListMap").then((m) => ({ default: m.ListMap }))
);

import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useItemDragAndDrop } from "@/hooks/useItemDragAndDrop";
import {
  useDeleteItem,
  useItems,
  useReorderItems,
  useToggleItem,
  useToggleItemLike,
  useUpdateItem,
} from "@/hooks/useItems";
import { useItemsFilter } from "@/hooks/useItemsFilter";
import {
  useActiveParticipants,
  useCollaborators,
  useDeleteList,
  useToggleCollaborative,
} from "@/hooks/useList";
import { useListHeader } from "@/hooks/useListHeader";
import { useListRealtime } from "@/hooks/useListRealtime";
import { useTranslation } from "@/i18n/service";

const fireConfetti = () =>
  import("@/lib/confetti").then((m) => m.fireConfetti());

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(false);
  const [activePlace, setActivePlace] = useState<string | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(
    null
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const openSearch = useCallback(() => {
    setSearchActive(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  function pickRandomItem() {
    const pending = filteredItems.filter((i) => !i.done);
    if (!pending.length) return;
    const item = pending[Math.floor(Math.random() * pending.length)];
    setHighlightedItemId(item.id);
    setTimeout(() => setHighlightedItemId(null), 2500);
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-testid="item-row-${item.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function closeSearch() {
    setSearchActive(false);
    setSearchQuery("");
  }

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleExport() {
    const text = items.map((i) => i.text).join("\n");
    navigator.clipboard.writeText(text);
    setMenuOpen(false);
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

  const handleTagClick = useCallback(
    (tag: string) =>
      navigate({
        search: (prev) => ({
          ...prev,
          tag: prev.tag === tag ? undefined : tag,
        }),
        replace: true,
      }),
    [navigate]
  );

  const toggleCollaborative = useToggleCollaborative(listId);
  const { data: session } = useSession();

  const {
    list,
    listLoading,
    listError,
    editingName,
    setEditingName,
    nameValue,
    setNameValue,
    updateName,
    editingDescription,
    setEditingDescription,
    descriptionValue,
    setDescriptionValue,
    updateDescription,
    copied,
    handleShare,
    togglePublic,
  } = useListHeader({ listId });

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
  const { data: activeParticipantsData } = useActiveParticipants(listId);

  const { data: items = [], isLoading: itemsLoading } = useItems(listId);

  useListRealtime(listId, !!list);

  const showSignInNudge =
    !session?.user && list?.ownerId === null && items.length >= 1;

  const { allTags, allPlaces, filteredItems, resetOrder, setOrder } =
    useItemsFilter({
      items,
      itemsLoading,
      statusFilter,
      activeTag,
      activePlace,
      searchQuery,
    });

  const { paletteOpen, setPaletteOpen, paletteActions } = useCommandPalette({
    list,
    allTags,
    allPlaces,
    activeTag,
    activePlace,
    statusFilter,
    viewMode,
    isOwner,
    addInputRef,
    handleShare,
    handleExport,
    pickRandomItem,
    setActiveTag,
    setActivePlace,
    setStatusFilter,
    setViewMode,
    setNameValue,
    setEditingName,
    togglePublicMutate: (v) => togglePublic.mutate(v),
    toggleCollaborativeMutate: (v) => toggleCollaborative.mutate(v),
    onDelete: () => setConfirmDelete(true),
    onSearch: openSearch,
  });

  const toggleItem = useToggleItem(listId);
  const toggleItemLike = useToggleItemLike(listId);
  const deleteItem = useDeleteItem(listId);
  const updateItem = useUpdateItem(listId);
  const reorderItems = useReorderItems(listId);
  const deleteList = useDeleteList();

  const {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useItemDragAndDrop({
    itemIds: filteredItems.map((i) => i.id),
    onReorder: (ids) => {
      setOrder(ids);
      reorderItems.mutate(ids, { onError: () => resetOrder() });
    },
  });

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

  return (
    <>
      <div className="h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        {showSignInNudge && (
          <div className="w-full sm:max-w-3xl mx-auto px-5 sm:px-6 pt-4">
            <SignInNudge storageKey={listId} />
          </div>
        )}
        <div className="flex-1 flex flex-col sm:items-center sm:p-6">
          <div className="flex-1 flex flex-col w-full sm:max-w-3xl bg-white dark:bg-gray-900 sm:rounded-3xl sm:border sm:border-gray-100 dark:sm:border-gray-800 [overflow:clip] sm:max-h-[calc(100dvh-3.25rem-3rem)]">
            <div className="px-5 pt-5 pb-4 shrink-0 flex flex-col">
              <div
                className="flex items-center justify-between order-1"
                ref={menuRef}
              >
                <Link
                  to="/lists"
                  className="cursor-pointer text-sm text-gray-500 dark:text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150 w-fit"
                >
                  {t("list.back")}
                </Link>
                <div className="relative flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    data-testid="list-menu-btn"
                    aria-label={t("list.menuAriaLabel")}
                    className={`cursor-pointer h-7 w-7 flex items-center justify-center rounded-md border transition active:scale-[0.96] ${menuOpen ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700"}`}
                  >
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <circle cx="4" cy="10" r="1.5" />
                      <circle cx="10" cy="10" r="1.5" />
                      <circle cx="16" cy="10" r="1.5" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <ListDropdownMenu
                      searchActive={searchActive}
                      hasGeoItems={hasGeoItems}
                      viewMode={viewMode}
                      hasPendingItems={filteredItems.some((i) => !i.done)}
                      copied={copied}
                      isOwner={isOwner}
                      onOpenSearch={openSearch}
                      onToggleViewMode={() =>
                        setViewMode((v) => (v === "list" ? "map" : "list"))
                      }
                      onPickRandom={pickRandomItem}
                      onOpenPalette={() => setPaletteOpen(true)}
                      onShare={handleShare}
                      onExport={handleExport}
                      onToggleSettings={() => setSettingsOpen((v) => !v)}
                      onDelete={() => setConfirmDelete(true)}
                      onClose={() => setMenuOpen(false)}
                    />
                  )}
                </div>
              </div>
              <div className="mt-4 order-2">
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
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight cursor-default"
                    style={{ textWrap: "balance" }}
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
                <div className="mt-3 order-5">
                  {isOwner ? (
                    editingDescription ? (
                      <textarea
                        autoFocus
                        aria-label={t("list.addDescriptionPlaceholder")}
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
                            <span className="text-gray-500">
                              {list.description}
                            </span>
                          ) : (
                            <span className="text-gray-300 hover:text-gray-400">
                              {t("list.addDescriptionPlaceholder")}
                            </span>
                          )}
                        </button>
                      </div>
                    )
                  ) : (
                    <div>
                      <span className="text-sm text-gray-500 leading-relaxed">
                        {list?.description}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!listLoading &&
                ((activeParticipantsData && activeParticipantsData.total > 0) ||
                  isParticipant) && (
                  <div className="flex items-center gap-2 mt-2 order-3 min-w-0 flex-1">
                    {activeParticipantsData &&
                      activeParticipantsData.total > 0 && (
                        <ActiveParticipants
                          participants={activeParticipantsData.participants}
                          total={activeParticipantsData.total}
                          onClick={
                            isOwner &&
                            (challengers.length > 0 || collaborators.length > 0)
                              ? () => setParticipantsPanelOpen((open) => !open)
                              : undefined
                          }
                        />
                      )}

                    {isParticipant && (
                      <>
                        {activeParticipantsData &&
                          activeParticipantsData.total > 0 && (
                            <span className="text-gray-200 text-xs shrink-0">
                              ·
                            </span>
                          )}
                        <span className="text-xs text-gray-400 shrink-0">
                          {list?.participationCompletedAt
                            ? t("list.challengeCompleted")
                            : t("list.challengeInProgress")}
                        </span>
                      </>
                    )}
                  </div>
                )}

              {!listLoading && isOwner && participantsPanelOpen && (
                <ParticipantsPanel
                  challengers={challengers}
                  collaborators={collaborators}
                />
              )}

              {!listLoading && isOwner && settingsOpen && (
                <div className="mt-3 flex flex-col gap-2 order-7">
                  <ListSettingsPanel
                    listId={list?.id ?? listId}
                    onClose={() => setSettingsOpen(false)}
                    onSlugUpdated={(updated) =>
                      navigate({
                        to: "/lists/$listId",
                        params: { listId: updated.slug ?? updated.id },
                      })
                    }
                  />
                  <ListStatsCard
                    challengers={challengers}
                    itemCount={items.length}
                  />
                </div>
              )}

              {!listLoading && items.length > 0 && (
                <div className="mt-2 h-0.5 bg-gray-100 dark:bg-gray-700 overflow-hidden rounded-full order-4">
                  <div
                    className="h-full bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {!itemsLoading && (items.length > 0 || isOwner) && (
                <ListFilterBar
                  statusFilter={statusFilter}
                  activeTag={activeTag}
                  activePlace={activePlace}
                  allTags={allTags}
                  allPlaces={allPlaces}
                  onStatusFilter={setStatusFilter}
                  onTagFilter={setActiveTag}
                  onPlaceFilter={setActivePlace}
                  trailingSlot={
                    <>
                      {isOwner && (
                        <ListSettingsChip
                          active={settingsOpen}
                          onToggle={() => setSettingsOpen((v) => !v)}
                        />
                      )}
                      <ListViewChip
                        viewMode={viewMode}
                        onChange={setViewMode}
                      />
                    </>
                  }
                />
              )}
            </div>

            {searchActive && (
              <ListSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onClose={closeSearch}
                resultCount={filteredItems.length}
                inputRef={searchInputRef}
              />
            )}

            {viewMode === "map" && hasGeoItems && (
              <div className="relative" style={{ height: "400px" }}>
                <Suspense
                  fallback={
                    <div className="h-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                  }
                >
                  <ListMap items={items} activeItems={filteredItems} />
                </Suspense>
              </div>
            )}
            {viewMode === "map" && !hasGeoItems && (
              <div
                data-testid="map-empty-state"
                className="mx-3 my-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6 py-10 text-center"
              >
                <svg
                  aria-hidden="true"
                  className="w-8 h-8 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t("list.mapEmptyTitle")}
                </div>
                <p className="max-w-sm text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t("list.mapEmptyHint")}
                </p>
              </div>
            )}

            <div
              className={`flex-1 overflow-y-auto px-3 py-1 ${viewMode === "map" ? "hidden" : ""}`}
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
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <span className="text-2xl select-none" aria-hidden>
                    {searchQuery ? "🔍" : items.length === 0 ? "✦" : "◎"}
                  </span>
                  <p
                    className="text-sm text-gray-400"
                    style={{ textWrap: "balance" }}
                  >
                    {searchQuery
                      ? t("list.noResults", { query: searchQuery })
                      : items.length === 0
                        ? t("list.addFirst")
                        : t("list.noItemsFilter")}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        animationName: "fadeInUp",
                        animationDuration: "240ms",
                        animationTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
                        animationFillMode: "both",
                        animationDelay: `${Math.min(idx * 40, 400)}ms`,
                      }}
                    >
                      <ItemRow
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
                        onTagClick={handleTagClick}
                        activeTag={activeTag}
                        caps={{
                          canWrite,
                          canToggle,
                          canLike: !!session?.user?.id,
                        }}
                        onLike={
                          session?.user?.id
                            ? () => toggleItemLike.mutate(item.id)
                            : undefined
                        }
                        highlighted={item.id === highlightedItemId}
                        dragHandlers={
                          isOwner && !item.done
                            ? {
                                onDragStart: handleDragStart(item.id),
                                onDragOver: handleDragOver(item.id),
                                onDrop: handleDrop(item.id),
                                onDragEnd: handleDragEnd,
                              }
                            : undefined
                        }
                        isDragOver={dragOverId === item.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canWrite && (
              <AddItemForm
                listId={listId}
                allTags={allTags}
                allPlaces={allPlaces}
                addInputRef={addInputRef}
              />
            )}
          </div>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("list.deleteConfirm", { name: list?.name ?? "" })}
        confirmLabel={t("list.deleteYes")}
        cancelLabel={t("list.deleteNo")}
        onConfirm={() => {
          if (!list) return;
          deleteList.mutate(list.id, {
            onSuccess: () => navigate({ to: "/lists" }),
          });
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
