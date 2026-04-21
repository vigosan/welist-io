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

function UserRow({ user }: { user: DirectoryUser }) {
  const { t } = useTranslation();
  const [hov, setHov] = useState(false);

  return (
    <Link
      to="/u/$userId"
      params={{ userId: user.id }}
      data-testid={`user-card-${user.id}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="flex items-center gap-3.5 py-3.5 transition-colors duration-150"
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: hov ? "rgba(0,0,0,0.02)" : "transparent",
      }}
    >
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="w-9 h-9 rounded-full shrink-0 outline outline-1 outline-black/10"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.14)",
            color: "#0c0c0b",
            fontFamily: "'Space Mono', monospace",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {initials(user.name)}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8] mb-0.5">
          {privateName(user.name)}
        </p>
        <p
          className="text-[11px]"
          style={{
            color: "#a0a09c",
            fontFamily: "'Space Mono', monospace",
          }}
        >
          {t("directory.owned_other", { count: user.ownedListsCount })}
          {" · "}
          {t("directory.challenged_other", { count: user.challengerCount })}
          {" · "}
          {t("directory.completed_other", {
            count: user.completedChallengesCount,
          })}
          {" · "}
          {t("directory.collaborated_other", {
            count: user.collaboratorCount,
          })}
        </p>
      </div>
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
    <div className="min-h-dvh bg-[#f8f7f5] dark:bg-[#0c0c0b] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-12 py-10">
        <form
          onSubmit={handleSearch}
          className="flex overflow-hidden rounded-lg transition-all duration-200"
          style={{
            border: `1px solid ${focused ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}`,
            background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
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
          {userList.map((user) => (
            <UserRow key={user.id} user={user} />
          ))}
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
