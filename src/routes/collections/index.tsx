import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { cardHover } from "@/components/ui";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  useCollections,
  useCreateCollection,
  useMyCollections,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

export const Route = createFileRoute("/collections/")({
  component: CollectionsPage,
});

function CollectionsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const signedIn = !!session?.user;
  const explore = useCollections();
  const mine = useMyCollections(signedIn);
  const create = useCreateCollection();
  const [name, setName] = useState("");
  const sentinelRef = useInfiniteScroll({
    hasNextPage: explore.hasNextPage,
    isFetchingNextPage: explore.isFetchingNextPage,
    fetchNextPage: explore.fetchNextPage,
  });

  const items = explore.data?.pages.flatMap((p) => p.items) ?? [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || create.isPending) return;
    create.mutate({ name: trimmed }, { onSuccess: () => setName("") });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-canvas dark:bg-canvas-dark">
      <AppNav />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-12">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-paper">
          {t("collections.title")}
        </h1>

        {signedIn && (
          <form
            onSubmit={submit}
            className="mt-6 flex gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 focus-within:border-gray-400 dark:border-white/[0.08] dark:bg-white/[0.02]"
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("collections.createPlaceholder")}
              data-testid="collection-name-input"
              className="flex-1 bg-transparent px-2 text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-paper"
            />
            <button
              type="submit"
              disabled={!name.trim() || create.isPending}
              data-testid="collection-create-btn"
              className="cursor-pointer rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:bg-black active:scale-[0.96] disabled:opacity-40 dark:bg-paper dark:text-ink"
            >
              {t("collections.create")}
            </button>
          </form>
        )}

        {signedIn && mine.data && mine.data.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-muted">
              {t("collections.mine")}
            </h2>
            <div className="flex flex-col gap-3">
              {mine.data.map((col) => (
                <Link
                  key={col.id}
                  to="/collections/$collectionId"
                  params={{ collectionId: col.slug ?? col.id }}
                  data-testid={`my-collection-${col.id}`}
                  className={`rounded-2xl border border-black/[0.08] bg-canvas p-4 no-underline dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover}`}
                >
                  <p className="text-[15px] font-semibold text-ink dark:text-paper">
                    {col.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-gray-500">
                    {t("collections.listCount", { count: col.listCount })}
                    {!col.public && ` · ${t("collections.private")}`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-muted">
            {t("collections.explore")}
          </h2>
          {explore.isLoading && (
            <div className="flex flex-col gap-3">
              {["a", "b", "c"].map((k) => (
                <Skeleton key={k} className="h-20 rounded-2xl" />
              ))}
            </div>
          )}
          {!explore.isLoading && items.length === 0 && (
            <p className="py-8 text-center text-xs text-gray-500">
              {t("collections.empty")}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {items.map((col) => (
              <Link
                key={col.id}
                to="/collections/$collectionId"
                params={{ collectionId: col.slug ?? col.id }}
                data-testid={`collection-${col.id}`}
                className={`rounded-2xl border border-black/[0.08] bg-canvas p-4 no-underline dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover}`}
              >
                <p className="text-[15px] font-semibold text-ink dark:text-paper">
                  {col.name}
                </p>
                {col.description && (
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-gray-600 dark:text-gray-400">
                    {col.description}
                  </p>
                )}
                <p className="mt-1 text-[12px] text-gray-500">
                  {t("collections.listCount", { count: col.listCount })}
                  {col.ownerName && ` · ${privateName(col.ownerName)}`}
                </p>
              </Link>
            ))}
          </div>
          <div ref={sentinelRef} className="h-4" />
        </section>
      </main>
    </div>
  );
}
