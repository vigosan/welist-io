import { useState } from "react";
import type { Item } from "@/hooks/useItems";
import { parseTags } from "@/lib/tags";

interface Props {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onTagClick?: (tag: string) => void;
}

export function ItemRow({ item, onToggle, onDelete, onEdit, onTagClick }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const { display, tags } = parseTags(item.text);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (trimmed && trimmed !== item.text) onEdit(trimmed);
    setEditing(false);
  }

  return (
    <div
      data-testid={`item-row-${item.id}`}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
        item.done ? "bg-gray-100" : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <button
        onClick={onToggle}
        data-testid={`item-checkbox-${item.id}`}
        aria-label={item.done ? "Marcar como pendiente" : "Marcar como hecho"}
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:scale-[0.96] transition-[transform]"
      >
        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-[background-color,border-color,box-shadow] ${
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
              onBlur={() => handleSubmit()}
              data-testid={`item-edit-input-${item.id}`}
              className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none"
            />
          </form>
        ) : (
          <>
            <span
              data-testid={`item-text-${item.id}`}
              onDoubleClick={() => !item.done && setEditing(true)}
              className={`text-sm font-medium cursor-default select-none ${
                item.done ? "line-through text-gray-400" : "text-gray-800"
              }`}
            >
              {display || item.text}
            </span>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    data-testid={`item-tag-${item.id}-${tag}`}
                    onClick={() => onTagClick?.(tag)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={onDelete}
        data-testid={`item-delete-${item.id}`}
        aria-label="Eliminar"
        className="shrink-0 p-3 -m-1 text-gray-300 hover:text-red-400 transition active:scale-[0.96] rounded-lg hover:bg-red-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
