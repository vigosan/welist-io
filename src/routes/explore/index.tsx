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
          <div className="flex gap-4">
            {[
              { icon: "▤", v: list.itemCount },
              { icon: "⟳", v: list.participantCount },
              { icon: "✓", v: list.completedCount },
            ].map(({ icon, v }) => (
              <span
                key={icon}
                className="text-[11px] text-gray-500 dark:text-[#6b6b67]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {icon} {v}
              </span>
            ))}
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

function ExplorePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
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
    <div className="min-h-dvh bg-[#f8f7f5] dark:bg-[#0c0c0b] flex flex-col">
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

        <div className="mt-8">
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
