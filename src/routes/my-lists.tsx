import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyLists } from "@/hooks/useList";
import { AppNav } from "@/components/AppNav";
import type { List } from "@/db/schema/lists.schema";

export const Route = createFileRoute("/my-lists")({
  component: MyListsPage,
});

function MyListCard({ list }: { list: List }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
          <Link
            to="/lists/$listId"
            params={{ listId: list.slug ?? list.id }}
            className="cursor-pointer block w-full py-2 text-xs font-medium text-center bg-gray-900 text-white rounded-xl hover:bg-black transition active:scale-[0.97]"
          >
            Ver lista
          </Link>
        </div>
      </div>
    </div>
  );
}

function MyListsPage() {
  const { data: lists = [], isLoading } = useMyLists();

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
        </div>
      </div>
    </div>
  );
}
