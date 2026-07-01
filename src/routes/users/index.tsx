import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import { cardHover } from "@/components/ui";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useToggleFollow, useUserDirectory } from "@/hooks/useList";
import { useSearchInput } from "@/hooks/useSearchInput";
import { useTranslation } from "@/i18n/service";
import { initials, privateName } from "@/lib/private-name";
import type { DirectoryUser } from "@/services/lists.service";

export const Route = createFileRoute("/users/")({
  component: UsersDirectoryPage,
});

function SlimFollowButton({
  userId,
  isFollowing,
}: {
  userId: string;
  isFollowing: boolean;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const me = session?.user?.id;
  const enabled = !!me && me !== userId;
  const toggle = useToggleFollow(userId);
  if (!enabled) return null;
  return (
    <button
      type="button"
      data-testid={`follow-btn-${userId}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate(isFollowing);
      }}
      disabled={toggle.isPending}
      className={`shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition active:scale-[0.96] disabled:opacity-50 ${
        isFollowing
          ? "border border-black/[0.08] bg-canvas text-muted hover:border-ink hover:text-ink dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-paper dark:hover:text-paper"
          : "bg-ink text-paper hover:bg-black dark:bg-paper dark:text-ink dark:hover:bg-white"
      }`}
    >
      {isFollowing ? t("profile.following") : t("profile.follow")}
    </button>
  );
}

function buildSummary(
  user: DirectoryUser,
  t: ReturnType<typeof useTranslation>["t"]
): string[] {
  const parts: string[] = [];
  if (user.ownedListsCount > 0) {
    parts.push(
      t("directory.sharesLists_other", { count: user.ownedListsCount })
    );
  }
  if (user.challengerCount > 0) {
    parts.push(
      t("directory.doesChallenges_other", { count: user.challengerCount })
    );
  }
  if (user.collaboratorCount > 0) {
    parts.push(
      t("directory.collaboratesIn_other", { count: user.collaboratorCount })
    );
  }
  if (user.followerCount > 0) {
    parts.push(t("directory.followers_other", { count: user.followerCount }));
  }
  return parts;
}

function UserRowSkeleton() {
  return (
    <div
      data-testid="user-row-skeleton"
      className="flex items-center gap-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-canvas dark:bg-canvas-dark p-5"
    >
      <Skeleton variant="circle" className="w-12 h-12 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Skeleton variant="text" className="h-3.5 w-40" />
        <Skeleton variant="text" className="h-3 w-56" />
      </div>
      <Skeleton className="h-7 w-20 rounded-full" />
    </div>
  );
}

function UserRow({ user }: { user: DirectoryUser }) {
  const { t } = useTranslation();
  const summary = buildSummary(user, t);

  return (
    <article
      data-testid={`user-card-${user.id}`}
      className={`group relative flex items-center gap-4 rounded-2xl border border-black/[0.08] bg-canvas p-5 dark:border-white/[0.08] dark:bg-canvas-dark ${cardHover}`}
    >
      <Link
        to="/u/$userId"
        params={{ userId: user.id }}
        aria-label={privateName(user.name)}
        className="absolute inset-0 rounded-2xl no-underline"
      />
      {user.image ? (
        <img
          src={user.image}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          decoding="async"
          className="pointer-events-none w-12 h-12 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <div className="pointer-events-none w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-mono text-sm font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-ink dark:text-paper border border-black/[0.08] dark:border-white/[0.10]">
          {initials(user.name)}
        </div>
      )}
      <div className="pointer-events-none flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-ink dark:text-paper truncate mb-0.5">
          {privateName(user.name)}
        </p>
        {summary.length > 0 ? (
          <p className="text-[12px] text-gray-500 dark:text-muted leading-snug">
            {summary.join(" · ")}
          </p>
        ) : (
          <p className="text-[12px] text-gray-400 dark:text-muted-dark italic">
            {t("directory.noActivity")}
          </p>
        )}
      </div>
      <div className="relative">
        <SlimFollowButton userId={user.id} isFollowing={user.isFollowing} />
      </div>
    </article>
  );
}

function UsersDirectoryPage() {
  const { q, setQ, search, handleSearch } = useSearchInput();
  const [focused, setFocused] = useState(false);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useUserDirectory(search || undefined);
  const sentinelRef = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });
  const { t } = useTranslation();

  const userList = data?.pages.flatMap((p) => p.users) ?? [];

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10">
        <form
          onSubmit={handleSearch}
          className={[
            "flex overflow-hidden rounded-lg transition-[border-color,background-color] duration-200",
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
            placeholder={t("directory.searchPlaceholder")}
            aria-label={t("directory.searchAriaLabel")}
            data-testid="directory-search-input"
            className="flex-1 px-4 py-2.5 text-sm text-ink dark:text-paper placeholder-muted dark:placeholder-muted-dark bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-[12px] font-semibold tracking-[0.04em] bg-ink dark:bg-paper text-canvas dark:text-ink rounded-none border-none cursor-pointer"
          >
            {t("directory.search")}
          </button>
        </form>

        <div className="mt-7">
          {isLoading && (
            <div className="flex flex-col gap-3">
              {["a", "b", "c", "d", "e", "f"].map((k) => (
                <UserRowSkeleton key={k} />
              ))}
            </div>
          )}
          {!isLoading && userList.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-10">
              {search ? t("directory.noUsersSearch") : t("directory.noUsers")}
            </p>
          )}
          <div className="flex flex-col gap-3">
            {userList.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <div className="flex flex-col gap-3 pt-2.5">
            {["a", "b", "c"].map((k) => (
              <UserRowSkeleton key={k} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
