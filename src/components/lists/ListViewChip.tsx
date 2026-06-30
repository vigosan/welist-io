import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/i18n/service";

interface Props {
  viewMode: "list" | "map";
  onChange: (mode: "list" | "map") => void;
}

export function ListViewChip({ viewMode, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = viewMode === "map";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="view-chip-toggle"
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
          active
            ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        <svg
          aria-hidden="true"
          className="w-2.5 h-2.5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        {t("list.viewChip")}
        <svg
          aria-hidden="true"
          className={`w-2.5 h-2.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1.5 z-50 w-max bg-canvas dark:bg-canvas-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <ViewOption
            testId="view-option-list"
            label={t("list.listView")}
            selected={viewMode === "list"}
            onSelect={() => {
              onChange("list");
              setOpen(false);
            }}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            }
          />
          <ViewOption
            testId="view-option-map"
            label={t("list.mapView")}
            selected={viewMode === "map"}
            onSelect={() => {
              onChange("map");
              setOpen(false);
            }}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            }
          />
        </div>
      )}
    </div>
  );
}

interface OptionProps {
  testId: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
}

function ViewOption({ testId, label, selected, onSelect, icon }: OptionProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      data-testid={testId}
      onClick={onSelect}
      className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors whitespace-nowrap ${
        selected
          ? "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <svg
        aria-hidden="true"
        className="w-4 h-4 text-gray-400 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {icon}
      </svg>
      <span className="flex-1 text-left">{label}</span>
      {selected && (
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5 text-gray-900 dark:text-gray-100 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}
