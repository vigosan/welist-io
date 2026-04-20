import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMarkAllRead, useNotifications } from "@/hooks/useNotifications";
import { useTranslation } from "@/i18n/service";
import type { AppNotification } from "@/services/lists.service";

function NotificationItem({ n }: { n: AppNotification }) {
  const { t } = useTranslation();
  const isUnread = !n.readAt;
  const date = new Date(n.createdAt).toLocaleDateString();

  const label =
    n.type === "challenge_accepted"
      ? t("notifications.accepted", {
          name: n.actorName ?? t("notifications.someone"),
          list: n.listName ?? "",
        })
      : t("notifications.completed", {
          name: n.actorName ?? t("notifications.someone"),
          list: n.listName ?? "",
        });

  const content = (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${isUnread ? "bg-gray-50 dark:bg-gray-800/60" : ""}`}
    >
      {n.actorImage ? (
        <img
          src={n.actorImage}
          alt={n.actorName ?? ""}
          className="w-7 h-7 rounded-full shrink-0 outline outline-1 outline-black/10 dark:outline-white/10 mt-0.5"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center mt-0.5">
          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
            {(n.actorName ?? "?")[0]?.toUpperCase()}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
          {label}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
          {date}
        </p>
      </div>
      {isUnread && (
        <div className="w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-gray-100 shrink-0 mt-1.5" />
      )}
    </div>
  );

  if (n.listId) {
    return (
      <Link
        to="/explore/$listId"
        params={{ listId: n.listId }}
        className="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}

interface Props {
  userId: string | null | undefined;
}

export function NotificationBell({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const { data: notifs = [] } = useNotifications(!!userId);
  const markAllRead = useMarkAllRead();

  const unreadCount = notifs.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!open) return;
    if (unreadCount > 0) {
      markAllRead.mutate();
    }

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, unreadCount, markAllRead]);

  if (!userId) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="notification-bell"
        aria-label={t("notifications.ariaLabel")}
        className="cursor-pointer relative h-7 w-7 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-150"
      >
        <svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100 text-[8px] font-bold text-white dark:text-gray-900 tabular-nums">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t("notifications.title")}
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                {t("notifications.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                {notifs.map((n) => (
                  <li key={n.id} onClick={() => setOpen(false)}>
                    <NotificationItem n={n} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
