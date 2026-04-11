import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyLists } from "@/hooks/useList";
import { UserMenu } from "@/components/UserMenu";

export const Route = createFileRoute("/my-lists")({
  component: MyListsPage,
});

function MyListsPage() {
  const { data: lists = [], isLoading } = useMyLists();

  return (
    <div className="h-dvh bg-[#FAFAF8] flex flex-col sm:items-center sm:p-6">
      <div className="flex-1 flex flex-col w-full sm:max-w-xl bg-white sm:rounded-3xl sm:border sm:border-gray-100 overflow-hidden">

        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <Link to="/" className="text-sm text-gray-400 hover:text-gray-700 transition">
              ← Welist
            </Link>
            <UserMenu />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Mis listas</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          {isLoading && (
            <div className="space-y-1 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">Aún no tienes listas.</p>
          )}
          {!isLoading && lists.length > 0 && (
            <div>
              {lists.map((list) => (
                <Link
                  key={list.id}
                  to="/lists/$listId"
                  params={{ listId: list.slug ?? list.id }}
                  className="flex items-center justify-between py-3 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg transition group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{list.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-gray-300 text-xs ml-3 group-hover:text-gray-500 transition">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
