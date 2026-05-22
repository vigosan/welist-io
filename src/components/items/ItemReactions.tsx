import { memo } from "react";
import { useTranslation } from "@/i18n/service";
import { REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";
import type { ReactionAggregate } from "@/services/items.service";

interface Props {
  reactions: ReactionAggregate[];
  onReact: (emoji: ReactionEmoji) => void;
  disabled?: boolean;
}

export const ItemReactions = memo(function ItemReactions({
  reactions,
  onReact,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const byEmoji = new Map(reactions.map((r) => [r.emoji, r]));

  return (
    <div
      className="flex items-center gap-1 mt-1.5"
      data-testid="item-reactions"
    >
      {REACTION_EMOJIS.map((emoji) => {
        const r = byEmoji.get(emoji);
        const mine = r?.mine ?? false;
        const count = r?.count ?? 0;
        return (
          <button
            type="button"
            key={emoji}
            data-testid={`item-reaction-${emoji}`}
            disabled={disabled}
            onClick={() => onReact(emoji)}
            aria-label={t(mine ? "items.reactionRemove" : "items.reactionAdd", {
              emoji,
            })}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors active:scale-[0.96] ${
              mine
                ? "bg-gray-900 text-white border border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                : count > 0
                  ? "bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                  : "text-gray-400 border border-transparent opacity-60 hover:opacity-100 hover:text-gray-700 dark:hover:text-gray-300"
            } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 && (
              <span className="font-mono tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});
