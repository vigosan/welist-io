import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useCachedSession } from "@/hooks/useCachedSession";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useMyLists } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

const EASING = "cubic-bezier(0.2, 0, 0, 1)";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalCommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: session } = useCachedSession();

  const debouncedQuery = useDebouncedValue(query, 200);
  const result = useMyLists(debouncedQuery || undefined, "recent", undefined);
  const lists = result?.data?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const rafId = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(rafId);
    }
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab") {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, lists.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const list = lists[selectedIndex];
      if (list) {
        navigate({
          to: "/lists/$listId",
          params: { listId: list.slug ?? list.id },
        });
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && session?.user) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
  }, [open, session?.user]);

  if (!open || !session?.user) return null;

  const activeId = lists[selectedIndex]
    ? `global-list-${lists[selectedIndex].id}`
    : undefined;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay dismisses on click
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      onClick={onClose}
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity 150ms ${EASING}`,
      }}
    >
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("globalSearch.ariaLabel")}
        ref={dialogRef}
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.96) translateY(-4px)",
          transition: `transform 150ms ${EASING}`,
        }}
      >
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={lists.length > 0}
          aria-haspopup="listbox"
          aria-controls="global-search-list"
          aria-activedescendant={activeId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("globalSearch.placeholder")}
          data-testid="global-search-input"
          className="w-full px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none border-b border-gray-100 dark:border-gray-800"
        />
        <div
          id="global-search-list"
          role="listbox"
          aria-label={t("globalSearch.resultsLabel")}
          className="max-h-72 overflow-y-auto py-1.5"
        >
          {lists.length === 0 ? (
            <p
              data-testid="global-search-empty"
              className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500"
            >
              {query ? t("globalSearch.noResults") : t("globalSearch.empty")}
            </p>
          ) : (
            lists.map((list, i) => (
              <button
                type="button"
                key={list.id}
                id={`global-list-${list.id}`}
                role="option"
                aria-selected={i === selectedIndex}
                data-testid={`global-list-${list.id}`}
                onClick={() => {
                  navigate({
                    to: "/lists/$listId",
                    params: { listId: list.slug ?? list.id },
                  });
                  onClose();
                }}
                className={`cursor-pointer w-full text-left px-4 py-2.5 transition-[background-color,color] duration-100 ${
                  i === selectedIndex
                    ? "bg-gray-900 dark:bg-gray-100"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <p
                  className={`text-sm font-medium truncate ${i === selectedIndex ? "text-white dark:text-gray-900" : "text-gray-900 dark:text-gray-100"}`}
                >
                  {list.name}
                </p>
                {list.itemCount > 0 && (
                  <p
                    className={`text-xs mt-0.5 font-variant-numeric tabular-nums ${i === selectedIndex ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"}`}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {list.itemCount} items · {list.doneCount}/{list.itemCount}{" "}
                    done
                  </p>
                )}
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("command.navigate")}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("command.select")}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t("command.close")}
          </span>
        </div>
      </div>
    </div>
  );
}
