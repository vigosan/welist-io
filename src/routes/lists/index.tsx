import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import type { List } from "@/db/schema/lists.schema";

type MyList = List & {
  itemCount: number;
  doneCount: number;
  participantCount: number;
};

import { Chip, ListCard, Progress } from "@/components/ui";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  useCreateList,
  useDeleteList,
  useMyLists,
  useStreak,
} from "@/hooks/useList";
import { useSearchInput } from "@/hooks/useSearchInput";
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
        className="flex items-center gap-2 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4"
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
          className="cursor-pointer px-3 py-1.5 text-xs font-semibold text-canvas bg-ink rounded-lg disabled:opacity-50 transition-opacity duration-150"
        >
          {isOwner ? t("myLists.deleteYes") : t("myLists.leaveYes")}
        </button>
      </div>
    );
  }

  return (
    <ListCard
      data-testid="my-list-card"
      eyebrow={
        list.public || list.collaborative ? (
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {[
              list.public ? t("myLists.public") : null,
              list.collaborative ? t("myLists.collaborative") : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : undefined
      }
      title={
        <Link
          to="/lists/$listId"
          params={{ listId: list.slug ?? list.id }}
          className="text-inherit no-underline transition-opacity hover:opacity-70 before:absolute before:inset-0 before:content-['']"
        >
          {list.name}
        </Link>
      }
      description={list.description || undefined}
      progress={
        list.itemCount > 0 ? (
          <div data-testid="list-progress">
            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums text-muted">
              <span>
                {list.doneCount}/{list.itemCount}
              </span>
              <span>
                {list.doneCount >= list.itemCount
                  ? t("myLists.progressComplete")
                  : t("myLists.progressPending", {
                      count: list.itemCount - list.doneCount,
                    })}
              </span>
            </div>
            <Progress
              value={Math.round((list.doneCount / list.itemCount) * 100)}
              barTestId="list-progress-bar"
            />
          </div>
        ) : undefined
      }
      footerLeft={
        <p className="text-[11px] tabular-nums text-muted">
          {t("myLists.itemCount", { count: list.itemCount })}
          {list.participantCount > 0 &&
            ` · ${t("myLists.participantCount", { count: list.participantCount })}`}
        </p>
      }
      footerRight={
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
          className="relative z-10 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 opacity-0 transition-colors duration-150 hover:text-gray-700 group-hover:opacity-100 focus-visible:opacity-100 dark:hover:text-gray-300"
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
      }
    />
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
        className="flex-1 px-4 py-2.5 text-sm text-ink dark:text-paper placeholder-muted bg-transparent outline-none min-w-0"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <button
        type="button"
        aria-label={t("myLists.cancelCreate")}
        onClick={onClose}
        className="cursor-pointer px-3 py-2.5 text-sm text-gray-500 hover:text-ink transition-colors bg-transparent border-none"
      >
        ✕
      </button>
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="new-list-create-btn"
        className="cursor-pointer px-4 py-2.5 text-xs font-semibold tracking-[0.04em] bg-ink text-canvas dark:bg-paper dark:text-ink border-none disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-150 shrink-0"
        style={{ borderRadius: 0 }}
      >
        {createList.isPending ? "…" : t("myLists.createList")}
      </button>
    </form>
  );
}

type SortOption = "recent" | "created_desc" | "created_asc" | "likes";
type VisibilityFilter = "all" | "public" | "private";
type RoleFilter = "all" | "created" | "participating";

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
    <Chip
      active={active}
      onClick={onClick}
      data-testid={testId}
      className="whitespace-nowrap shrink-0"
    >
      {label}
    </Chip>
  );
}

function MyListsPage() {
  const { q, setQ, search, handleSearch } = useSearchInput();
  const [sort, setSort] = useState<SortOption>("recent");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [role, setRole] = useState<RoleFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMyLists(search || undefined, sort, visibility, role);
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  const { t } = useTranslation();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: streak } = useStreak();

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "recent", label: t("myLists.sortRecent") },
    { value: "created_desc", label: t("myLists.sortNewest") },
    { value: "created_asc", label: t("myLists.sortOldest") },
    { value: "likes", label: t("myLists.sortLikes") },
  ];

  const VISIBILITY_OPTIONS: { value: VisibilityFilter; label: string }[] = [
    { value: "all", label: t("myLists.filterAll") },
    { value: "public", label: t("myLists.filterPublic") },
    { value: "private", label: t("myLists.filterPrivate") },
  ];

  const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
    { value: "all", label: t("myLists.filterAll") },
    { value: "created", label: t("myLists.roleCreated") },
    { value: "participating", label: t("myLists.roleParticipating") },
  ];

  const lists = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10">
        {streak && streak.current > 0 && (
          <div
            data-testid="streak-badge"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/[0.08] px-3 py-1 text-[11px] tabular-nums"
            style={{
              color: "#a0a09c",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {t("myLists.streak", { count: streak.current })}
          </div>
        )}
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
                  className="flex-1 px-4 py-2.5 text-sm text-ink dark:text-paper placeholder-muted bg-transparent outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold tracking-[0.04em] bg-ink text-canvas dark:bg-paper dark:text-ink border-none cursor-pointer transition-opacity duration-150"
                  style={{ borderRadius: 0 }}
                >
                  {t("myLists.search")}
                </button>
              </form>
              <button
                type="button"
                data-testid="new-list-btn"
                onClick={() => setCreating(true)}
                className="cursor-pointer flex items-center justify-center rounded-lg text-gray-500 hover:text-ink dark:hover:text-paper transition-colors duration-150 shrink-0 w-9 self-stretch text-lg border border-black/[0.08] dark:border-white/[0.08] bg-transparent"
                aria-label={t("myLists.newList")}
              >
                +
              </button>
            </div>
          )}

          {/* Filter toggle row */}
          {(() => {
            const hasNonDefault =
              sort !== "recent" || visibility !== "all" || role !== "all";
            const activeSortLabel = SORT_OPTIONS.find(
              (o) => o.value === sort
            )?.label;
            const activeVisibilityLabel =
              visibility !== "all"
                ? VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label
                : undefined;
            const activeRoleLabel =
              role !== "all"
                ? ROLE_OPTIONS.find((o) => o.value === role)?.label
                : undefined;
            return (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  data-testid="filter-toggle"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 whitespace-nowrap shrink-0 active:scale-[0.97] ${
                    hasNonDefault
                      ? "border-ink bg-ink text-canvas dark:border-paper dark:bg-paper dark:text-canvas-dark"
                      : "border-black/[0.08] bg-canvas text-muted hover:border-black/20 hover:text-ink dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-white/20 dark:hover:text-paper"
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
                  {t("myLists.filters")}
                  {hasNonDefault && (
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-black/[0.15] dark:bg-white/[0.15] text-[10px] font-bold leading-none">
                      {(sort !== "recent" ? 1 : 0) +
                        (visibility !== "all" ? 1 : 0) +
                        (role !== "all" ? 1 : 0)}
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
                    {role !== "all" && (
                      <button
                        type="button"
                        onClick={() => setRole("all")}
                        className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2 py-0.5 text-xs text-gray-500 hover:border-black/[0.25] hover:text-gray-700 transition"
                      >
                        {activeRoleLabel}
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
                  {t("myLists.sortLabel")}
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
                  {t("myLists.showLabel")}
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
              <div
                className="flex items-center gap-1.5 flex-wrap"
                data-testid="role-filter"
              >
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0">
                  {t("myLists.typeLabel")}
                </span>
                {ROLE_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    label={opt.label}
                    active={role === opt.value}
                    onClick={() => setRole(opt.value)}
                    testId={`role-${opt.value}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, i) => i).map((i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 animate-pulse"
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
          <div className="flex flex-col gap-3">
            {lists.map((list) => (
              <MyListRow key={list.id} list={list} userId={userId} />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex flex-col gap-3 pt-3">
            {["a", "b", "c"].map((k) => (
              <div
                key={`next-skeleton-${k}`}
                className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 animate-pulse"
              >
                <div className="h-3.5 w-2/3 rounded bg-black/[0.06] dark:bg-white/[0.06] mb-2.5" />
                <div className="h-px w-full rounded bg-black/[0.06] dark:bg-white/[0.06] mb-2.5" />
                <div className="h-2.5 w-1/4 rounded bg-black/[0.04] dark:bg-white/[0.04]" />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
