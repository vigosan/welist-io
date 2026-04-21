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
        <span className="flex-1 text-sm text-[#a0a09c] truncate">
          {isOwner
            ? t("myLists.deleteConfirm", { name: list.name })
            : t("myLists.leaveConfirm", { name: list.name })}
        </span>
        <button
          type="button"
          data-testid="delete-cancel-btn"
          onClick={() => setConfirming(false)}
          className="cursor-pointer px-3 py-1.5 text-xs text-[#a0a09c] rounded-lg transition-colors duration-150 border border-black/[0.20] dark:border-white/[0.20]"
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
      className="group relative py-4.5 px-3 -mx-3 rounded-lg transition-colors duration-150 cursor-pointer border-b border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
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
            className="text-xs leading-[1.6] mb-2.5"
            style={{ color: "#a0a09c", maxWidth: 480 }}
          >
            {list.description}
          </p>
        )}
        {list.itemCount > 0 && (
          <div
            className="h-px mb-2.5 overflow-hidden w-full bg-black/[0.08] dark:bg-white/[0.08]"
          >
            <div
              className="h-full bg-[#0c0c0b] dark:bg-[#f0ede8] transition-all duration-300"
              style={{
                width: `${Math.round((list.doneCount / list.itemCount) * 100)}%`,
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
          <span className="text-[11px]" style={{ color: "#a0a09c" }}>
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
        className="absolute top-4 right-3 cursor-pointer h-7 w-7 flex items-center justify-center rounded-md text-[#d8d5d0] hover:text-[#a0a09c] transition-all duration-150 opacity-0 group-hover:opacity-100"
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
        className="cursor-pointer px-3 py-2.5 text-sm text-[#a0a09c] hover:text-[#0c0c0b] transition-colors bg-transparent border-none"
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
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer px-3 py-1 rounded-full text-xs transition-all duration-150 whitespace-nowrap shrink-0 border ${
        active
          ? "border-black/[0.20] dark:border-white/[0.20] bg-black/[0.12] dark:bg-white/[0.12] text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
          : "border-black/[0.08] dark:border-white/[0.08] text-[#a0a09c] font-normal hover:border-black/[0.20] dark:hover:border-white/[0.20] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
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

      <main className="flex-1 w-full max-w-[760px] mx-auto px-12 py-10">
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
                className="cursor-pointer flex items-center justify-center rounded-lg text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150 shrink-0 w-9 h-9 text-lg border border-black/[0.08] dark:border-white/[0.08] bg-transparent"
                aria-label={t("myLists.newList")}
              >
                +
              </button>
            </div>
          )}

          <div
            className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar"
            data-testid="sort-options"
          >
            {SORT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={sort === opt.value}
                onClick={() => setSort(opt.value)}
              />
            ))}
            <div
              className="w-px h-3.5 shrink-0 mx-0.5 bg-black/[0.08] dark:bg-white/[0.08]"
            />
            <div
              className="flex gap-1.5 shrink-0"
              data-testid="visibility-filter"
            >
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
        </div>

        {isLoading && (
          <div className="flex flex-col">
            {Array.from({ length: 6 }, (_, i) => i).map((i) => (
              <div
                key={`skeleton-${i}`}
                className="h-16 animate-pulse border-b border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02]"
              />
            ))}
          </div>
        )}
        {!isLoading && lists.length === 0 && (
          <p className="text-xs text-[#a0a09c] py-10 text-center">
            {search ? t("myLists.noListsSearch") : t("myLists.noLists")}
          </p>
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
          <p className="text-xs text-[#a0a09c] text-center py-4">
            {t("myLists.loading")}
          </p>
        )}
      </main>
    </div>
  );
}
