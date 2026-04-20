import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { useUserProfile } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/u/$userId")({
  component: UserProfilePage,
});

function UserProfilePage() {
  const { userId } = Route.useParams();
  const { data: profile, isLoading } = useUserProfile(userId);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8] dark:bg-gray-950 flex flex-col">
        <AppNav />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
            <div className="flex flex-col gap-2">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-2">
            {Array.from({ length: 3 }, (_, i) => i).map((i) => (
              <div
                key={`sk-${i}`}
                className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8] dark:bg-gray-950 flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400">{t("error.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAFAF8] dark:bg-gray-950 flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        <Link
          to="/explore"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150 w-fit"
        >
          {t("explore.backToExplore")}
        </Link>

        <div className="flex items-center gap-4">
          {profile.image ? (
            <img
              src={profile.image}
              alt={profile.name ?? ""}
              className="w-14 h-14 rounded-full outline outline-1 outline-black/10 dark:outline-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xl font-bold text-gray-500 dark:text-gray-400">
                {(profile.name ?? "?")[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {profile.name ?? "Anonymous"}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {profile.publicLists.length}{" "}
              {t("profile.publicLists").toLowerCase()} ·{" "}
              {profile.completedChallenges.length}{" "}
              {t("profile.completedChallenges").toLowerCase()}
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("profile.publicLists")}
          </h2>
          {profile.publicLists.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("profile.noPublicLists")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.publicLists.map((list) => (
                <Link
                  key={list.id}
                  to="/explore/$listId"
                  params={{ listId: list.slug ?? list.id }}
                  className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-[border-color] duration-150"
                  data-testid={`profile-list-${list.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 leading-snug truncate">
                        {list.name}
                      </p>
                      {list.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <svg
                      aria-hidden="true"
                      className="text-gray-200 dark:text-gray-700 w-4 h-4 shrink-0 mt-0.5"
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
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t("profile.completedChallenges")}
          </h2>
          {profile.completedChallenges.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t("profile.noCompletedChallenges")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {profile.completedChallenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  to="/explore/$listId"
                  params={{ listId: challenge.slug ?? challenge.id }}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-600 transition-[border-color] duration-150"
                  data-testid={`profile-challenge-${challenge.id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0"
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
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {challenge.name}
                    </span>
                  </div>
                  {challenge.completedAt && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
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
