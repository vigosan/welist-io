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
  const { data: lists = [], isLoading } = useExplore(search || undefined);
  const cloneList = useCloneList();

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
    <div className="min-h-screen bg-white flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">

        <div className="flex items-baseline gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-900 transition shrink-0">
            ← Welist
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Explorar</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-1.5 border border-gray-200 rounded-2xl">
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

        {isLoading && (
          <p className="text-sm text-gray-400">Cargando…</p>
        )}

        {!isLoading && lists.length === 0 && (
          <p className="text-sm text-gray-400">
            {search ? "No hay listas con ese nombre." : "Aún no hay listas públicas."}
          </p>
        )}

        <div className="divide-y divide-gray-100">
          {lists.map((list) => (
            <div key={list.id} className="flex items-center gap-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
                <p className="text-xs text-gray-400 tabular-nums mt-0.5">
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

      </div>
    </div>
  );
}
