import { useSession } from "@hono/auth-js/react";
import { useState } from "react";
import {
  useAddComment,
  useDeleteComment,
  useItemComments,
} from "@/hooks/useItems";
import { useTranslation } from "@/i18n/service";
import { privateName } from "@/lib/private-name";

export function CommentThread({
  listId,
  itemId,
  ownerId,
}: {
  listId: string;
  itemId: string;
  ownerId: string | null;
}) {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const myId = session?.user?.id;
  const { data: comments, isLoading } = useItemComments(itemId, listId, true);
  const addComment = useAddComment(listId, itemId);
  const deleteComment = useDeleteComment(listId, itemId);
  const [body, setBody] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || addComment.isPending) return;
    addComment.mutate(trimmed, { onSuccess: () => setBody("") });
  }

  return (
    <div
      data-testid={`comment-thread-${itemId}`}
      className="mt-1 ml-7 mr-2 mb-2 flex flex-col gap-2 border-l border-black/[0.08] dark:border-white/[0.08] pl-3"
    >
      {isLoading && (
        <p className="text-[12px] text-gray-400">{t("items.comments")}…</p>
      )}
      {!isLoading && comments && comments.length === 0 && (
        <p className="text-[12px] text-gray-400 dark:text-gray-500">
          {t("items.commentEmpty")}
        </p>
      )}
      {comments?.map((c) => {
        const canDelete = myId === c.userId || myId === ownerId;
        return (
          <div
            key={c.id}
            data-testid={`comment-${c.id}`}
            className="flex items-start gap-2 group"
          >
            {c.userImage ? (
              <img
                src={c.userImage}
                alt=""
                width={20}
                height={20}
                loading="lazy"
                decoding="async"
                className="mt-0.5 h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/[0.06] dark:bg-white/[0.06] text-[9px] text-gray-500">
                {(c.userName ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                {privateName(c.userName)}
              </span>{" "}
              <span className="text-[13px] text-gray-700 dark:text-gray-300 break-words">
                {c.body}
              </span>
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={() => deleteComment.mutate(c.id)}
                data-testid={`comment-delete-${c.id}`}
                aria-label={t("items.commentDelete")}
                className="cursor-pointer shrink-0 text-gray-300 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
      {myId && (
        <form onSubmit={submit} className="flex items-center gap-2 pt-1">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("items.commentPlaceholder")}
            data-testid={`comment-input-${itemId}`}
            className="flex-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] px-3 py-1.5 text-[13px] text-ink dark:text-paper placeholder-gray-400 outline-none focus:border-black/20 dark:focus:border-white/20"
          />
          <button
            type="submit"
            disabled={!body.trim() || addComment.isPending}
            data-testid={`comment-send-${itemId}`}
            className="cursor-pointer rounded-lg bg-ink px-3 py-1.5 text-[12px] font-semibold text-canvas transition hover:bg-black active:scale-[0.96] disabled:opacity-40 dark:bg-paper dark:text-ink dark:hover:bg-white"
          >
            {t("items.commentSend")}
          </button>
        </form>
      )}
    </div>
  );
}
