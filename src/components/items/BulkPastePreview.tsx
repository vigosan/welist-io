import { useTranslation } from "@/i18n/service";
import { BULK_ITEM_LIMIT as BULK_LIMIT } from "@/lib/constants";

interface Props {
  texts: string[];
  isPending: boolean;
  onChange: (texts: string[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkPastePreview({
  texts,
  isPending,
  onChange,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();

  function remove(index: number) {
    const next = texts.filter((_, i) => i !== index);
    if (next.length === 0) {
      onCancel();
      return;
    }
    onChange(next);
  }

  return (
    <div
      data-testid="bulk-preview"
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500">
          {t("bulk.header", { count: texts.length })}
          {texts.length === BULK_LIMIT && (
            <span className="ml-1 text-gray-400">
              {t("bulk.maxWarning", { limit: BULK_LIMIT })}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onCancel}
          data-testid="bulk-cancel"
          className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150"
        >
          {t("bulk.cancel")}
        </button>
      </div>

      <ul className="max-h-48 overflow-y-auto py-1">
        {texts.map((text, i) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: texts may be duplicate strings; index combined with text is the only stable key
            key={`${i}-${text}`}
            className="flex items-center gap-2 px-3 py-1.5 group hover:bg-gray-50"
          >
            <span className="flex-1 text-sm text-gray-700 truncate">
              {text}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              data-testid={`bulk-remove-${i}`}
              aria-label={t("bulk.removeItem", { text })}
              className="cursor-pointer shrink-0 text-gray-300 hover:text-gray-500 transition-[color,opacity] duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
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
          </li>
        ))}
      </ul>

      <div className="px-3 py-2.5 border-t border-gray-100">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          data-testid="bulk-confirm"
          className="cursor-pointer w-full py-2 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96]"
        >
          {isPending
            ? t("bulk.adding")
            : t("bulk.confirm", { count: texts.length })}
        </button>
      </div>
    </div>
  );
}
