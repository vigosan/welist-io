import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/service";

export interface Action {
  id: string;
  label: string;
  onSelect: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  actions: Action[];
}

export function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const action = filtered[selectedIndex];
      if (action) { action.onSelect(); onClose(); }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  const activeId = filtered[selectedIndex] ? `command-option-${filtered[selectedIndex].id}` : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("command.ariaLabel")}
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={filtered.length > 0}
          aria-haspopup="listbox"
          aria-controls="command-palette-list"
          aria-activedescendant={activeId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("command.searchPlaceholder")}
          data-testid="command-palette-input"
          className="w-full px-4 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none border-b border-gray-100"
        />
        <div id="command-palette-list" role="listbox" aria-label={t("command.actionsLabel")} className="max-h-72 overflow-y-auto py-1.5">
          {filtered.length === 0 ? (
            <p data-testid="command-empty" className="px-4 py-3 text-sm text-gray-400">
              {t("command.noResults")}
            </p>
          ) : (
            filtered.map((action, i) => (
              <button
                key={action.id}
                id={`command-option-${action.id}`}
                role="option"
                aria-selected={i === selectedIndex}
                data-testid={`command-action-${action.id}`}
                onClick={() => { action.onSelect(); onClose(); }}
                className={`cursor-pointer w-full text-left px-4 py-2.5 text-sm transition ${
                  i === selectedIndex
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {action.label}
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3">
          <span className="text-xs text-gray-300">{t("command.navigate")}</span>
          <span className="text-xs text-gray-300">{t("command.select")}</span>
          <span className="text-xs text-gray-300">{t("command.close")}</span>
        </div>
      </div>
    </div>
  );
}
