import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useFeed } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";
import type { FeedItem } from "@/services/lists.service";

export const Route = createFileRoute("/feed/")({
  component: FeedPage,
});

function feedLabel(item: FeedItem, t: ReturnType<typeof useTranslation>["t"]) {
  const name = privateName(item.actorName) || t("feed.someone");
  const list = item.listName;
  switch (item.action) {
    case "item_added":
      return t("feed.itemAdded", { name, list });
    case "item_edited":
      return t("feed.itemEdited", { name, list });
    case "item_deleted":
      return t("feed.itemDeleted", { name, list });
    case "challenge_accepted":
      return t("feed.challengeAccepted", { name, list });
    default:
      return t("feed.challengeCompleted", { name, list });
  }
}

function FeedRow({ item }: { item: FeedItem }) {
  const { t } = useTranslation();
  const date = new Date(item.createdAt).toLocaleDateString();
  const label = feedLabel(item, t);

  return (
    <Link
      to="/explore/$listId"
      params={{ listId: item.listSlug ?? item.listId }}
      data-testid={`feed-row-${item.id}`}
      className="flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-canvas p-4 no-underline transition-colors hover:bg-black/[0.02] dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:bg-white/[0.03]"
    >
      {item.actorImage ? (
        <img
          src={item.actorImage}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          className="mt-0.5 h-7 w-7 shrink-0 rounded-full outline outline-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {(item.actorName ?? "?")[0]?.toUpperCase()}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-gray-700 dark:text-gray-300">
          {label}
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
          {date}
        </p>
      </div>
    </Link>
  );
}

function FeedRowSkeleton() {
  return (
    <div
      data-testid="feed-row-skeleton"
      className="flex items-start gap-3 rounded-2xl border border-black/[0.08] bg-canvas p-4 dark:border-white/[0.08] dark:bg-canvas-dark"
    >
      <Skeleton variant="circle" className="h-7 w-7 shrink-0" />
      <div className="flex-1">
        <Skeleton variant="text" className="h-3 w-3/4" />
        <Skeleton variant="text" className="mt-2 h-2.5 w-16" />
      </div>
    </div>
  );
}

function FeedPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const enabled = !!session?.user;
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useFeed(enabled);
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas dark:bg-canvas-dark">
      <AppNav />

      <main className="mx-auto w-full max-w-[760px] flex-1 px-4 py-10 sm:px-12">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-paper">
          {t("feed.title")}
        </h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-muted">
          {t("feed.subtitle")}
        </p>

        <div className="mt-7">
          {!enabled && (
            <p className="py-10 text-center text-xs text-gray-500">
              {t("feed.signedOut")}
            </p>
          )}
          {enabled && isLoading && (
            <div className="flex flex-col gap-3">
              {["a", "b", "c", "d", "e"].map((k) => (
                <FeedRowSkeleton key={k} />
              ))}
            </div>
          )}
          {enabled && !isLoading && items.length === 0 && (
            <p className="py-10 text-center text-xs text-gray-500">
              {t("feed.empty")}
            </p>
          )}
          {enabled && items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <FeedRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex flex-col gap-3 pt-2.5">
            {["a", "b", "c"].map((k) => (
              <FeedRowSkeleton key={k} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
