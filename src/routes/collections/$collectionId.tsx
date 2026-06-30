import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { cardHover } from "@/components/ui";
import {
  useCollectionDetail,
  useDeleteCollection,
  useRemoveListFromCollection,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

export const Route = createFileRoute("/collections/$collectionId")({
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { collectionId } = Route.useParams();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { data: col, isLoading } = useCollectionDetail(collectionId);
  const removeList = useRemoveListFromCollection();
  const deleteCollection = useDeleteCollection();

  const isOwner = !!session?.user?.id && col?.ownerId === session.user.id;

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas dark:bg-canvas-dark">
        <AppNav />
        <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-12">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="mt-4 h-20 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (!col) return null;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas dark:bg-canvas-dark">
      <AppNav />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-12">
        <Link
          to="/collections"
          className="text-xs text-gray-400 no-underline hover:text-ink dark:hover:text-paper"
        >
          ← {t("collections.title")}
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-paper">
          {col.name}
        </h1>
        {col.owner?.name && (
          <p className="mt-1 text-sm text-gray-500 dark:text-muted">
            {t("explore.createdBy", { name: privateName(col.owner.name) })}
          </p>
        )}
        {col.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {col.description}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {col.lists.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-500">
              {t("collections.noLists")}
            </p>
          )}
          {col.lists.map((list) => (
            <div
              key={list.id}
              className={`flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-canvas p-4 dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover}`}
            >
              <Link
                to="/explore/$listId"
                params={{ listId: list.slug ?? list.id }}
                data-testid={`collection-list-${list.id}`}
                className="min-w-0 flex-1 no-underline"
              >
                <p className="truncate text-[15px] font-semibold text-ink dark:text-paper">
                  {list.name}
                </p>
                <p className="mt-0.5 text-[12px] text-gray-500">
                  {t("explore.metaItems", { count: list.itemCount })}
                </p>
              </Link>
              {isOwner && (
                <button
                  type="button"
                  onClick={() =>
                    removeList.mutate({
                      collectionId: col.id,
                      listId: list.id,
                    })
                  }
                  data-testid={`remove-list-${list.id}`}
                  aria-label={t("collections.removeList")}
                  className="shrink-0 cursor-pointer text-gray-300 transition-colors hover:text-gray-700 dark:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() =>
              deleteCollection.mutate(col.id, {
                onSuccess: () => navigate({ to: "/collections" }),
              })
            }
            data-testid="delete-collection-btn"
            className="mt-8 cursor-pointer text-xs text-gray-400 hover:text-ink dark:hover:text-paper transition-colors duration-150"
          >
            {t("collections.delete")}
          </button>
        )}
      </main>
    </div>
  );
}
