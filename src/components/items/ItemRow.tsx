import { memo, useRef, useState } from "react";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import type { Item } from "@/hooks/useItems";
import { useTranslation } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { parseItemText } from "@/lib/item-text";
import { PARTIAL_PLACE_REGEX } from "@/lib/places";
import type { Coords } from "@/services/items.service";

interface Props {
  item: Item;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string, coords?: Coords | null) => void;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
  onPlaceClick?: (place: string) => void;
  activePlace?: string;
  canWrite?: boolean;
  canToggle?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragOver?: boolean;
  highlighted?: boolean;
}

export const ItemRow = memo(
  function ItemRow({
    item,
    onToggle,
    onDelete,
    onEdit,
    onTagClick,
    activeTag,
    onPlaceClick,
    activePlace,
    canWrite = true,
    canToggle,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
    highlighted,
  }: Props) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(item.text);
    const [pendingCoords, setPendingCoords] = useState<
      Coords | null | undefined
    >(undefined);
    const [geoOpen, setGeoOpen] = useState(false);
    const cancelled = useRef(false);
    const { display, tags, places } = parseItemText(item.text);
    const { t } = useTranslation();
    const effectiveCanToggle = canToggle ?? canWrite;

    const partialPlace = geoOpen
      ? (PARTIAL_PLACE_REGEX.exec(text)?.[1] ?? null)
      : null;
    const geocodingQuery =
      partialPlace !== null && partialPlace.length >= 3 ? partialPlace : "";
    const { results: geocodingResults, isLoading: geocodingLoading } =
      useGeocodingSearch(geocodingQuery);

    function handleSubmit(e?: React.FormEvent) {
      e?.preventDefault();
      const trimmed = text.trim();
      if (trimmed && trimmed !== item.text) onEdit(trimmed, pendingCoords);
      setEditing(false);
      setGeoOpen(false);
      setPendingCoords(undefined);
    }

    function handleCancel() {
      cancelled.current = true;
      setText(item.text);
      setEditing(false);
      setGeoOpen(false);
      setPendingCoords(undefined);
    }

    function handleTextChange(val: string) {
      setText(val);
      const hasAt = PARTIAL_PLACE_REGEX.test(val);
      setGeoOpen(hasAt);
      if (!hasAt) setPendingCoords(item.latitude !== null ? null : undefined);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (geoOpen) {
          setText((v) => v.replace(PARTIAL_PLACE_REGEX, "").trimEnd());
          setGeoOpen(false);
          setPendingCoords(null);
        } else {
          handleCancel();
        }
      }
    }

    const showGeoDropdown =
      geoOpen && partialPlace !== null && partialPlace.length >= 3;

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag container
      <div
        data-testid={`item-row-${item.id}`}
        draggable={canWrite && !!onDragStart}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-3 px-3 py-3.5 rounded-xl transition-colors ${
          isDragOver
            ? "bg-gray-200 dark:bg-gray-700"
            : item.done
              ? "bg-gray-100 dark:bg-gray-800"
              : "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800"
        } ${highlighted ? "ring-2 ring-gray-900 dark:ring-gray-100" : ""}`}
      >
        {canWrite && (
          <span
            aria-hidden="true"
            className={`hidden sm:flex shrink-0 touch-none select-none transition-opacity ${onDragStart ? "text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing" : "text-gray-200 dark:text-gray-700 cursor-default opacity-0"}`}
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
                d="M4 8h16M4 16h16"
              />
            </svg>
          </span>
        )}
        <button
          type="button"
          onClick={effectiveCanToggle ? onToggle : undefined}
          data-testid={`item-checkbox-${item.id}`}
          aria-label={item.done ? t("items.markPending") : t("items.markDone")}
          className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${effectiveCanToggle ? "cursor-pointer active:scale-[0.96]" : "cursor-default"}`}
          style={{ transition: "transform 150ms cubic-bezier(0.2, 0, 0, 1)" }}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              item.done
                ? "bg-gray-900 dark:bg-white"
                : "border-2 border-gray-300 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400"
            }`}
            style={{
              transition:
                "background-color 200ms cubic-bezier(0.2, 0, 0, 1), border-color 200ms cubic-bezier(0.2, 0, 0, 1), transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: item.done ? "scale(1)" : "scale(1)",
            }}
          >
            <svg
              aria-hidden="true"
              className="w-3 h-3 text-white dark:text-gray-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                transition:
                  "opacity 200ms cubic-bezier(0.2, 0, 0, 1), filter 200ms cubic-bezier(0.2, 0, 0, 1), transform 200ms cubic-bezier(0.2, 0, 0, 1)",
                opacity: item.done ? 1 : 0,
                filter: item.done ? "blur(0px)" : "blur(4px)",
                transform: item.done ? "scale(1)" : "scale(0.25)",
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="relative">
              {showGeoDropdown && (
                <div className="absolute bottom-full mb-1 left-0 right-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden z-10">
                  {geocodingLoading && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      {t("list.addPlace")}…
                    </div>
                  )}
                  {!geocodingLoading && geocodingResults.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-400">
                      {t("list.noResults", { query: partialPlace })}
                    </div>
                  )}
                  {geocodingResults.map((result) => (
                    <button
                      key={`${result.latitude}-${result.longitude}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setText((prev) =>
                          prev.replace(PARTIAL_PLACE_REGEX, `@${result.name} `)
                        );
                        setPendingCoords({
                          latitude: result.latitude,
                          longitude: result.longitude,
                          placeName: result.name,
                        });
                        setGeoOpen(false);
                      }}
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
                            {[result.city, result.country]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!cancelled.current) handleSubmit();
                    cancelled.current = false;
                  }}
                  aria-label={display || item.text}
                  data-testid={`item-edit-input-${item.id}`}
                  className="w-full text-sm font-medium text-gray-900 dark:text-gray-100 bg-transparent outline-none"
                />
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: link click passthrough */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: link click passthrough */}
              <span
                data-testid={`item-text-${item.id}`}
                onDoubleClick={
                  canWrite && !item.done ? () => setEditing(true) : undefined
                }
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === "A")
                    e.stopPropagation();
                }}
                className={`text-sm font-medium cursor-default select-none leading-snug ${
                  item.done
                    ? "line-through text-gray-400 dark:text-gray-600"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {renderInlineMarkdown(display || item.text)}
              </span>
              {tags.length > 0 &&
                tags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    data-testid={`item-tag-${item.id}-${tag}`}
                    onClick={() => onTagClick?.(tag)}
                    className={`cursor-pointer inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors active:scale-[0.96] ${
                      activeTag === tag
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              {places.length > 0 &&
                places.map((place) => (
                  <button
                    type="button"
                    key={place}
                    data-testid={`item-place-${item.id}-${place}`}
                    onClick={() => onPlaceClick?.(place)}
                    className={`cursor-pointer inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors active:scale-[0.96] ${
                      activePlace === place
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-200"
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
          )}
        </div>

        {canWrite && (
          <div className="flex items-center gap-0.5 shrink-0">
            {!item.done && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                data-testid={`item-edit-${item.id}`}
                aria-label={t("items.edit", { text: display || item.text })}
                className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors active:scale-[0.96]"
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
                    strokeWidth={1.5}
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              data-testid={`item-delete-${item.id}`}
              aria-label={t("items.delete", {
                text: display || item.text,
              })}
              className="cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors active:scale-[0.96]"
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
                  strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.done === next.item.done &&
    prev.item.text === next.item.text &&
    prev.highlighted === next.highlighted &&
    prev.activeTag === next.activeTag &&
    prev.activePlace === next.activePlace &&
    prev.canWrite === next.canWrite &&
    prev.canToggle === next.canToggle &&
    prev.isDragOver === next.isDragOver &&
    !!prev.onDragStart === !!next.onDragStart
);
