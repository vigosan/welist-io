import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMyLists, useDeleteList } from "@/hooks/useList";
import { AppNav } from "@/components/AppNav";
import type { List } from "@/db/schema/lists.schema";

export const Route = createFileRoute("/my-lists")({
  component: MyListsPage,
});

function MyListCard({ list }: { list: List }) {
  const [confirming, setConfirming] = useState(false);
  const deleteList = useDeleteList();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" data-testid="my-list-card">
      {list.coverUrl && (
        <img src={list.coverUrl} alt="" className="w-full h-32 object-cover" />
      )}

      <div className="p-4 flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 leading-snug">{list.name}</p>
          {list.description && (
            <p className="text-sm text-gray-500 mt-0.5 leading-snug line-clamp-2">{list.description}</p>
          )}
        </div>

        <div className="pt-1 border-t border-gray-50">
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-gray-500">¿Borrar lista?</span>
              <button
                data-testid="delete-cancel-btn"
                onClick={() => setConfirming(false)}
                className="cursor-pointer px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96]"
              >
                No
              </button>
              <button
                data-testid="delete-confirm-btn"
                onClick={() => deleteList.mutate(list.id)}
                disabled={deleteList.isPending}
                className="cursor-pointer px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition active:scale-[0.96]"
              >
                Borrar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/lists/$listId"
                params={{ listId: list.slug ?? list.id }}
                className="cursor-pointer flex-1 py-2 text-xs font-medium text-center bg-gray-900 text-white rounded-xl hover:bg-black transition active:scale-[0.97]"
              >
                Ver lista
              </Link>
              <button
                data-testid="delete-list-btn"
                onClick={() => setConfirming(true)}
                className="cursor-pointer h-8 w-8 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700 transition active:scale-[0.96]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyListsPage() {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useMyLists();

  const lists = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="h-dvh bg-white flex flex-col">
      <AppNav />

      <div className="flex-1 flex flex-col w-full max-w-xl mx-auto overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 py-10 text-center">Aún no tienes listas.</p>
          )}
          {!isLoading && lists.length > 0 && (
            <div className="flex flex-col gap-3">
              {lists.map((list) => (
                <MyListCard key={list.id} list={list} />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="load-more-btn"
                className="cursor-pointer px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 disabled:opacity-40 transition"
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
