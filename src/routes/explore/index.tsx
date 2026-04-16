import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useAcceptChallenge, useExplore } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import type { ExploreItem } from "@/services/lists.service";

export const Route = createFileRoute("/explore/")({
  component: ExplorePage,
});

function ExploreListCard({
  list,
  onAccept,
  acceptPending,
}: {
  list: ExploreItem;
  onAccept: (id: string) => void;
  acceptPending: boolean;
}) {
  const { data: session } = useSession();
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="p-4 flex flex-col gap-3">
        <Link
          to="/explore/$listId"
          params={{ listId: list.slug ?? list.id }}
          className="flex items-start justify-between gap-3 hover:opacity-80 transition-opacity duration-150"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
              {list.name}
            </p>
            {list.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                {list.description}
              </p>
            )}
          </div>
          {list.owner?.image && (
            <img
              src={list.owner.image}
              alt=""
              className="w-7 h-7 rounded-full shrink-0 outline outline-1 outline-black/10"
            />
          )}
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {list.itemCount}
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {list.participantCount}
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 tabular-nums">
              {list.completedCount}
            </span>
          </div>
        </div>

        <div className="pt-1 border-t border-gray-50 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              if (session?.user) {
                onAccept(list.id);
              } else {
                signIn("google");
              }
            }}
            disabled={acceptPending}
            data-testid={`accept-btn-${list.id}`}
            className="cursor-pointer w-full py-2 text-xs font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96]"
          >
            {session?.user ? t("explore.acceptChallenge") : t("explore.signIn")}
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
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useExplore(search || undefined);
  const acceptChallenge = useAcceptChallenge();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const lists = data?.pages.flatMap((p) => p.items) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
  }

  function handleAccept(listId: string) {
    const list = lists.find((l) => l.id === listId);
    acceptChallenge.mutate(listId, {
      onSuccess: (accepted) =>
        navigate({
          to: "/lists/$listId",
          params: { listId: accepted.slug ?? accepted.id },
        }),
      onError: (err) => {
        if (err.message === "Already participating" && list) {
          navigate({
            to: "/lists/$listId",
            params: { listId: list.slug ?? list.id },
          });
        }
      },
    });
  }

  return (
    <div className="h-dvh bg-[#FAFAF8] dark:bg-gray-950 flex flex-col">
      <AppNav />

      <div className="flex-1 flex flex-col w-full max-w-3xl mx-auto overflow-hidden">
        <div className="px-4 pt-6 pb-4 shrink-0">
          <form
            onSubmit={handleSearch}
            className="flex gap-2 p-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl focus-within:border-gray-400 dark:focus-within:border-gray-500 transition-[border-color] duration-150"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("explore.searchPlaceholder")}
              aria-label={t("explore.searchAriaLabel")}
              data-testid="explore-search-input"
              className="flex-1 pl-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black transition-[background-color] duration-150 active:scale-[0.96]"
            >
              {t("explore.search")}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-10">
              {t("explore.loading")}
            </p>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {search ? t("explore.noListsSearch") : t("explore.noLists")}
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

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <p className="text-sm text-gray-400 text-center py-4">
              {t("explore.loading")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
