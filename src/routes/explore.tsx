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
    <div className="min-h-screen bg-[#FAFAF8] px-4 py-10">
      <div className="max-w-md mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-900 transition">
            ← Welist
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Explorar</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-sm ring-1 ring-black/[0.03]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar listas…"
            data-testid="explore-search-input"
            className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold bg-gray-950 text-white rounded-xl hover:bg-black transition active:scale-[0.96]"
          >
            Buscar
          </button>
        </form>

        {isLoading && (
          <p className="text-sm text-gray-400 text-center py-8">Cargando…</p>
        )}

        {!isLoading && lists.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            {search ? "No hay listas con ese nombre." : "Aún no hay listas públicas."}
          </p>
        )}

        <div className="space-y-2">
          {lists.map((list) => (
            <div
              key={list.id}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-black/[0.06] px-5 py-4 flex items-center gap-4"
            >
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
                className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-gray-950 text-white rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
              >
                Clonar →
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
