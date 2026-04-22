import { useTranslation } from "@/i18n/service";
import { tagColor } from "@/lib/tags";

interface Props {
  statusFilter: "all" | "pending" | "done";
  activeTag: string | undefined;
  activePlace: string | undefined;
  allTags: string[];
  allPlaces: string[];
  onStatusFilter: (s: "all" | "pending" | "done") => void;
  onTagFilter: (tag: string | null) => void;
  onPlaceFilter: (place: string | undefined) => void;
}

export function ListFilterBar({
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

  return (
    <div className="mt-3 -mx-5 order-7 relative">
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-0 w-5 z-10 bg-gradient-to-r from-[#FAFAF8] dark:from-[#0c0c0b] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-[#FAFAF8] dark:from-[#0c0c0b] to-transparent"
        aria-hidden
      />
      <div className="flex flex-wrap gap-1.5 px-5 pb-0.5">
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
            {s === "pending" ? t("list.filterPending") : t("list.filterDone")}
          </button>
        ))}
        {allTags.length > 0 && (
          <div className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />
        )}
        {allTags.map((tag) => (
          <button
            type="button"
            key={tag}
            data-testid={`tag-filter-${tag}`}
            onClick={() => onTagFilter(activeTag === tag ? null : tag)}
            className={`cursor-pointer shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
              activeTag === tag
                ? "border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900"
                : tagColor(tag)
            }`}
          >
            #{tag}
          </button>
        ))}
        {allPlaces.length > 0 && (
          <div className="w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700 mx-0.5" />
        )}
        {allPlaces.map((place) => (
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
            {place}
          </button>
        ))}
      </div>
    </div>
  );
}
