import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/service";
import { LIST_CATEGORIES, type ListCategory } from "@/lib/categories";
import { CategoryIcon } from "@/lib/categoryIcons";

type Props = {
  value: ListCategory | null;
  onChange: (value: ListCategory | null) => void;
};

export function CategoryCombobox({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="category-select"
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer inline-flex items-center gap-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none hover:border-gray-400 transition"
      >
        {value ? (
          <>
            <CategoryIcon
              category={value}
              size={14}
              className="text-gray-500"
            />
            <span>{t(`categories.${value}`)}</span>
          </>
        ) : (
          <span className="text-gray-400">{t("categories.none")}</span>
        )}
        <ChevronDown size={12} className="text-gray-400" aria-hidden="true" />
      </button>
      {open && (
        <div
          data-testid="category-combobox-panel"
          className="absolute right-0 top-full mt-1.5 z-50 w-64 bg-canvas dark:bg-canvas-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <button
            type="button"
            data-testid="category-option-none"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
              value === null
                ? "text-gray-900 dark:text-gray-100 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <X
              size={14}
              className="text-gray-400 shrink-0"
              aria-hidden="true"
            />
            {t("categories.none")}
          </button>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <div className="max-h-72 overflow-y-auto grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
            {LIST_CATEGORIES.map((c) => {
              const active = value === c;
              return (
                <button
                  key={c}
                  type="button"
                  data-testid={`category-option-${c}`}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={`cursor-pointer flex items-center gap-2 px-3 py-2 text-xs transition-colors bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 ${
                    active
                      ? "text-gray-900 dark:text-gray-100 font-medium"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <CategoryIcon
                    category={c}
                    size={14}
                    className={
                      active
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500"
                    }
                  />
                  <span className="truncate">{t(`categories.${c}`)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
