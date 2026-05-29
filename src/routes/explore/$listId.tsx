import { signIn, useSession } from "@hono/auth-js/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ParticipantsPanel } from "@/components/lists/ParticipantsPanel";
import { SectionHeading, SectionKicker } from "@/components/ui";
import {
  useAcceptChallenge,
  useExploreDetail,
  useExploreItems,
} from "@/hooks/useList";
import { useTrackOnMount } from "@/hooks/useTrackOnMount";
import { useTranslation } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { privateName } from "@/lib/private-name";
import { parseTags } from "@/lib/tags";

export const Route = createFileRoute("/explore/$listId")({
  component: ExploreDetailPage,
});

function ExploreDetailPage() {
  const { listId } = Route.useParams();
  useTrackOnMount({ type: "list_view", listId });
  const { data: detail, isLoading } = useExploreDetail(listId);
  const { data: exploreItems, isLoading: itemsLoading } = useExploreItems(
    listId,
    !!detail
  );
  const acceptChallenge = useAcceptChallenge();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showChallengers, setShowChallengers] = useState(false);

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
  const challengers = detail?.challengers ?? [];
  const shownParticipants = challengers.slice(0, 6);
  const extraParticipants = totalParticipants - shownParticipants.length;
  const completedParticipants = detail?.completedParticipants ?? [];

  const itemCount = detail?.itemCount ?? 0;

  if (isLoading) {
    return (
      <div className="h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
          <div
            data-testid="skeleton"
            className="h-4 w-24 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
          />
          <div className="flex flex-col gap-2">
            <div
              data-testid="skeleton"
              className="h-6 w-2/3 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
            />
            <div
              data-testid="skeleton"
              className="h-4 w-1/3 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
            />
          </div>
          <div
            data-testid="skeleton"
            className="h-40 rounded-2xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
          />
          <div
            data-testid="skeleton"
            className="h-10 rounded-xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
          />
        </main>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted">{t("error.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
        <Link
          to="/explore"
          className="text-sm text-muted hover:text-ink dark:hover:text-paper transition-colors duration-150 w-fit"
          data-testid="back-to-explore"
        >
          {t("explore.backToExplore")}
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SectionKicker>{t("nav.explore")}</SectionKicker>
            <div className="mt-3.5">
              <SectionHeading size="sm">{detail.name}</SectionHeading>
            </div>
            {detail.owner?.name && (
              <p className="text-xs text-muted mt-2">
                {detail.ownerId ? (
                  <Link
                    to="/u/$userId"
                    params={{ userId: detail.ownerId }}
                    className="hover:text-ink dark:hover:text-paper transition-colors"
                  >
                    {t("explore.createdBy", {
                      name: privateName(detail.owner.name),
                    })}
                  </Link>
                ) : (
                  t("explore.createdBy", {
                    name: privateName(detail.owner.name),
                  })
                )}
              </p>
            )}
            {detail.description && (
              <p className="text-sm text-muted leading-relaxed mt-2">
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-black/[0.08] bg-canvas dark:border-white/[0.08] dark:bg-canvas-dark">
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-muted"
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
            <span className="text-xs font-medium text-muted tabular-nums">
              {itemCount}
            </span>
          </div>
          {shownParticipants.length > 0 && (
            <button
              type="button"
              onClick={() => setShowChallengers((v) => !v)}
              aria-expanded={showChallengers}
              aria-label={`${challengers.length} challengers`}
              data-testid="challengers-toggle"
              className="cursor-pointer flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <div className="flex -space-x-1.5">
                {shownParticipants.map((p) =>
                  p.image ? (
                    <img
                      key={p.id}
                      src={p.image}
                      alt={p.name ?? ""}
                      className="w-6 h-6 rounded-full outline outline-2 outline-canvas dark:outline-canvas-dark"
                    />
                  ) : (
                    <div
                      key={p.id}
                      className="w-6 h-6 rounded-full bg-black/[0.06] dark:bg-white/[0.06] outline outline-2 outline-canvas dark:outline-canvas-dark flex items-center justify-center"
                    >
                      <span className="text-[8px] text-muted font-medium">
                        {(p.name ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )
                )}
              </div>
              {extraParticipants > 0 && (
                <span className="text-xs text-muted tabular-nums">
                  {t("explore.moreParticipants", {
                    count: String(extraParticipants),
                  })}
                </span>
              )}
            </button>
          )}
        </div>

        {showChallengers && challengers.length > 0 && (
          <ParticipantsPanel challengers={challengers} collaborators={[]} />
        )}

        <div className="rounded-2xl border border-black/[0.08] bg-canvas dark:border-white/[0.08] dark:bg-canvas-dark overflow-hidden">
          <div className="px-4 py-3">
            {itemsLoading && (
              <p className="text-sm text-muted">{t("explore.loading")}</p>
            )}
            {!itemsLoading && exploreItems && exploreItems.length === 0 && (
              <p className="text-sm text-muted">{t("explore.noItems")}</p>
            )}
            {!itemsLoading && exploreItems && exploreItems.length > 0 && (
              <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                {exploreItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-4 h-4 rounded border shrink-0 border-black/15 dark:border-white/20" />
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: link click passthrough */}
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: link click passthrough */}
                    <span
                      className="text-sm font-medium text-ink dark:text-paper"
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
          <div className="rounded-2xl border border-black/[0.08] bg-canvas dark:border-white/[0.08] dark:bg-canvas-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.05] dark:border-white/[0.05]">
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("hallOfFame.title")}
              </h2>
            </div>
            <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
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
                    <div className="w-6 h-6 rounded-full bg-black/[0.06] dark:bg-white/[0.06] shrink-0 flex items-center justify-center">
                      <span className="text-[9px] text-muted font-medium">
                        {(p.name ?? "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="flex-1 text-sm text-ink/85 dark:text-paper/80 truncate">
                    {p.name ?? t("explore.anonymous")}
                  </span>
                  {p.completedAt && (
                    <span className="text-xs text-muted tabular-nums shrink-0">
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
          className="cursor-pointer w-full py-3 text-sm font-semibold bg-ink text-paper dark:bg-paper dark:text-ink rounded-lg hover:bg-black dark:hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition duration-150 active:scale-[0.96]"
        >
          {session?.user ? t("explore.acceptChallenge") : t("explore.signIn")}
        </button>
      </main>
    </div>
  );
}
