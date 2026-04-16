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

function MyListCard({ list }: { list: MyList }) {
  const [confirming, setConfirming] = useState(false);
  const deleteList = useDeleteList();
  const { t } = useTranslation();

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3"
        data-testid="my-list-card"
      >
        <span className="flex-1 text-sm text-gray-500 truncate">
          {t("myLists.deleteConfirm", { name: list.name })}
        </span>
        <button
          type="button"
          data-testid="delete-cancel-btn"
          onClick={() => setConfirming(false)}
          className="cursor-pointer px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-[border-color,color,transform] duration-150 active:scale-[0.96]"
        >
          {t("myLists.deleteNo")}
        </button>
        <button
          type="button"
          data-testid="delete-confirm-btn"
          onClick={() => deleteList.mutate(list.id)}
          disabled={deleteList.isPending}
          className="cursor-pointer px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-[background-color,transform] duration-150 active:scale-[0.96]"
        >
          {t("myLists.deleteYes")}
        </button>
      </div>
    );
  }

  return (
    <Link
      to="/lists/$listId"
      params={{ listId: list.slug ?? list.id }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-300 transition-[border-color,transform] duration-150 active:scale-[0.99]"
      data-testid="my-list-card"
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 leading-snug">
              {list.name}
            </p>
            {list.description && (
              <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">
                {list.description}
              </p>
            )}
          </div>
          <button
            type="button"
            data-testid="delete-list-btn"
            aria-label={t("myLists.deleteList", {
              name: list.name,
            })}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setConfirming(true);
            }}
            className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 transition-colors active:scale-[0.96] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
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
          </button>
        </div>

        {list.itemCount > 0 && (
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-900 rounded-full transition-all duration-300"
              style={{
                width: `${Math.round((list.doneCount / list.itemCount) * 100)}%`,
              }}
            />
          </div>
        )}

        <div className="flex items-center gap-1.5">
          {list.public && (
            <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
              {t("myLists.public")}
            </span>
          )}
          {list.collaborative && (
            <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">
              {t("myLists.collaborative")}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {list.itemCount} {list.itemCount === 1 ? "item" : "items"}
              {list.participantCount > 0 &&
                ` · ${list.participantCount} ${list.participantCount === 1 ? "participante" : "participantes"}`}
            </span>
            <svg
              aria-hidden="true"
              className="text-gray-200 w-4 h-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
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
      className="flex gap-2 p-1.5 bg-white border border-gray-300 rounded-2xl focus-within:border-gray-400 transition-[border-color] duration-150"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("myLists.newListPlaceholder")}
        aria-label={t("myLists.newListAriaLabel")}
        data-testid="new-list-name-input"
        className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none min-w-0"
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <button
        type="button"
        aria-label={t("myLists.cancelCreate")}
        onClick={onClose}
        className="cursor-pointer px-3 py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        ✕
      </button>
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="new-list-create-btn"
        className="cursor-pointer px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96] shrink-0"
      >
        {createList.isPending ? "…" : t("myLists.createList")}
      </button>
    </form>
  );
}

type SortOption = "recent" | "created_desc" | "created_asc";
type VisibilityFilter = "all" | "public" | "private";

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

  const SORT_OPTIONS: {
    value: SortOption;
    label: string;
  }[] = [
    { value: "recent", label: t("myLists.sortRecent") },
    {
      value: "created_desc",
      label: t("myLists.sortNewest"),
    },
    {
      value: "created_asc",
      label: t("myLists.sortOldest"),
    },
  ];

  const VISIBILITY_OPTIONS: {
    value: VisibilityFilter;
    label: string;
  }[] = [
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
    <div className="h-dvh bg-[#FAFAF8] flex flex-col">
      <AppNav />

      <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto overflow-hidden">
        <div className="px-4 pt-5 pb-3 shrink-0">
          {creating ? (
            <CreateListInline onClose={() => setCreating(false)} />
          ) : (
            <div className="flex gap-2">
              <form
                onSubmit={handleSearch}
                className="flex-1 flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-gray-400 transition-[border-color] duration-150"
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("myLists.searchPlaceholder")}
                  aria-label={t("myLists.searchAriaLabel")}
                  data-testid="my-lists-search-input"
                  className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                />
                <button
                  type="submit"
                  className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition-[background-color] duration-150 active:scale-[0.96]"
                >
                  {t("myLists.search")}
                </button>
              </form>
              <button
                type="button"
                data-testid="new-list-btn"
                onClick={() => setCreating(true)}
                className="cursor-pointer h-[46px] w-[46px] flex items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-[border-color,color,transform] duration-150 active:scale-[0.96] shrink-0"
                aria-label={t("myLists.newList")}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          )}
          <div
            className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar"
            data-testid="sort-options"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                data-testid={`sort-${opt.value}`}
                onClick={() => setSort(opt.value)}
                className={`cursor-pointer px-3 py-1 text-xs font-medium rounded-lg border transition-colors duration-150 whitespace-nowrap shrink-0 ${
                  sort === opt.value
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-200 mx-0.5 shrink-0" />
            <div
              className="flex gap-1.5 shrink-0"
              data-testid="visibility-filter"
            >
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  data-testid={`visibility-${opt.value}`}
                  onClick={() => setVisibility(opt.value)}
                  className={`cursor-pointer px-3 py-1 text-xs font-medium rounded-lg border transition-colors duration-150 whitespace-nowrap shrink-0 ${
                    visibility === opt.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }, (_, i) => i).map((i) => (
                <div
                  key={`skeleton-${i}`}
                  className="h-16 rounded-2xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 py-10 text-center">
              {search ? t("myLists.noListsSearch") : t("myLists.noLists")}
            </p>
          )}
          {!isLoading && lists.length > 0 && (
            <div className="flex flex-col gap-2">
              {lists.map((list) => (
                <MyListCard key={list.id} list={list} />
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <p className="text-sm text-gray-400 text-center py-4">
              {t("myLists.loading")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
