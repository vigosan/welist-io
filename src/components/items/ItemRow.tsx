import { useRef, useState } from "react";
import type { Item } from "@/hooks/useItems";
import { parseTags, tagColor } from "@/lib/tags";
import { useTranslation } from "@/i18n/service";

interface Props {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
  canWrite?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
}

export function ItemRow({ item, onToggle, onDelete, onEdit, onTagClick, activeTag, canWrite = true, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const cancelled = useRef(false);
  const { display, tags } = parseTags(item.text);
  const { t } = useTranslation();

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (trimmed && trimmed !== item.text) onEdit(trimmed);
    setEditing(false);
  }

  function handleCancel() {
    cancelled.current = true;
    setText(item.text);
    setEditing(false);
  }

  return (
    <div
      data-testid={`item-row-${item.id}`}
      draggable={canWrite && !!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors ${
        isDragOver ? "bg-gray-200" : item.done ? "bg-gray-100" : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      {canWrite && onDragStart && (
        <span className="hidden sm:flex shrink-0 text-gray-300 cursor-grab active:cursor-grabbing touch-none select-none">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </span>
      )}
      <button
        onClick={canWrite ? onToggle : undefined}
        data-testid={`item-checkbox-${item.id}`}
        aria-label={item.done ? t("items.markPending") : t("items.markDone")}
        className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform ${canWrite ? "cursor-pointer active:scale-[0.96]" : "cursor-default"}`}
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-[background-color,border-color] ${
          item.done
            ? "bg-gray-900"
            : "border-2 border-gray-300 hover:border-gray-600"
        }`}>
          {item.done && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <form onSubmit={handleSubmit}>
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); handleCancel(); } }}
              onBlur={() => { if (!cancelled.current) handleSubmit(); cancelled.current = false; }}
              data-testid={`item-edit-input-${item.id}`}
              className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none"
            />
          </form>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span
              data-testid={`item-text-${item.id}`}
              onDoubleClick={canWrite && !item.done ? () => setEditing(true) : undefined}
              className={`text-sm font-medium cursor-default select-none leading-snug ${
                item.done ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {display || item.text}
            </span>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    data-testid={`item-tag-${item.id}-${tag}`}
                    onClick={() => onTagClick?.(tag)}
                    className={`cursor-pointer inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors active:scale-[0.96] ${
                      activeTag === tag
                        ? "bg-gray-900 text-white"
                        : "bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {canWrite && (
        <button
          onClick={onDelete}
          data-testid={`item-delete-${item.id}`}
          aria-label={t("items.delete", { text: display || item.text })}
          className="cursor-pointer shrink-0 w-11 h-11 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors active:scale-[0.96]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );
}
