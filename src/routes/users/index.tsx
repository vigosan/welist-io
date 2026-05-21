import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useUserDirectory } from "@/hooks/useList";
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

function StatChip({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-black/[0.10] dark:border-white/[0.10] px-2.5 py-0.5 text-[11px] text-gray-600 dark:text-[#a0a09c] tabular-nums"
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {label}
    </span>
  );
}

function deriveRole(user: DirectoryUser): "creator" | "challenger" | null {
  const takes = user.challengerCount + user.collaboratorCount;
  if (user.ownedListsCount === 0 && takes === 0) return null;
  if (user.ownedListsCount >= takes) return "creator";
  return "challenger";
}

function RoleChip({ role }: { role: "creator" | "challenger" }) {
  const { t } = useTranslation();
  const label =
    role === "creator"
      ? t("directory.roleCreator")
      : t("directory.roleChallenger");
  return (
    <span className="inline-flex items-center rounded-full border border-gray-900 dark:border-[#f0ede8] bg-gray-900 dark:bg-[#f0ede8] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white dark:text-[#0c0c0b] uppercase">
      {label}
    </span>
  );
}

function UserRow({ user }: { user: DirectoryUser }) {
  const { t } = useTranslation();
  const role = deriveRole(user);
  const chips: string[] = [];
  if (user.ownedListsCount > 0) {
    chips.push(t("directory.owned_other", { count: user.ownedListsCount }));
  }
  if (user.challengerCount > 0) {
    chips.push(
      t("directory.challenged_other", { count: user.challengerCount })
    );
  }
  if (user.completedChallengesCount > 0) {
    chips.push(
      t("directory.completed_other", {
        count: user.completedChallengesCount,
      })
    );
  }
  if (user.collaboratorCount > 0) {
    chips.push(
      t("directory.collaborated_other", { count: user.collaboratorCount })
    );
  }
  if (user.followerCount > 0) {
    chips.push(t("directory.followers_other", { count: user.followerCount }));
  }

  const achievementsPct = Math.round(
    (user.achievementsUnlocked / Math.max(user.achievementsTotal, 1)) * 100
  );

  return (
    <Link
      to="/u/$userId"
      params={{ userId: user.id }}
      data-testid={`user-card-${user.id}`}
      className="group relative flex items-center gap-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 transition-colors duration-150 hover:border-black/[0.18] dark:hover:border-white/[0.18] no-underline"
    >
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="w-12 h-12 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <div
          className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold bg-black/[0.04] dark:bg-white/[0.06] text-[#0c0c0b] dark:text-[#f0ede8] border border-black/[0.08] dark:border-white/[0.10]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {initials(user.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <p className="text-[15px] font-semibold text-[#0c0c0b] dark:text-[#f0ede8] truncate">
            {privateName(user.name)}
          </p>
          {role && <RoleChip role={role} />}
        </div>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((label) => (
              <StatChip key={label} label={label} />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-gray-400 dark:text-[#6b6b67] italic">
            {t("directory.noActivity")}
          </p>
        )}
        <div className="mt-2.5 flex items-center gap-2">
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
      </div>
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-gray-300 dark:text-[#6b6b67] group-hover:text-gray-500 dark:group-hover:text-[#a0a09c] transition-colors duration-150"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
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
          className="flex overflow-hidden rounded-lg transition-all duration-200"
          style={{
            border: `1px solid ${focused ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}`,
            background: focused
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.03)",
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t("directory.searchPlaceholder")}
            aria-label={t("directory.searchAriaLabel")}
            data-testid="directory-search-input"
            className="flex-1 px-4 py-2.5 text-sm text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] bg-transparent outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold tracking-[0.04em] bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] border-none cursor-pointer transition-opacity duration-150"
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
