import { useTranslation } from "@/i18n/service";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  resultCount: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ListSearchBar({
  value,
  onChange,
  onClose,
  resultCount,
  inputRef,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="shrink-0 px-3 pb-2">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <svg
          aria-hidden="true"
          className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          placeholder={t("list.searchPlaceholder")}
          aria-label={t("list.searchAriaLabel")}
          data-testid="search-input"
          className="flex-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
        />
        {value && (
          <span className="text-xs text-gray-400 tabular-nums shrink-0">
            {t("list.results", { count: resultCount })}
          </span>
        )}
        <button
          type="button"
          aria-label={t("list.closeSearch")}
          onClick={onClose}
          data-testid="search-close"
          className="cursor-pointer text-gray-400 hover:text-gray-600 transition"
        >
          <svg
            aria-hidden="true"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
