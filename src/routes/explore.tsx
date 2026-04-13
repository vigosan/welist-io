import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useExplore, useExploreItems, useAcceptChallenge } from "@/hooks/useList";
import { useSession, signIn } from "@hono/auth-js/react";
import { AppNav } from "@/components/AppNav";
import type { ExploreItem } from "@/services/lists.service";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});


function ExploreListCard({ list, onAccept, acceptPending }: {
  list: ExploreItem;
  onAccept: (id: string) => void;
  acceptPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: session } = useSession();
  const { data: exploreItems, isLoading: itemsLoading } = useExploreItems(list.id, expanded);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-start gap-3">
        {list.coverUrl && (
          <img src={list.coverUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-snug truncate">{list.name}</p>
          {list.description && (
            <p className="text-sm text-gray-400 mt-0.5 leading-snug line-clamp-1">{list.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {list.ownerImage && (
            <img src={list.ownerImage} alt="" className="w-6 h-6 rounded-full" />
          )}
          <button
            onClick={() => {
              if (session?.user) {
                onAccept(list.id);
              } else {
                signIn("google");
              }
            }}
            disabled={acceptPending}
            data-testid={`accept-btn-${list.id}`}
            className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
          >
            {session?.user ? "Aceptar" : "Iniciar sesión"}
          </button>
        </div>
      </div>

      {/* Stats + toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 tabular-nums">{list.itemCount} elementos</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400 tabular-nums">{list.participantCount} retos</span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400 tabular-nums">{list.completedCount} completados</span>
        <button
          onClick={() => setExpanded((v) => !v)}
          data-testid={`expand-btn-${list.id}`}
          className="cursor-pointer ml-auto text-xs text-gray-400 hover:text-gray-600 transition"
        >
          {expanded ? "Ocultar" : "Ver lista"}
        </button>
      </div>

      {/* Items preview */}
      {expanded && (
        <div className="bg-gray-50 rounded-xl px-3 py-2.5">
          {itemsLoading && (
            <p className="text-xs text-gray-400">Cargando…</p>
          )}
          {!itemsLoading && exploreItems && (
            <>
              {exploreItems.length === 0 ? (
                <p className="text-xs text-gray-400">Sin elementos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {exploreItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-3 h-3 rounded border shrink-0 ${item.done ? "bg-gray-300 border-gray-300" : "border-gray-300"}`} />
                      <span className={item.done ? "line-through text-gray-400" : ""}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type SortOption = "created_desc" | "created_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "created_desc", label: "Más nuevas" },
  { value: "created_asc", label: "Más antiguas" },
];

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("created_desc");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useExplore(search || undefined, sort);
  const acceptChallenge = useAcceptChallenge();
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

  function handleAccept(listId: string) {
    acceptChallenge.mutate(listId, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
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
              placeholder="Buscar listas…"
              data-testid="explore-search-input"
              className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition-[background-color] duration-150 active:scale-[0.96]"
            >
              Buscar
            </button>
          </form>
          <div className="flex gap-0 mt-3 border-b border-gray-100" data-testid="explore-sort-options">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                data-testid={`explore-sort-${opt.value}`}
                onClick={() => setSort(opt.value)}
                className={`cursor-pointer px-3 py-1.5 text-xs font-medium transition -mb-px border-b-2 ${
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
                <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {search ? "No hay listas con ese nombre." : "Aún no hay listas públicas."}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {lists.map((list) => (
              <ExploreListCard
                key={list.id}
                list={list}
                onAccept={handleAccept}
                acceptPending={acceptChallenge.isPending}
              />
            ))}
          </div>

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <p className="text-sm text-gray-400 text-center py-4">Cargando…</p>
          )}
        </div>
      </div>
    </div>
  );
}
