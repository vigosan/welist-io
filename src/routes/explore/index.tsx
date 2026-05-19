import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useAcceptChallenge, useExplore } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { LIST_CATEGORIES } from "@/lib/categories";
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
  const [accepted, setAccepted] = useState(false);

  function handleAccept() {
    if (session?.user) {
      setAccepted(true);
      onAccept(list.id);
    } else {
      signIn("google");
    }
  }

  return (
    <div className="py-4.5 border-b border-black/[0.08] dark:border-white/[0.08]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            to="/explore/$listId"
            params={{ listId: list.slug ?? list.id }}
            className="block text-[14px] font-semibold text-[#0c0c0b] dark:text-[#f0ede8] mb-1.5 leading-snug tracking-[-0.01em] hover:opacity-70 transition-opacity duration-150 no-underline"
          >
            {list.name}
          </Link>
          {list.description && (
            <p className="text-[12px] leading-[1.6] mb-2.5 text-gray-500 dark:text-[#6b6b67]">
              {list.description}
            </p>
          )}
          <div
            data-testid={`explore-card-meta-${list.id}`}
            className="text-[11px] tabular-nums text-gray-500 dark:text-[#6b6b67]"
          >
            {[
              t("explore.metaItems", { count: list.itemCount }),
              list.participantCount > 0
                ? t("explore.metaParticipants", {
                    count: list.participantCount,
                  })
                : null,
              list.completedCount > 0
                ? t("explore.metaCompleted", { count: list.completedCount })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {list.owner?.image ? (
          <img
            src={list.owner.image}
            alt=""
            className="w-9 h-9 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
          />
        ) : (
          <div className="w-9 h-9 rounded-full shrink-0 bg-black/[0.06] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08]" />
        )}
      </div>
      <button
        type="button"
        onClick={handleAccept}
        disabled={acceptPending}
        data-testid={`accept-btn-${list.id}`}
        className={[
          "mt-3.5 w-full py-2.5 rounded-lg text-[12px] font-semibold tracking-[0.04em]",
          "transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
          accepted
            ? "bg-black/[0.12] dark:bg-white/[0.14] text-[#0c0c0b] dark:text-[#f0ede8] border border-black/[0.20] dark:border-white/[0.18]"
            : "bg-[#0c0c0b] dark:bg-[#f0ede8] text-[#f8f7f5] dark:text-[#0c0c0b] border border-transparent",
        ].join(" ")}
      >
        {session?.user
          ? accepted
            ? "✓ Reto aceptado"
            : t("explore.acceptChallenge")
          : t("explore.signIn")}
      </button>
    </div>
  );
}

function categoryChipClass(active: boolean): string {
  return `shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs transition active:scale-[0.96] ${
    active
      ? "border-transparent bg-[#0c0c0b] font-semibold text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b]"
      : "border-black/[0.08] font-normal text-gray-500 hover:border-black/[0.20] hover:text-[#0c0c0b] dark:border-white/[0.08] dark:hover:border-white/[0.20] dark:hover:text-[#f0ede8]"
  }`;
}

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState<"created_desc" | "trending">("created_desc");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useExplore(search || undefined, sort, category);
  const acceptChallenge = useAcceptChallenge();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
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
        if (err.message === "Already participating" && list)
          navigate({
            to: "/lists/$listId",
            params: { listId: list.slug ?? list.id },
          });
      },
    });
  }

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10">
        <form
          onSubmit={handleSearch}
          className={[
            "flex overflow-hidden rounded-lg transition-all duration-200",
            focused
              ? "bg-black/[0.06] dark:bg-white/[0.07] border border-black/[0.20] dark:border-white/[0.18]"
              : "bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]",
          ].join(" ")}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t("explore.searchPlaceholder")}
            aria-label={t("explore.searchAriaLabel")}
            data-testid="explore-search-input"
            className="flex-1 px-4 py-2.5 text-[13px] text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] dark:placeholder-[#6b6b67] bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-[12px] font-semibold tracking-[0.04em] bg-[#0c0c0b] dark:bg-[#f0ede8] text-[#f8f7f5] dark:text-[#0c0c0b] border-none cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            {t("explore.search")}
          </button>
        </form>

        <div className="mt-5 flex items-center gap-3">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("explore.sortLabel")}
          </span>
          <div className="inline-flex rounded-full border border-black/[0.08] p-0.5 dark:border-white/[0.08]">
            {(
              [
                {
                  value: "created_desc",
                  label: t("explore.sortRecent"),
                  testId: "explore-sort-recent",
                },
                {
                  value: "trending",
                  label: t("explore.sortTrending"),
                  testId: "explore-sort-trending",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={opt.testId}
                onClick={() => setSort(opt.value)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs transition active:scale-[0.96] ${
                  sort === opt.value
                    ? "bg-[#0c0c0b] font-semibold text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b]"
                    : "font-normal text-gray-500 hover:text-[#0c0c0b] dark:hover:text-[#f0ede8]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("explore.categoryLabel")}
          </span>
          <div className="-mb-1 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              data-testid="explore-category-all"
              onClick={() => setCategory(undefined)}
              className={categoryChipClass(!category)}
            >
              {t("explore.allCategories")}
            </button>
            {LIST_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  data-testid={`explore-category-${cat}`}
                  onClick={() => setCategory(active ? undefined : cat)}
                  className={categoryChipClass(active)}
                >
                  {t(`categories.${cat}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {isLoading && (
            <p className="text-[12px] text-gray-500 text-center py-10">
              {t("explore.loading")}
            </p>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-[12px] text-gray-500 text-center py-10">
              {search ? t("explore.noListsSearch") : t("explore.noLists")}
            </p>
          )}
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
          <p className="text-[12px] text-gray-500 text-center py-4">
            {t("explore.loading")}
          </p>
        )}
      </main>
    </div>
  );
}
