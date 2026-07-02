import { useState } from "react";
import { useTranslation } from "@/i18n/service";
import { tagColor } from "@/lib/tags";

interface Props {
  open: boolean;
  statusFilter: "all" | "pending" | "done";
  activeTag: string | undefined;
  activePlace: string | undefined;
  allTags: string[];
  allPlaces: string[];
  onStatusFilter: (s: "all" | "pending" | "done") => void;
  onTagFilter: (tag: string | null) => void;
  onPlaceFilter: (place: string | undefined) => void;
}

const PIN_SVG = (
  <svg
    aria-hidden="true"
    className="w-2.5 h-2.5 shrink-0"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      fillRule="evenodd"
      d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.007 3.864-5.175 3.864-9.15C20.15 5.413 16.415 2 12 2 7.585 2 3.85 5.413 3.85 10.174c0 3.975 1.92 7.143 3.864 9.15a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
      clipRule="evenodd"
    />
  </svg>
);

export function ListFilterBar({
  open,
  statusFilter,
  activeTag,
  activePlace,
  allTags,
  allPlaces,
  onStatusFilter,
  onTagFilter,
  onPlaceFilter,
}: Props) {
  const { t } = useTranslation();
  const [showAllTags, setShowAllTags] = useState(false);
  const [showAllPlaces, setShowAllPlaces] = useState(false);

  const CHIP_LIMIT = 8;
  const visibleTags = showAllTags ? allTags : allTags.slice(0, CHIP_LIMIT);
  const visiblePlaces = showAllPlaces
    ? allPlaces
    : allPlaces.slice(0, CHIP_LIMIT);

  const hasFilters = statusFilter !== "all" || !!activeTag || !!activePlace;

  if (!open && !hasFilters) return null;

  return (
    <div className="mt-3 order-7">
      {/* Active filter summary pills (collapsed state) */}
      {!open && hasFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {statusFilter !== "all" && (
            <button
              type="button"
              data-testid={`status-filter-${statusFilter}`}
              onClick={() => onStatusFilter("all")}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-400 hover:text-gray-700 transition"
            >
              {statusFilter === "pending"
                ? t("list.filterPending")
                : t("list.filterDone")}
              <span
                aria-hidden
                className="text-gray-300 dark:text-gray-600 leading-none"
              >
                ×
              </span>
            </button>
          )}
          {activeTag && (
            <button
              type="button"
              data-testid={`tag-filter-${activeTag}`}
              onClick={() => onTagFilter(null)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-400 hover:text-gray-700 transition"
            >
              #{activeTag}
              <span
                aria-hidden
                className="text-gray-300 dark:text-gray-600 leading-none"
              >
                ×
              </span>
            </button>
          )}
          {activePlace && (
            <button
              type="button"
              data-testid={`place-filter-${activePlace}`}
              onClick={() => onPlaceFilter(undefined)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-400 hover:text-gray-700 transition"
            >
              {PIN_SVG}
              {activePlace}
              <span
                aria-hidden
                className="text-gray-300 dark:text-gray-600 leading-none"
              >
                ×
              </span>
            </button>
          )}
        </div>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="-mx-5 relative">
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 z-10 bg-gradient-to-r from-canvas dark:from-canvas-dark to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-canvas dark:from-canvas-dark to-transparent"
            aria-hidden
          />
          <div className="flex flex-col gap-2 px-5 pb-1">
            {/* Status */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0">
                {t("list.statusLabel")}
              </span>
              {(["pending", "done"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  data-testid={`status-filter-${s}`}
                  onClick={() => onStatusFilter(statusFilter === s ? "all" : s)}
                  className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    statusFilter === s
                      ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  {s === "pending"
                    ? t("list.filterPending")
                    : t("list.filterDone")}
                </button>
              ))}
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="flex items-start gap-1.5 flex-wrap">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0 pt-0.5">
                  {t("list.tagsLabel")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {visibleTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      data-testid={`tag-filter-${tag}`}
                      onClick={() =>
                        onTagFilter(activeTag === tag ? null : tag)
                      }
                      className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        activeTag === tag
                          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                          : tagColor(tag)
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                  {!showAllTags && allTags.length > CHIP_LIMIT && (
                    <button
                      type="button"
                      data-testid="tags-show-all"
                      onClick={() => setShowAllTags(true)}
                      className="cursor-pointer shrink-0 inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 transition"
                    >
                      +{allTags.length - CHIP_LIMIT}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Places */}
            {allPlaces.length > 0 && (
              <div className="flex items-start gap-1.5 flex-wrap">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-10 shrink-0 pt-0.5">
                  {t("list.placesLabel")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {visiblePlaces.map((place) => (
                    <button
                      type="button"
                      key={place}
                      data-testid={`place-filter-${place}`}
                      onClick={() =>
                        onPlaceFilter(activePlace === place ? undefined : place)
                      }
                      className={`cursor-pointer shrink-0 inline-flex items-center gap-0.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                        activePlace === place
                          ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                          : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {PIN_SVG}
                      {place}
                    </button>
                  ))}
                  {!showAllPlaces && allPlaces.length > CHIP_LIMIT && (
                    <button
                      type="button"
                      data-testid="places-show-all"
                      onClick={() => setShowAllPlaces(true)}
                      className="cursor-pointer shrink-0 inline-flex items-center rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:border-gray-400 hover:text-gray-700 transition"
                    >
                      +{allPlaces.length - CHIP_LIMIT}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
