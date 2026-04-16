import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import {
  useAcceptChallenge,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { parseTags } from "@/lib/tags";

export const Route = createFileRoute("/explore/$listId")({
  component: ExploreDetailPage,
});

function ExploreDetailPage() {
  const { listId } = Route.useParams();
  const { data: detail, isLoading } = useExploreDetail(listId);
  const { data: exploreItems, isLoading: itemsLoading } = useExploreItems(
    listId,
    !!detail
  );
  const acceptChallenge = useAcceptChallenge();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { t } = useTranslation();

  function handleAccept() {
    const id = detail?.id;
    if (!id) return;
    acceptChallenge.mutate(id, {
      onSuccess: (list) =>
        navigate({
          to: "/lists/$listId",
          params: { listId: list.slug ?? list.id },
        }),
      onError: (err) => {
        if (err.message === "Already participating" && detail) {
          navigate({
            to: "/lists/$listId",
            params: { listId: detail.slug ?? detail.id },
          });
        }
      },
    });
  }

  const totalParticipants = detail?.participantCount ?? 0;
  const shownParticipants = detail?.participants ?? [];
  const extraParticipants = totalParticipants - shownParticipants.length;
  const completedParticipants = detail?.completedParticipants ?? [];

  const itemCount = detail?.itemCount ?? 0;

  if (isLoading) {
    return (
      <div className="h-dvh bg-[#FAFAF8] flex flex-col">
        <AppNav />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="h-6 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-4 w-1/3 rounded-lg bg-gray-200 animate-pulse" />
          </div>
          <div className="h-40 rounded-2xl bg-gray-200 animate-pulse" />
          <div className="h-10 rounded-xl bg-gray-200 animate-pulse" />
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="h-dvh bg-[#FAFAF8] flex flex-col">
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

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        <Link
          to="/explore"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors duration-150 w-fit"
          data-testid="back-to-explore"
        >
          {t("explore.backToExplore")}
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 leading-snug">
              {detail.name}
            </h1>
            {detail.owner?.name && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {detail.ownerId ? (
                  <Link
                    to="/u/$userId"
                    params={{ userId: detail.ownerId }}
                    className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {t("explore.createdBy", { name: detail.owner.name })}
                  </Link>
                ) : (
                  t("explore.createdBy", { name: detail.owner.name })
                )}
              </p>
            )}
            {detail.description && (
              <p className="text-sm text-gray-600 leading-relaxed mt-2">
                {detail.description}
              </p>
            )}
          </div>
          {detail.owner?.image && (
            <img
              src={detail.owner.image}
              alt={detail.owner.name ?? ""}
              className="w-9 h-9 rounded-full shrink-0 outline outline-1 outline-black/10"
            />
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              {itemCount}
            </span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="text-xs font-medium text-gray-500 tabular-nums">
              {totalParticipants}
            </span>
          </div>
        </div>

        {shownParticipants.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {shownParticipants.map((p, i) =>
                p.image ? (
                  <img
                    // biome-ignore lint/suspicious/noArrayIndexKey: participants have no stable ID; names/images may be duplicate
                    key={i}
                    src={p.image}
                    alt={p.name ?? ""}
                    className="w-6 h-6 rounded-full outline outline-2 outline-white"
                  />
                ) : (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: participants have no stable ID; names may be duplicate
                    key={i}
                    className="w-6 h-6 rounded-full bg-gray-200 outline outline-2 outline-white flex items-center justify-center"
                  >
                    <span className="text-[8px] text-gray-500 font-medium">
                      {(p.name ?? "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                )
              )}
            </div>
            {extraParticipants > 0 && (
              <span className="text-xs text-gray-400 tabular-nums">
                {t("explore.moreParticipants", {
                  count: String(extraParticipants),
                })}
              </span>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-4 py-3">
            {itemsLoading && (
              <p className="text-sm text-gray-400">{t("explore.loading")}</p>
            )}
            {!itemsLoading && exploreItems && exploreItems.length === 0 && (
              <p className="text-sm text-gray-400">{t("explore.noItems")}</p>
            )}
            {!itemsLoading && exploreItems && exploreItems.length > 0 && (
              <ul className="divide-y divide-gray-50">
                {exploreItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-4 h-4 rounded border shrink-0 border-gray-300" />
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: link click passthrough */}
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: link click passthrough */}
                    <span
                      className="text-sm text-gray-700"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === "A")
                          e.stopPropagation();
                      }}
                    >
                      {renderInlineMarkdown(parseTags(item.text).display)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {completedParticipants.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("hallOfFame.title")}
              </h2>
            </div>
            <ul className="divide-y divide-gray-50 dark:divide-gray-800">
              {completedParticipants.map((p, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: no stable ID for completed participants
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name ?? ""}
                      className="w-6 h-6 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                        {(p.name ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {p.name ?? "Anonymous"}
                  </span>
                  {p.completedAt && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums shrink-0">
                      {new Date(p.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (session?.user) {
              handleAccept();
            } else {
              signIn("google");
            }
          }}
          disabled={
            acceptChallenge.isPending || detail.ownerId === session?.user?.id
          }
          data-testid="accept-challenge-btn"
          className="cursor-pointer w-full py-3 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96]"
        >
          {session?.user ? t("explore.acceptChallenge") : t("explore.signIn")}
        </button>
      </main>
    </div>
  );
}
