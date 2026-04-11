import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useExplore, useCloneList, useExploreItems, useAcceptChallenge } from "@/hooks/useList";
import { useSession, signIn } from "@hono/auth-js/react";
import { UserMenu } from "@/components/UserMenu";
import type { ExploreItem } from "@/services/lists.service";

export const Route = createFileRoute("/explore")({
  component: ExplorePage,
});

function ExploreListCard({ list, onAccept, onClone, acceptPending, clonePending }: {
  list: ExploreItem;
  onAccept: (id: string) => void;
  onClone: (id: string) => void;
  acceptPending: boolean;
  clonePending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: session } = useSession();
  const { data: exploreItems, isLoading: itemsLoading } = useExploreItems(list.id, expanded);

  return (
    <div className="py-3 px-2 border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        data-testid={`expand-btn-${list.id}`}
        className="w-full text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
            {list.description && (
              <p className="text-xs text-gray-400 truncate mt-0.5">{list.description}</p>
            )}
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-gray-300 tabular-nums">
                {list.itemCount} {list.itemCount === 1 ? "elemento" : "elementos"}
              </p>
              {list.participantCount > 0 && (
                <p className="text-xs text-gray-400 tabular-nums">
                  {list.participantCount} {list.participantCount === 1 ? "participante" : "participantes"}
                  {list.completedCount > 0 && ` · ${list.completedCount} completado${list.completedCount !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>
          <span className="shrink-0 text-gray-300 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pl-1">
          {itemsLoading && (
            <p className="text-xs text-gray-400 py-2">Cargando…</p>
          )}
          {!itemsLoading && exploreItems && (
            <ul className="space-y-1 mb-3">
              {exploreItems.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`w-3 h-3 rounded-sm border border-gray-300 shrink-0 ${item.done ? "bg-gray-300" : ""}`} />
                  <span className={item.done ? "line-through text-gray-400" : ""}>{item.text}</span>
                </li>
              ))}
              {exploreItems.length === 0 && (
                <p className="text-xs text-gray-300">Sin elementos.</p>
              )}
            </ul>
          )}
          <div className="flex items-center gap-2">
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
              className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
            >
              {session?.user ? "Aceptar el reto" : "Iniciar sesión para aceptar"}
            </button>
            <button
              onClick={() => onClone(list.id)}
              disabled={clonePending}
              data-testid={`clone-btn-${list.id}`}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 rounded-lg hover:border-gray-900 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-[0.96]"
            >
              Clonar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useExplore(search || undefined);
  const cloneList = useCloneList();
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

  function handleClone(listId: string) {
    cloneList.mutate(listId, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
  }

  return (
    <div className="h-dvh bg-[#FAFAF8] flex flex-col sm:items-center sm:p-6">
      <div className="flex-1 flex flex-col w-full sm:max-w-xl bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">

        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-700 transition">
              ← Welist
            </Link>
            <UserMenu />
          </div>

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
          <div>
            {lists.map((list) => (
              <ExploreListCard
                key={list.id}
                list={list}
                onAccept={handleAccept}
                onClone={handleClone}
                acceptPending={acceptChallenge.isPending}
                clonePending={cloneList.isPending}
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
