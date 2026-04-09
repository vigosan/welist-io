import { useState } from "react";
import type { Item } from "@/hooks/useItems";

interface Props {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
}

export function ItemRow({ item, onToggle, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (trimmed && trimmed !== item.text) onEdit(trimmed);
    setEditing(false);
  }

  return (
    <div
      data-testid={`item-row-${item.id}`}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors ${
        item.done ? "bg-gray-100" : "bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <button
        onClick={onToggle}
        data-testid={`item-checkbox-${item.id}`}
        aria-label={item.done ? "Marcar como pendiente" : "Marcar como hecho"}
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          item.done
            ? "bg-green-500 shadow-sm shadow-green-200"
            : "border-2 border-gray-300 hover:border-indigo-400"
        }`}
      >
        {item.done && (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
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
          <span
            data-testid={`item-text-${item.id}`}
            onDoubleClick={() => !item.done && setEditing(true)}
            className={`text-sm font-medium cursor-default select-none ${
              item.done ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {item.text}
          </span>
        )}
      </div>

      <button
        onClick={onDelete}
        data-testid={`item-delete-${item.id}`}
        aria-label="Eliminar"
        className="shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
