import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import type { List } from "@/db/schema/lists.schema";

type MyList = List & {
  itemCount: number;
  doneCount: number;
  participantCount: number;
};

import { useCreateList, useDeleteList, useMyLists } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/lists/")({
  component: MyListsPage,
});

function MyListRow({
  list,
  userId,
}: {
  list: MyList;
  userId: string | null | undefined;
}) {
  const [confirming, setConfirming] = useState(false);
  const deleteList = useDeleteList();
  const { t } = useTranslation();
  const isOwner = !list.ownerId || list.ownerId === userId;

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 py-4 border-b border-black/[0.08] dark:border-white/[0.08]"
        data-testid="my-list-card"
      >
        <span className="flex-1 text-sm text-gray-500 truncate">
          {isOwner
            ? t("myLists.deleteConfirm", { name: list.name })
            : t("myLists.leaveConfirm", { name: list.name })}
        </span>
        <button
          type="button"
          data-testid="delete-cancel-btn"
          onClick={() => setConfirming(false)}
          className="cursor-pointer px-3 py-1.5 text-xs text-gray-500 rounded-lg transition-colors duration-150 border border-black/[0.20] dark:border-white/[0.20]"
        >
          {t("myLists.deleteNo")}
        </button>
        <button
          type="button"
          data-testid="delete-confirm-btn"
          onClick={() => deleteList.mutate(list.id)}
          disabled={deleteList.isPending}
          className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-[#f8f7f5] bg-[#0c0c0b] rounded-lg disabled:opacity-50 transition-opacity duration-150"
        >
          {isOwner ? t("myLists.deleteYes") : t("myLists.leaveYes")}
        </button>
      </div>
    );
  }

  return (
    <div
      className="group relative py-4.5 border-b border-black/[0.08] dark:border-white/[0.08]"
      data-testid="my-list-card"
    >
      <Link
        to="/lists/$listId"
        params={{ listId: list.slug ?? list.id }}
        className="block"
      >
        <p
          className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8] mb-1.5 leading-snug tracking-[-0.01em]"
          style={{ paddingRight: "2rem" }}
        >
          {list.name}
        </p>
        {list.description && (
          <p
            className="text-xs leading-[1.6] mb-2.5 text-gray-500 dark:text-[#6b6b67]"
            style={{ maxWidth: 480 }}
          >
            {list.description}
          </p>
        )}
        {list.itemCount > 0 && list.doneCount > 0 && (
          <div className="h-0.5 mb-2.5 overflow-hidden w-full rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#0c0c0b] dark:bg-[#f0ede8]"
              style={{
                width: `${Math.round((list.doneCount / list.itemCount) * 100)}%`,
                transition: "width 600ms cubic-bezier(0.2, 0, 0, 1)",
              }}
            />
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5">
            {list.public && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#a0a09c",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {t("myLists.public")}
              </span>
            )}
            {list.collaborative && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#a0a09c",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.04em",
                }}
              >
                {t("myLists.collaborative")}
              </span>
            )}
          </div>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "#a0a09c" }}
          >
            {list.itemCount} {list.itemCount === 1 ? "item" : "items"}
            {list.participantCount > 0 &&
              ` · ${list.participantCount} ${list.participantCount === 1 ? "participante" : "participantes"}`}
          </span>
        </div>
      </Link>
      <button
        type="button"
        data-testid="delete-list-btn"
        aria-label={
          isOwner
            ? t("myLists.deleteList", { name: list.name })
            : t("myLists.leaveList", { name: list.name })
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setConfirming(true);
        }}
        className="absolute top-4 right-0 cursor-pointer h-7 w-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-500 transition-all duration-150 opacity-0 group-hover:opacity-100"
      >
        {isOwner ? (
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        )}
      </button>
    </div>
  );
}

function CreateListInline({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const createList = useCreateList();
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed)
      createList.mutate(trimmed, {
        onSuccess: (list) =>
          navigate({
            to: "/lists/$listId",
            params: { listId: list.id },
          }),
      });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex overflow-hidden rounded-lg border border-black/[0.20] dark:border-white/[0.20] bg-black/[0.03] dark:bg-white/[0.03]"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("myLists.newListPlaceholder")}
        aria-label={t("myLists.newListAriaLabel")}
        data-testid="new-list-name-input"
        className="flex-1 px-4 py-2.5 text-sm text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] bg-transparent outline-none min-w-0"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <button
        type="button"
        aria-label={t("myLists.cancelCreate")}
        onClick={onClose}
        className="cursor-pointer px-3 py-2.5 text-sm text-gray-500 hover:text-[#0c0c0b] transition-colors bg-transparent border-none"
      >
        ✕
      </button>
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="new-list-create-btn"
        className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-[0.04em] bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] border-none disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-150 shrink-0"
        style={{ borderRadius: 0 }}
      >
        {createList.isPending ? "…" : t("myLists.createList")}
      </button>
    </form>
  );
}

type SortOption = "recent" | "created_desc" | "created_asc";
type VisibilityFilter = "all" | "public" | "private";

function FilterChip({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`cursor-pointer px-3 py-1 rounded-full text-xs transition-all duration-150 whitespace-nowrap shrink-0 border ${
        active
          ? "border-black/[0.20] dark:border-white/[0.20] bg-black/[0.12] dark:bg-white/[0.12] text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
          : "border-black/[0.08] dark:border-white/[0.08] text-gray-500 font-normal hover:border-black/[0.20] dark:hover:border-white/[0.20] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
      }`}
    >
      {label}
    </button>
  );
}

function MyListsPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMyLists(search || undefined, sort, visibility);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recent", label: t("myLists.sortRecent") },
    { value: "created_desc", label: t("myLists.sortNewest") },
    { value: "created_asc", label: t("myLists.sortOldest") },
  ];

  const VISIBILITY_OPTIONS: { value: VisibilityFilter; label: string }[] = [
    { value: "all", label: t("myLists.filterAll") },
    { value: "public", label: t("myLists.filterPublic") },
    { value: "private", label: t("myLists.filterPrivate") },
  ];

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const lists = data?.pages.flatMap((p) => p.items) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
  }

  return (
    <div className="min-h-dvh bg-[#f8f7f5] dark:bg-[#0c0c0b] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10">
        <div className="mb-7">
          {creating ? (
            <CreateListInline onClose={() => setCreating(false)} />
          ) : (
            <div className="flex gap-2">
              <form
                onSubmit={handleSearch}
                className="flex-1 flex overflow-hidden rounded-lg transition-all duration-200 border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] focus-within:border-black/[0.20] dark:focus-within:border-white/[0.20] focus-within:bg-black/[0.06] dark:focus-within:bg-white/[0.06]"
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("myLists.searchPlaceholder")}
                  aria-label={t("myLists.searchAriaLabel")}
                  data-testid="my-lists-search-input"
                  className="flex-1 px-4 py-2.5 text-sm text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] bg-transparent outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold tracking-[0.04em] bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] border-none cursor-pointer transition-opacity duration-150"
                  style={{ borderRadius: 0 }}
                >
                  {t("myLists.search")}
                </button>
              </form>
              <button
                type="button"
                data-testid="new-list-btn"
                onClick={() => setCreating(true)}
                className="cursor-pointer flex items-center justify-center rounded-lg text-gray-500 hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150 shrink-0 w-9 self-stretch text-lg border border-black/[0.08] dark:border-white/[0.08] bg-transparent"
                aria-label={t("myLists.newList")}
              >
                +
              </button>
            </div>
          )}

          {/* Filter toggle row */}
          {(() => {
            const hasNonDefault = sort !== "recent" || visibility !== "all";
            const activeSortLabel = SORT_OPTIONS.find(
              (o) => o.value === sort
            )?.label;
            const activeVisibilityLabel =
              visibility !== "all"
                ? VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label
                : undefined;
            return (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-testid="filter-toggle"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-150 whitespace-nowrap shrink-0 ${
                    hasNonDefault
                      ? "border-black/[0.20] dark:border-white/[0.20] bg-black/[0.12] dark:bg-white/[0.12] text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
                      : "border-black/[0.08] dark:border-white/[0.08] text-gray-500 font-normal hover:border-black/[0.20] dark:hover:border-white/[0.20] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <svg
                    aria-hidden="true"
                    className="w-2.5 h-2.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 4h18M7 9h10M11 14h2"
                    />
                  </svg>
                  Filters
                  {hasNonDefault && (
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-black/[0.15] dark:bg-white/[0.15] text-[10px] font-bold leading-none">
                      {(sort !== "recent" ? 1 : 0) +
                        (visibility !== "all" ? 1 : 0)}
                    </span>
                  )}
                  <svg
                    aria-hidden="true"
                    className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Active filter summary (collapsed) */}
                {!filtersOpen && hasNonDefault && (
                  <div className="flex items-center gap-1.5">
                    {sort !== "recent" && (
                      <button
                        type="button"
                        onClick={() => setSort("recent")}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2 py-0.5 text-xs text-gray-500 hover:border-black/[0.25] hover:text-gray-700 transition"
                      >
                        {activeSortLabel}
                        <span
                          aria-hidden
                          className="text-gray-300 dark:text-gray-600 leading-none"
                        >
                          ×
                        </span>
                      </button>
                    )}
                    {visibility !== "all" && (
                      <button
                        type="button"
                        onClick={() => setVisibility("all")}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2 py-0.5 text-xs text-gray-500 hover:border-black/[0.25] hover:text-gray-700 transition"
                      >
                        {activeVisibilityLabel}
                        <span
                          aria-hidden
                          className="text-gray-300 dark:text-gray-600 leading-none"
                        >
                          ×
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Expanded filter panel */}
          {filtersOpen && (
            <div
              className="mt-2 flex flex-col gap-2"
              data-testid="sort-options"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0">
                  Sort
                </span>
                {SORT_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={sort === opt.value}
                    onClick={() => setSort(opt.value)}
                    testId={`sort-${opt.value}`}
                  />
                ))}
              </div>
              <div
                className="flex items-center gap-1.5 flex-wrap"
                data-testid="visibility-filter"
              >
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0">
                  Show
                </span>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={visibility === opt.value}
                    onClick={() => setVisibility(opt.value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col">
            {Array.from({ length: 6 }, (_, i) => i).map((i) => (
              <div
                key={`skeleton-${i}`}
                className="py-4.5 px-3 -mx-3 border-b border-black/[0.08] dark:border-white/[0.08] animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="h-3.5 w-2/3 rounded bg-black/[0.06] dark:bg-white/[0.06] mb-2.5" />
                <div className="h-px w-full rounded bg-black/[0.06] dark:bg-white/[0.06] mb-2.5" />
                <div className="h-2.5 w-1/4 rounded bg-black/[0.04] dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && lists.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="text-2xl select-none" aria-hidden>
              {search ? "🔍" : "✦"}
            </span>
            <p
              className="text-sm text-gray-500"
              style={{ textWrap: "balance" }}
            >
              {search ? t("myLists.noListsSearch") : t("myLists.noLists")}
            </p>
          </div>
        )}
        {!isLoading && lists.length > 0 && (
          <div>
            {lists.map((list) => (
              <MyListRow key={list.id} list={list} userId={userId} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <p className="text-xs text-gray-500 text-center py-4">
            {t("myLists.loading")}
          </p>
        )}
      </main>
    </div>
  );
}
