import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useUserDirectory } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import type { DirectoryUser } from "@/services/lists.service";

export const Route = createFileRoute("/users/")({
  component: UsersDirectoryPage,
});

function UserCard({ user }: { user: DirectoryUser }) {
  const { t } = useTranslation();

  return (
    <Link
      to="/u/$userId"
      params={{ userId: user.id }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition-[border-color] duration-150 active:scale-[0.98]"
      data-testid={`user-card-${user.id}`}
    >
      {user.image ? (
        <img
          src={user.image}
          alt=""
          className="w-10 h-10 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
        />
      ) : (
        <div className="w-10 h-10 rounded-full shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {user.name ?? "—"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {t("directory.lists_other", { count: user.publicListsCount })}
          </span>
          <span className="text-gray-200 dark:text-gray-700 text-xs select-none">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
            {t("directory.completed_other", { count: user.completedChallengesCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}

function UsersDirectoryPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
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
              placeholder={t("directory.searchPlaceholder")}
              aria-label={t("directory.searchAriaLabel")}
              data-testid="directory-search-input"
              className="flex-1 pl-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
            />
            <button
              type="submit"
              className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 transition-[background-color] duration-150 active:scale-[0.96]"
            >
              {t("directory.search")}
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && (
            <p className="text-sm text-gray-400 text-center py-10">
              {t("directory.loading")}
            </p>
          )}
          {!isLoading && userList.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {search ? t("directory.noUsersSearch") : t("directory.noUsers")}
            </p>
          )}
          <div className="flex flex-col gap-2">
            {userList.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>

          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <p className="text-sm text-gray-400 text-center py-4">
              {t("directory.loading")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
