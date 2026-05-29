import { useTranslation } from "@/i18n/service";
import type { Place } from "@/services/geocoding.service";

interface Props {
  results: Place[];
  loading: boolean;
  query: string;
  onSelect: (place: Place) => void;
  className?: string;
  style?: React.CSSProperties;
  preventBlurOnSelect?: boolean;
}

export function GeocodingDropdown({
  results,
  loading,
  query,
  onSelect,
  className,
  style,
  preventBlurOnSelect,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={style}
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${className ?? ""}`}
    >
      {loading && (
        <div className="px-3 py-2 text-xs text-gray-400">
          {t("list.addPlace")}…
        </div>
      )}
      {!loading && results.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-400">
          {t("list.noResults", { query })}
        </div>
      )}
      {results.map((result) => (
        <button
          key={`${result.latitude}-${result.longitude}`}
          type="button"
          onMouseDown={
            preventBlurOnSelect ? (e) => e.preventDefault() : undefined
          }
          onClick={() => onSelect(result)}
          className="cursor-pointer w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b last:border-0 border-gray-100 dark:border-gray-700"
        >
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              fillRule="evenodd"
              d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.07-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.007 3.864-5.175 3.864-9.15C20.15 5.413 16.415 2 12 2 7.585 2 3.85 5.413 3.85 10.174c0 3.975 1.92 7.143 3.864 9.15a19.58 19.58 0 002.683 2.282 16.975 16.975 0 001.144.742zM12 13.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
              clipRule="evenodd"
            />
          </svg>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {result.name}
            </div>
            {(result.city || result.country) && (
              <div className="text-xs text-gray-400 truncate">
                {[result.city, result.country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
