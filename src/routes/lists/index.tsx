import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMyLists, useDeleteList } from "@/hooks/useList";
import { AppNav } from "@/components/AppNav";
import type { List } from "@/db/schema/lists.schema";

export const Route = createFileRoute("/lists/")({
  component: MyListsPage,
});

function MyListCard({ list }: { list: List }) {
  const [confirming, setConfirming] = useState(false);
  const deleteList = useDeleteList();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 px-4 py-3" data-testid="my-list-card">
        <span className="flex-1 text-sm text-gray-500 truncate">¿Borrar «{list.name}»?</span>
        <button
          data-testid="delete-cancel-btn"
          onClick={() => setConfirming(false)}
          className="cursor-pointer px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-[border-color,color,transform] duration-150 active:scale-[0.96]"
        >
          No
        </button>
        <button
          data-testid="delete-confirm-btn"
          onClick={() => deleteList.mutate(list.id)}
          disabled={deleteList.isPending}
          className="cursor-pointer px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-[background-color,transform] duration-150 active:scale-[0.96]"
        >
          Borrar
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
            <p className="font-semibold text-gray-900 leading-snug">{list.name}</p>
            {list.description && (
              <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">{list.description}</p>
            )}
          </div>
          <button
            data-testid="delete-list-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
            className="cursor-pointer h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 transition-colors active:scale-[0.96] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {list.public && (
            <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">Pública</span>
          )}
          {list.collaborative && (
            <span className="text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 rounded-lg">Colaborativa</span>
          )}
          <svg className="text-gray-200 w-4 h-4 shrink-0 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

type SortOption = "recent" | "created_desc" | "created_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Recientes" },
  { value: "created_desc", label: "Más nuevas" },
  { value: "created_asc", label: "Más antiguas" },
];

function MyListsPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recent");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMyLists(search || undefined, sort);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    <div className="h-dvh bg-white flex flex-col">
      <AppNav />

      <div className="flex-1 flex flex-col w-full max-w-xl mx-auto overflow-hidden">
        <div className="px-4 pt-5 pb-3 shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-gray-400 transition-[border-color] duration-150">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar mis listas…"
              data-testid="my-lists-search-input"
              className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition-[background-color] duration-150 active:scale-[0.96]"
            >
              Buscar
            </button>
          </form>
          <div className="flex gap-0 mt-3 border-b border-gray-100" data-testid="sort-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                data-testid={`sort-${opt.value}`}
                onClick={() => setSort(opt.value)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition-colors duration-150 -mb-px border-b-2 ${
                  sort === opt.value
                    ? "text-gray-900 border-gray-900"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 py-10 text-center">
              {search ? "No hay listas con ese nombre." : "Aún no tienes listas."}
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
            <p className="text-sm text-gray-400 text-center py-4">Cargando…</p>
          )}
        </div>
      </div>
    </div>
  );
}
