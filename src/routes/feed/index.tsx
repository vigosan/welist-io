import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { useFeed } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

function FeedItemSkeleton() {
  return (
    <div
      data-testid="feed-item-skeleton"
      className="flex items-start justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] py-4.5"
    >
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Skeleton variant="text" className="h-4 w-2/3" />
        <Skeleton variant="text" className="h-3 w-full" />
        <Skeleton variant="text" className="h-3 w-32" />
      </div>
      <Skeleton variant="circle" className="w-9 h-9 shrink-0" />
    </div>
  );
}

export const Route = createFileRoute("/feed/")({
  component: FeedPage,
});

function FeedPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const loggedIn = !!session?.user;
  const { data, isLoading } = useFeed(loggedIn);
  const items = data?.items ?? [];

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10">
        <h1 className="text-xl font-bold tracking-tight text-[#0c0c0b] dark:text-[#f0ede8] mb-8">
          {t("feed.title")}
        </h1>

        {!loggedIn && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p
              className="text-sm text-gray-500"
              style={{ textWrap: "balance" }}
            >
              {t("feed.signIn")}
            </p>
            <button
              type="button"
              data-testid="feed-signin"
              onClick={() => signIn("google")}
              className="cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-black transition active:scale-[0.96] dark:bg-[#f0ede8] dark:text-[#0c0c0b]"
            >
              {t("explore.signIn")}
            </button>
          </div>
        )}

        {loggedIn && isLoading && (
          <div>
            {["a", "b", "c", "d", "e"].map((k) => (
              <FeedItemSkeleton key={k} />
            ))}
          </div>
        )}

        {loggedIn && !isLoading && items.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p
              data-testid="feed-empty"
              className="text-sm text-gray-500"
              style={{ textWrap: "balance" }}
            >
              {t("feed.empty")}
            </p>
            <Link
              to="/explore"
              data-testid="feed-empty-cta"
              className="cursor-pointer rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white no-underline transition active:scale-[0.96] hover:bg-black dark:bg-[#f0ede8] dark:text-[#0c0c0b]"
            >
              {t("feed.emptyCta")}
            </Link>
          </div>
        )}

        {loggedIn && items.length > 0 && (
          <div>
            {items.map((item) => (
              <Link
                key={item.id}
                to="/explore/$listId"
                params={{ listId: item.slug ?? item.id }}
                data-testid={`feed-item-${item.id}`}
                className="block py-4.5 border-b border-black/[0.08] dark:border-white/[0.08] no-underline"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#0c0c0b] dark:text-[#f0ede8] mb-1.5 leading-snug tracking-[-0.01em]">
                      {item.name}
                    </p>
                    {item.description && (
                      <p className="text-[12px] leading-[1.6] mb-2.5 text-gray-500 dark:text-[#6b6b67]">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-[#6b6b67]">
                      <span style={{ fontFamily: "'Space Mono', monospace" }}>
                        ▤ {item.itemCount}
                      </span>
                      {item.owner.name && (
                        <>
                          <span>·</span>
                          <span>{privateName(item.owner.name)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {item.owner.image ? (
                    <img
                      src={item.owner.image}
                      alt=""
                      className="w-9 h-9 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full shrink-0 bg-black/[0.06] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
