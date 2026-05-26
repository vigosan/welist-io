import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { StarRatingDisplay } from "@/components/StarRating";
import { useAcceptChallenge, useExplore } from "@/hooks/useList";
import { useTrackOnMount } from "@/hooks/useTrackOnMount";
import { useTranslation } from "@/i18n/service";
import {
  ADULT_CATEGORIES,
  LIST_CATEGORIES,
  type ListCategory,
} from "@/lib/categories";

const VISIBLE_CATEGORIES = LIST_CATEGORIES.filter(
  (c) => !(ADULT_CATEGORIES as readonly string[]).includes(c)
);
import { CategoryIcon } from "@/lib/categoryIcons";
import { plainItemText } from "@/lib/item-text";
import { privateName } from "@/lib/private-name";
import type { ExploreItem } from "@/services/lists.service";

export const Route = createFileRoute("/explore/")({
  component: ExplorePage,
});

function ExploreCardSkeleton() {
  return (
    <div
      data-testid="explore-card-skeleton"
      className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5"
    >
      <Skeleton variant="text" className="mb-3 h-4 w-20" />
      <Skeleton variant="text" className="mb-2 h-4 w-2/3" />
      <Skeleton variant="text" className="mb-2.5 h-3 w-full" />
      <Skeleton variant="text" className="mb-3 h-3 w-5/6" />
      <Skeleton variant="text" className="h-3 w-40" />
    </div>
  );
}

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
  const [optimisticAccepted, setOptimisticAccepted] = useState(false);
  const accepted = list.isParticipating || optimisticAccepted;

  function handleAccept() {
    if (session?.user) {
      setOptimisticAccepted(true);
      onAccept(list.id);
    } else {
      signIn("google");
    }
  }

  const owner =
    list.owner?.id && list.owner?.name
      ? { id: list.owner.id, name: list.owner.name, image: list.owner.image }
      : null;
  const pct =
    list.participantCount > 0 && list.itemCount > 0
      ? Math.min(
          100,
          Math.round(
            (list.progressDoneTotal /
              (list.participantCount * list.itemCount)) *
              100
          )
        )
      : null;

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 transition-colors duration-150 hover:border-black/[0.18] dark:hover:border-white/[0.18]">
      {(list.category || owner) && (
        <div className="mb-2 flex items-center gap-3">
          {list.category && (
            <span
              data-testid={`explore-card-category-${list.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400"
            >
              <CategoryIcon
                category={list.category as ListCategory}
                size={13}
                className="text-gray-500 dark:text-gray-400"
              />
              {t(`categories.${list.category}`)}
            </span>
          )}
          {owner && (
            <Link
              to="/u/$userId"
              params={{ userId: owner.id }}
              data-testid={`explore-card-author-${list.id}`}
              className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#0c0c0b] dark:text-[#6b6b67] dark:hover:text-[#f0ede8] no-underline transition-colors"
            >
              {owner.image ? (
                <img
                  src={owner.image}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover outline outline-1 outline-black/10 dark:outline-white/10"
                />
              ) : (
                <div className="h-5 w-5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] outline outline-1 outline-black/10 dark:outline-white/10" />
              )}
              <span className="font-medium">{privateName(owner.name)}</span>
            </Link>
          )}
        </div>
      )}
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
      {list.previewItems.length > 0 && (
        <p
          data-testid={`explore-card-preview-${list.id}`}
          className="mb-2.5 truncate text-[12px] text-gray-400 dark:text-gray-500"
        >
          <span className="text-gray-500 dark:text-[#6b6b67]">
            {t("explore.previewLabel")}:
          </span>{" "}
          {list.previewItems.map(plainItemText).join(" · ")}
        </p>
      )}
      <div
        data-testid={`explore-card-meta-${list.id}`}
        className="flex items-center gap-2 text-[11px] tabular-nums text-gray-500 dark:text-[#6b6b67]"
      >
        <span>
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
            pct !== null ? t("explore.avgProgressShort", { pct }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {list.rating.count > 0 && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <StarRatingDisplay
              avg={list.rating.avg}
              count={list.rating.count}
            />
          </>
        )}
      </div>
      {pct !== null && (
        <div
          data-testid={`explore-card-progress-${list.id}`}
          className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]"
        >
          <div
            className="h-full rounded-full bg-[#0c0c0b] dark:bg-[#f0ede8]"
            style={{
              width: `${pct}%`,
              transition: "width 600ms cubic-bezier(0.2, 0, 0, 1)",
            }}
          />
        </div>
      )}
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
            ? t("explore.challengeAccepted")
            : t("explore.acceptChallenge")
          : t("explore.signIn")}
      </button>
    </div>
  );
}

function chipClass(active: boolean): string {
  return `cursor-pointer px-3 py-1 rounded-full text-xs transition-all duration-150 whitespace-nowrap shrink-0 border ${
    active
      ? "border-black/[0.20] dark:border-white/[0.20] bg-black/[0.12] dark:bg-white/[0.12] text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
      : "border-black/[0.08] dark:border-white/[0.08] text-gray-500 font-normal hover:border-black/[0.20] dark:hover:border-white/[0.20] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
  }`;
}

function ExplorePage() {
  useTrackOnMount({ type: "explore_view" });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [sort, setSort] = useState<"created_desc" | "trending">("created_desc");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
            className="flex-1 px-4 py-2.5 text-sm text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] dark:placeholder-[#6b6b67] bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-[12px] font-semibold tracking-[0.04em] bg-[#0c0c0b] dark:bg-[#f0ede8] text-[#f8f7f5] dark:text-[#0c0c0b] border-none cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            {t("explore.search")}
          </button>
        </form>

        {(() => {
          const hasNonDefault =
            sort !== "created_desc" || category !== undefined;
          const activeSortLabel =
            sort === "trending" ? t("explore.sortTrending") : null;
          const activeCategoryLabel = category
            ? t(`categories.${category}`)
            : null;
          return (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                data-testid="filter-toggle"
                onClick={() => setFiltersOpen((v) => !v)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all duration-150 whitespace-nowrap shrink-0 ${
                  hasNonDefault
                    ? "border-black/[0.20] dark:border-white/[0.20] bg-black/[0.12] dark:bg-white/[0.12] text-[#0c0c0b] dark:text-[#f0ede8] font-semibold"
                    : "border-black/[0.08] dark:border-white/[0.08] text-gray-500 font-normal hover:border-black/[0.20] dark:hover:border-white/[0.20] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                }`}
              >
                <svg
                  aria-hidden="true"
                  className="w-2.5 h-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h18M7 9h10M11 14h2"
                  />
                </svg>
                Filters
                {hasNonDefault && (
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-black/[0.15] dark:bg-white/[0.15] text-[10px] font-bold leading-none">
                    {(sort !== "created_desc" ? 1 : 0) + (category ? 1 : 0)}
                  </span>
                )}
                <svg
                  aria-hidden="true"
                  className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {!filtersOpen && hasNonDefault && (
                <div className="flex items-center gap-1.5">
                  {sort !== "created_desc" && (
                    <button
                      type="button"
                      onClick={() => setSort("created_desc")}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2 py-0.5 text-xs text-gray-500 hover:border-black/[0.25] hover:text-gray-700 transition"
                    >
                      {activeSortLabel}
                      <span
                        aria-hidden
                        className="text-gray-300 dark:text-gray-600 leading-none"
                      >
                        ×
                      </span>
                    </button>
                  )}
                  {category && (
                    <button
                      type="button"
                      onClick={() => setCategory(undefined)}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2 py-0.5 text-xs text-gray-500 hover:border-black/[0.25] hover:text-gray-700 transition"
                    >
                      {activeCategoryLabel}
                      <span
                        aria-hidden
                        className="text-gray-300 dark:text-gray-600 leading-none"
                      >
                        ×
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {filtersOpen && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0">
                {t("explore.sortLabel")}
              </span>
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
                  className={chipClass(sort === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 shrink-0">
                {t("explore.categoryLabel")}
              </span>
              <button
                type="button"
                data-testid="explore-category-all"
                onClick={() => setCategory(undefined)}
                className={chipClass(!category)}
              >
                {t("explore.allCategories")}
              </button>
              {VISIBLE_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    data-testid={`explore-category-${cat}`}
                    onClick={() => setCategory(active ? undefined : cat)}
                    className={`${chipClass(active)} inline-flex items-center gap-1.5`}
                  >
                    <CategoryIcon category={cat} size={12} />
                    {t(`categories.${cat}`)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {["a", "b", "c", "d", "e"].map((k) => (
                <ExploreCardSkeleton key={k} />
              ))}
            </div>
          )}
          {!isLoading && lists.length === 0 && (
            <p className="text-[12px] text-gray-500 text-center py-10">
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
        </div>

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex flex-col gap-3 pt-3">
            {["a", "b", "c"].map((k) => (
              <ExploreCardSkeleton key={k} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
