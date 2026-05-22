import { createFileRoute, Link } from "@tanstack/react-router";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { AppNav } from "@/components/AppNav";
import { FollowButton } from "@/components/FollowButton";
import { StarRatingDisplay } from "@/components/StarRating";
import {
  useUserAchievements,
  useUserActivity,
  useUserProfile,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import type { UserAchievement } from "@/services/lists.service";

export const Route = createFileRoute("/u/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = Route.useParams();
  const { data: profile, isLoading } = useUserProfile(userId);
  const { data: achievements = [] } = useUserAchievements(userId);
  const { data: activity = [] } = useUserActivity(userId);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-black/[0.04] dark:bg-white/[0.06] animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-32 bg-black/[0.04] dark:bg-white/[0.06] rounded animate-pulse" />
              <div className="h-3 w-20 bg-black/[0.03] dark:bg-white/[0.04] rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-2">
            {Array.from({ length: 3 }, (_, i) => i).map((i) => (
              <div
                key={`sk-${i}`}
                className="h-16 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
            {t("error.notFound")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10 flex flex-col gap-8">
        <Link
          to="/users"
          className="text-sm text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors duration-150 w-fit"
        >
          {t("directory.backToUsers")}
        </Link>

        <div className="flex items-center gap-4">
          {profile.image ? (
            <img
              src={profile.image}
              alt={profile.name ?? ""}
              className="w-14 h-14 rounded-full outline outline-1 outline-black/10 dark:outline-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.10] flex items-center justify-center">
              <span className="text-xl font-bold text-[#0c0c0b] dark:text-[#f0ede8]">
                {(profile.name ?? "?")[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0c0c0b] dark:text-[#f0ede8]">
              {profile.name ?? "Anonymous"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
              {profile.publicLists.length}{" "}
              {t("profile.publicLists").toLowerCase()} ·{" "}
              {profile.completedChallenges.length}{" "}
              {t("profile.completedChallenges").toLowerCase()}
            </p>
          </div>
        </div>

        <FollowButton userId={userId} />

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold text-gray-500 dark:text-[#a0a09c] uppercase tracking-wider">
            {t("profile.activity")}
          </h2>
          <ActivityHeatmap days={activity} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold text-gray-500 dark:text-[#a0a09c] uppercase tracking-wider">
            {t("profile.achievements")}
          </h2>
          {achievements.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
              {t("profile.noAchievements")}
            </p>
          ) : (
            <ul
              data-testid="achievements-list"
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5"
            >
              {achievements.map((a: UserAchievement) => {
                const unlocked = a.unlockedAt !== null;
                const pct = Math.round((a.progress / a.target) * 100);
                return (
                  <li
                    key={a.type}
                    data-testid={`achievement-${a.type}`}
                    data-unlocked={unlocked ? "true" : "false"}
                    title={t(`achievements.${a.type}.description`)}
                    className="flex items-center gap-3 py-1"
                  >
                    <span
                      aria-hidden="true"
                      className={`text-sm shrink-0 ${
                        unlocked
                          ? "text-[#0c0c0b] dark:text-[#f0ede8]"
                          : "text-gray-300 dark:text-[#52524e]"
                      }`}
                    >
                      ★
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-sm truncate ${
                            unlocked
                              ? "text-[#0c0c0b] dark:text-[#f0ede8] font-medium"
                              : "text-gray-500 dark:text-[#a0a09c]"
                          }`}
                        >
                          {t(`achievements.${a.type}.title`)}
                        </span>
                        <span
                          data-testid={`achievement-progress-${a.type}`}
                          className="text-[11px] tabular-nums text-gray-400 dark:text-[#6b6b67] shrink-0"
                        >
                          {a.progress} / {a.target}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-[2px] rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden"
                        aria-hidden="true"
                      >
                        <div
                          className={`h-full ${
                            unlocked
                              ? "bg-gray-900 dark:bg-[#f0ede8]"
                              : "bg-gray-400 dark:bg-[#6b6b67]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold text-gray-500 dark:text-[#a0a09c] uppercase tracking-wider">
            {t("profile.publicLists")}
          </h2>
          {profile.publicLists.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
              {t("profile.noPublicLists")}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {profile.publicLists.map((list) => (
                <Link
                  key={list.id}
                  to="/explore/$listId"
                  params={{ listId: list.slug ?? list.id }}
                  className="group bg-white dark:bg-white/[0.02] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-4 flex flex-col gap-2 hover:border-black/[0.18] dark:hover:border-white/[0.18] transition-[border-color] duration-150 no-underline"
                  data-testid={`profile-list-${list.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0c0c0b] dark:text-[#f0ede8] leading-snug truncate">
                        {list.name}
                      </p>
                      {list.description && (
                        <p className="text-sm text-gray-500 dark:text-[#a0a09c] mt-0.5 line-clamp-1">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <svg
                      aria-hidden="true"
                      className="text-gray-300 dark:text-[#6b6b67] group-hover:text-gray-500 dark:group-hover:text-[#a0a09c] w-4 h-4 shrink-0 mt-0.5 transition-colors duration-150"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#a0a09c] tabular-nums">
                    <span>
                      {t("profile.items", { count: String(list.itemCount) })}
                    </span>
                    {list.participantCount > 0 && (
                      <>
                        <span>·</span>
                        <span>
                          {t("profile.participants", {
                            count: String(list.participantCount),
                          })}
                        </span>
                      </>
                    )}
                    {list.rating.count > 0 && (
                      <>
                        <span>·</span>
                        <StarRatingDisplay
                          avg={list.rating.avg}
                          count={list.rating.count}
                        />
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold text-gray-500 dark:text-[#a0a09c] uppercase tracking-wider">
            {t("profile.completedChallenges")}
          </h2>
          {profile.completedChallenges.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
              {t("profile.noCompletedChallenges")}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {profile.completedChallenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  to="/explore/$listId"
                  params={{ listId: challenge.slug ?? challenge.id }}
                  className="bg-white dark:bg-white/[0.02] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] px-4 py-3 flex items-center justify-between gap-3 hover:border-black/[0.18] dark:hover:border-white/[0.18] transition-[border-color] duration-150 no-underline"
                  data-testid={`profile-challenge-${challenge.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-gray-500 dark:text-[#a0a09c] shrink-0"
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
                    <span className="text-sm font-medium text-[#0c0c0b] dark:text-[#f0ede8] truncate">
                      {challenge.name}
                    </span>
                  </div>
                  {challenge.completedAt && (
                    <span className="text-xs text-gray-500 dark:text-[#a0a09c] shrink-0 tabular-nums">
                      {new Date(challenge.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
