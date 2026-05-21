import { useSession } from "@hono/auth-js/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useToggleFollow, useUserDirectory } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import type { DirectoryUser } from "@/services/lists.service";

export const Route = createFileRoute("/users/")({
  component: UsersDirectoryPage,
});

function privateName(name: string | null): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
          ? "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-900 hover:text-gray-900 dark:hover:border-gray-300 dark:hover:text-gray-100"
          : "bg-gray-900 text-white hover:bg-black dark:bg-[#f0ede8] dark:text-[#0c0c0b]"
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

function UserRow({ user }: { user: DirectoryUser }) {
  const { t } = useTranslation();
  const summary = buildSummary(user, t);
  const achievementsPct = Math.round(
    (user.achievementsUnlocked / Math.max(user.achievementsTotal, 1)) * 100
  );

  return (
    <article
      data-testid={`user-card-${user.id}`}
      className="group relative flex items-center gap-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 transition-colors duration-150 hover:border-black/[0.18] dark:hover:border-white/[0.18]"
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
          className="pointer-events-none w-12 h-12 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <div
          className="pointer-events-none w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[#0c0c0b] dark:text-[#f0ede8] border border-black/[0.08] dark:border-white/[0.10]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {initials(user.name)}
        </div>
      )}
      <div className="pointer-events-none flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#0c0c0b] dark:text-[#f0ede8] truncate mb-0.5">
          {privateName(user.name)}
        </p>
        {summary.length > 0 ? (
          <p className="text-[12px] text-gray-500 dark:text-[#a0a09c] leading-snug">
            {summary.join(" · ")}
          </p>
        ) : (
          <p className="text-[12px] text-gray-400 dark:text-[#6b6b67] italic">
            {t("directory.noActivity")}
          </p>
        )}
        {user.achievementsUnlocked > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-[#6b6b67] shrink-0"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              ★ {user.achievementsUnlocked} / {user.achievementsTotal}
            </span>
            <div
              className="flex-1 h-[2px] rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-gray-900 dark:bg-[#f0ede8]"
                style={{ width: `${achievementsPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <SlimFollowButton userId={user.id} isFollowing={user.isFollowing} />
      </div>
    </article>
  );
}

function UsersDirectoryPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useUserDirectory(search || undefined);
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

  const userList = data?.pages.flatMap((p) => p.users) ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(q.trim());
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
            placeholder={t("directory.searchPlaceholder")}
            aria-label={t("directory.searchAriaLabel")}
            data-testid="directory-search-input"
            className="flex-1 px-4 py-2.5 text-sm text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] dark:placeholder-[#6b6b67] bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-[12px] font-semibold tracking-[0.04em] bg-[#0c0c0b] dark:bg-[#f0ede8] text-[#f8f7f5] dark:text-[#0c0c0b] border-none cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            {t("directory.search")}
          </button>
        </form>

        <div className="mt-7">
          {isLoading && (
            <p className="text-xs text-gray-500 text-center py-10">
              {t("directory.loading")}
            </p>
          )}
          {!isLoading && userList.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-10">
              {search ? t("directory.noUsersSearch") : t("directory.noUsers")}
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            {userList.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </div>
        </div>

        <div ref={sentinelRef} className="h-4" />
        {isFetchingNextPage && (
          <p className="text-xs text-gray-500 text-center py-4">
            {t("directory.loading")}
          </p>
        )}
      </main>
    </div>
  );
}
