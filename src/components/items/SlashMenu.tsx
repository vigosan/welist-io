import type { ReactNode } from "react";
import { useTranslation } from "@/i18n/service";
import type { SlashAction } from "@/lib/slash-menu";

interface ActionDef {
  action: SlashAction;
  labelKey: string;
  hint: string;
  icon: ReactNode;
}

const icon = (path: string) => (
  <svg
    aria-hidden="true"
    className="w-3.5 h-3.5 shrink-0 text-gray-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

export const SLASH_ACTIONS: ActionDef[] = [
  {
    action: "bold",
    labelKey: "list.slashBold",
    hint: "**",
    icon: icon("M6 4h6a4 4 0 0 1 0 8H6zM6 12h7a4 4 0 0 1 0 8H6z"),
  },
  {
    action: "italic",
    labelKey: "list.slashItalic",
    hint: "*",
    icon: icon("M19 4h-9M14 20H5M15 4L9 20"),
  },
  {
    action: "code",
    labelKey: "list.slashCode",
    hint: "`",
    icon: icon("M16 18l6-6-6-6M8 6l-6 6 6 6"),
  },
  {
    action: "link",
    labelKey: "list.slashLink",
    hint: "[ ]( )",
    icon: icon(
      "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"
    ),
  },
  {
    action: "place",
    labelKey: "list.slashPlace",
    hint: "@",
    icon: icon(
      "M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
    ),
  },
  {
    action: "tag",
    labelKey: "list.slashTag",
    hint: "#",
    icon: icon("M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"),
  },
];

interface Props {
  activeIndex: number;
  onSelect: (action: SlashAction) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SlashMenu({ activeIndex, onSelect, className, style }: Props) {
  const { t } = useTranslation();
  return (
    <div
      role="listbox"
      aria-label={t("list.slashMenuAriaLabel")}
      style={style}
      data-testid="slash-menu"
      className={`rounded-xl border border-gray-100 dark:border-gray-800 bg-canvas dark:bg-canvas-dark shadow-lg overflow-hidden py-1 ${className ?? ""}`}
    >
      {SLASH_ACTIONS.map((def, i) => (
        <button
          key={def.action}
          type="button"
          role="option"
          aria-selected={i === activeIndex}
          data-testid={`slash-action-${def.action}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(def.action)}
          className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors duration-100 ${
            i === activeIndex
              ? "bg-gray-100 dark:bg-gray-800 text-ink dark:text-paper"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
          }`}
        >
          {def.icon}
          <span className="flex-1">{t(def.labelKey)}</span>
          <span className="font-mono text-[10.5px] text-muted">{def.hint}</span>
        </button>
      ))}
    </div>
  );
}
