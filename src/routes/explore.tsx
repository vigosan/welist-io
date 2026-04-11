import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useExplore, useCloneList } from "@/hooks/useList";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useExplore(search || undefined);
  const cloneList = useCloneList();

  const lists = data?.pages.flatMap((p) => p.items) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
  }

  function handleClone(listId: string) {
    cloneList.mutate(listId, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
  }

  return (
    <div className="h-dvh bg-[#FAFAF8] flex flex-col sm:items-center sm:p-6">
      <div className="flex-1 flex flex-col w-full sm:max-w-xl bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">

        <div className="px-5 pt-6 pb-4 shrink-0">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-700 transition">
            ← Welist
          </Link>

          <form onSubmit={handleSearch} className="mt-4 flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar listas…"
              data-testid="explore-search-input"
              className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition active:scale-[0.96]"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-10">Cargando…</p>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {search ? "No hay listas con ese nombre." : "Aún no hay listas públicas."}
            </p>
          )}
          <div className="divide-y divide-gray-100">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-4 py-3 px-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{list.description}</p>
                  )}
                  <p className="text-xs text-gray-300 tabular-nums mt-0.5">
                    {list.itemCount} {list.itemCount === 1 ? "elemento" : "elementos"}
                  </p>
                </div>
                <button
                  onClick={() => handleClone(list.id)}
                  disabled={cloneList.isPending}
                  data-testid={`clone-btn-${list.id}`}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 rounded-lg hover:border-gray-900 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
                >
                  Clonar
                </button>
              </div>
            ))}
          </div>

          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="load-more-btn"
                className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 transition"
              >
                {isFetchingNextPage ? "Cargando…" : "Cargar más"}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
