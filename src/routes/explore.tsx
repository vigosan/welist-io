import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {list.coverUrl && (
        <img src={list.coverUrl} alt="" className="w-full h-32 object-cover" />
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 leading-snug">{list.name}</p>
            {list.description && (
              <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">{list.description}</p>
            )}
          </div>
          {list.ownerImage && (
            <img src={list.ownerImage} alt="" className="w-7 h-7 rounded-full shrink-0" />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 tabular-nums">
            {list.itemCount} {list.itemCount === 1 ? "elemento" : "elementos"}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
            {list.participantCount} {list.participantCount === 1 ? "retando" : "retando"}
          </span>
          <span className="text-xs text-gray-400 tabular-nums">
            {list.completedCount} completados
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            data-testid={`expand-btn-${list.id}`}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition"
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

        {/* Actions */}
        <div className="pt-1 border-t border-gray-50">
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
            className="w-full py-2 text-xs font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.97]"
          >
            {session?.user ? "Aceptar el reto" : "Iniciar sesión para retar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useExplore(search || undefined);
  const acceptChallenge = useAcceptChallenge();

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
        <div className="px-4 pt-6 pb-4 shrink-0">
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
              className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition-[background-color] duration-150 active:scale-[0.96]"
            >
              Buscar
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-10">Cargando…</p>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {search ? "No hay listas con ese nombre." : "Aún no hay listas públicas."}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {lists.map((list) => (
              <ExploreListCard
                key={list.id}
                list={list}
                onAccept={handleAccept}
                acceptPending={acceptChallenge.isPending}
              />
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
