import { useSession } from "@hono/auth-js/react";
import { useFollowStatus, useToggleFollow } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export function FollowButton({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const me = session?.user?.id;
  const enabled = !!me && me !== userId;
  const { data: status } = useFollowStatus(userId, enabled);
  const toggle = useToggleFollow(userId);

  if (!enabled) return null;

  const isFollowing = !!status?.isFollowing;
  const followerCount = status?.followerCount ?? 0;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        data-testid="follow-btn"
        onClick={() => toggle.mutate(isFollowing)}
        disabled={toggle.isPending}
        className={`cursor-pointer px-4 py-1.5 rounded-xl text-sm font-semibold transition active:scale-[0.96] disabled:opacity-50 ${
          isFollowing
            ? "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-900 hover:text-gray-900 dark:hover:border-gray-300 dark:hover:text-gray-100"
            : "bg-gray-900 text-white hover:bg-black dark:bg-gray-100 dark:text-gray-900"
        }`}
      >
        {isFollowing ? t("profile.following") : t("profile.follow")}
      </button>
      <span
        data-testid="follower-count"
        className="text-xs text-gray-400 dark:text-gray-500 tabular-nums"
      >
        {t("profile.followers", { count: followerCount })}
      </span>
    </div>
  );
}
