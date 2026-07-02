import type { ReactNode } from "react";
import { useTranslation } from "@/i18n/service";

interface Props {
  hasPendingItems: boolean;
  copied: boolean;
  isOwner: boolean;
  onPickRandom: () => void;
  onOpenPalette: () => void;
  onShare: () => void;
  onExport: () => void;
  onToggleSettings: () => void;
  onDelete: () => void;
  onClose: () => void;
}

type MenuItem = {
  id: string;
  testId: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  show: boolean;
  keepOpen?: boolean;
  dividerBefore?: boolean;
  destructive?: boolean;
};

const iconClass = "w-4 h-4 text-gray-400 shrink-0";

export function ListDropdownMenu({
  hasPendingItems,
  copied,
  isOwner,
  onPickRandom,
  onOpenPalette,
  onShare,
  onExport,
  onToggleSettings,
  onDelete,
  onClose,
}: Props) {
  const { t } = useTranslation();

  const items: MenuItem[] = [
    {
      id: "random",
      testId: "random-item-btn",
      label: t("list.pickRandom"),
      show: hasPendingItems,
      onSelect: onPickRandom,
      icon: (
        <svg
          aria-hidden="true"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <rect
            x="2"
            y="2"
            width="20"
            height="20"
            rx="3"
            ry="3"
            strokeWidth={2}
          />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "palette",
      testId: "command-palette-btn",
      label: t("list.commandPalette"),
      show: true,
      onSelect: onOpenPalette,
      icon: (
        <svg
          aria-hidden="true"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "share",
      testId: "share-btn",
      label: copied ? t("list.linkCopied") : t("list.shareLink"),
      show: true,
      onSelect: onShare,
      icon: (
        <svg
          aria-hidden="true"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {copied ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          )}
        </svg>
      ),
    },
    {
      id: "export",
      testId: "export-btn",
      label: t("list.exportText"),
      show: true,
      keepOpen: true,
      onSelect: onExport,
      icon: (
        <svg
          aria-hidden="true"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      ),
    },
    {
      id: "settings",
      testId: "settings-btn",
      label: t("list.settings"),
      show: isOwner,
      dividerBefore: true,
      onSelect: onToggleSettings,
      icon: (
        <svg
          aria-hidden="true"
          className={iconClass}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      id: "delete",
      testId: "delete-list-btn",
      label: t("list.deleteMenuItem"),
      show: isOwner,
      destructive: true,
      onSelect: onDelete,
      icon: (
        <svg
          aria-hidden="true"
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="absolute right-0 top-full mt-1.5 z-50 w-max bg-canvas dark:bg-canvas-dark border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
      <span aria-live="polite" className="sr-only">
        {copied ? t("list.linkCopied") : ""}
      </span>
      {items
        .filter((item) => item.show)
        .map((item) => (
          <div key={item.id}>
            {item.dividerBefore && (
              <div className="border-t border-gray-100 dark:border-gray-800" />
            )}
            <button
              type="button"
              onClick={() => {
                item.onSelect();
                if (!item.keepOpen) onClose();
              }}
              data-testid={item.testId}
              className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors whitespace-nowrap ${
                item.destructive
                  ? "text-ink dark:text-paper hover:bg-gray-100 dark:hover:bg-gray-800"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          </div>
        ))}
    </div>
  );
}
