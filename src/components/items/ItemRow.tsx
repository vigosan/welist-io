import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import type { ItemWithLikes } from "@/hooks/useItems";
import { useTranslation } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";
import { parseItemText } from "@/lib/item-text";
import { PARTIAL_PLACE_REGEX } from "@/lib/places";
import type { Coords } from "@/services/items.service";
import { GeocodingDropdown } from "./GeocodingDropdown";

interface ItemCaps {
  canWrite?: boolean;
  canToggle?: boolean;
  canLike?: boolean;
  canComment?: boolean;
}

interface ItemDragHandlers {
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

interface Props {
  item: ItemWithLikes;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string, coords?: Coords | null) => void;
  onLike?: () => void;
  onComment?: () => void;
  onTagClick?: (tag: string) => void;
  activeTag?: string;
  caps?: ItemCaps;
  dragHandlers?: ItemDragHandlers;
  isDragOver?: boolean;
  highlighted?: boolean;
}

export const ItemRow = memo(
  function ItemRow({
    item,
    onToggle,
    onDelete,
    onEdit,
    onLike,
    onComment,
    onTagClick,
    activeTag,
    caps,
    dragHandlers,
    isDragOver,
    highlighted,
  }: Props) {
    const {
      canWrite = true,
      canToggle,
      canLike = true,
      canComment = true,
    } = caps ?? {};
    const { onDragStart, onDragOver, onDrop, onDragEnd } = dragHandlers ?? {};
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(item.text);
    const [pendingCoords, setPendingCoords] = useState<
      Coords | null | undefined
    >(undefined);
    const [geoOpen, setGeoOpen] = useState(false);
    const cancelled = useRef(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [dropdownRect, setDropdownRect] = useState<{
      left: number;
      top: number;
      width: number;
    } | null>(null);
    const { display, tags } = parseItemText(item.text);
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
      if (trimmed && trimmed !== item.text) {
        let coordsToSend = pendingCoords;
        if (
          coordsToSend === undefined &&
          item.latitude !== null &&
          item.placeName &&
          !trimmed.includes(`@${item.placeName}`)
        ) {
          coordsToSend = null;
        }
        onEdit(trimmed, coordsToSend);
      }
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
      setGeoOpen(PARTIAL_PLACE_REGEX.test(val));
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (geoOpen) {
          setText((v) => v.replace(PARTIAL_PLACE_REGEX, "").trimEnd());
          setGeoOpen(false);
        } else {
          handleCancel();
        }
      }
    }

    const showGeoDropdown =
      geoOpen && partialPlace !== null && partialPlace.length >= 3;

    useEffect(() => {
      if (!showGeoDropdown) {
        setDropdownRect(null);
        return;
      }
      const update = () => {
        if (!inputRef.current) return;
        const r = inputRef.current.getBoundingClientRect();
        setDropdownRect({ left: r.left, top: r.top, width: r.width });
      };
      update();
      window.addEventListener("scroll", update, true);
      window.addEventListener("resize", update);
      return () => {
        window.removeEventListener("scroll", update, true);
        window.removeEventListener("resize", update);
      };
    }, [showGeoDropdown]);

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: drag container
      <div
        data-testid={`item-row-${item.id}`}
        draggable={canWrite && !!onDragStart}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`group/row flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-[background-color,border-color,opacity] duration-200 ${
          isDragOver
            ? "border-ink/20 bg-black/[0.04] dark:border-paper/20 dark:bg-white/[0.05]"
            : item.done
              ? "border-transparent bg-transparent opacity-55 hover:opacity-100 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              : "border-transparent bg-transparent hover:border-black/[0.07] hover:bg-black/[0.02] dark:hover:border-white/[0.08] dark:hover:bg-white/[0.03]"
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
          className={`group shrink-0 w-9 h-9 rounded-full flex items-center justify-center focus-visible:outline-none! ${effectiveCanToggle ? "cursor-pointer active:scale-[0.96]" : "cursor-default"}`}
          style={{ transition: "transform 150ms cubic-bezier(0.2, 0, 0, 1)" }}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-gray-900 dark:group-focus-visible:outline-white ${
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
              {showGeoDropdown &&
                dropdownRect &&
                createPortal(
                  <GeocodingDropdown
                    results={geocodingResults}
                    loading={geocodingLoading}
                    query={partialPlace ?? ""}
                    preventBlurOnSelect
                    className="z-50"
                    style={{
                      position: "fixed",
                      left: dropdownRect.left,
                      top: dropdownRect.top - 4,
                      width: dropdownRect.width,
                      transform: "translateY(-100%)",
                    }}
                    onSelect={(result) => {
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
                  />,
                  document.body
                )}
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-y-0.5 sm:gap-x-1.5 min-w-0">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: link click passthrough */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: link click passthrough */}
              <span
                data-testid={`item-text-${item.id}`}
                data-done={item.done ? "true" : "false"}
                onDoubleClick={
                  canWrite && !item.done ? () => setEditing(true) : undefined
                }
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === "A")
                    e.stopPropagation();
                }}
                className={`text-sm font-medium cursor-default select-none leading-snug sm:truncate line-through ${
                  item.done
                    ? "text-gray-400 dark:text-gray-600"
                    : "text-gray-800 dark:text-gray-200"
                }`}
                style={{
                  textDecorationColor: item.done
                    ? "currentColor"
                    : "transparent",
                  textDecorationThickness: "1.5px",
                  transition:
                    "text-decoration-color 350ms cubic-bezier(0.4, 0, 0.2, 1), color 250ms cubic-bezier(0.2, 0, 0, 1)",
                }}
              >
                {renderInlineMarkdown(display || item.text)}
              </span>
              {tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {tags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      data-testid={`item-tag-${item.id}-${tag}`}
                      onClick={() => onTagClick?.(tag)}
                      className={`cursor-pointer inline-flex items-center rounded-full sm:px-2 sm:py-0.5 text-[11px] sm:text-xs font-medium transition-colors active:scale-[0.96] ${
                        activeTag === tag
                          ? "sm:bg-gray-900 sm:text-white sm:dark:bg-white sm:dark:text-gray-900 text-gray-900 dark:text-gray-100"
                          : "text-gray-500 dark:text-gray-400 sm:bg-gray-200 sm:dark:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 sm:hover:bg-gray-300 sm:dark:hover:bg-gray-600"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center shrink-0">
          {onLike && (
            <button
              type="button"
              onClick={canLike ? onLike : undefined}
              disabled={!canLike}
              data-testid={`item-like-${item.id}`}
              aria-label={item.likedByMe ? t("items.unlike") : t("items.like")}
              aria-pressed={item.likedByMe}
              className={`cursor-pointer w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center gap-1 rounded-md transition-colors active:scale-[0.92] ${
                item.likedByMe
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              } ${canLike ? "" : "cursor-default"}`}
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill={item.likedByMe ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                />
              </svg>
              {item.likeCount > 0 && (
                <span
                  data-testid={`item-like-count-${item.id}`}
                  className="text-[11px] font-mono tabular-nums leading-none"
                >
                  {item.likeCount}
                </span>
              )}
            </button>
          )}
          {onComment && (
            <button
              type="button"
              onClick={canComment ? onComment : undefined}
              disabled={!canComment}
              data-testid={`item-comment-${item.id}`}
              aria-label={t("items.comments")}
              className={`cursor-pointer w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center gap-1 rounded-md transition-colors active:scale-[0.92] ${
                item.commentCount > 0
                  ? "text-gray-900 dark:text-gray-100"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              } ${canComment ? "" : "cursor-default"}`}
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 01-13.5 7.79L3 21l1.21-4.5A9 9 0 1121 12z"
                />
              </svg>
              {item.commentCount > 0 && (
                <span
                  data-testid={`item-comment-count-${item.id}`}
                  className="text-[11px] font-mono tabular-nums leading-none"
                >
                  {item.commentCount}
                </span>
              )}
            </button>
          )}
          {canWrite && !item.done && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              data-testid={`item-edit-${item.id}`}
              aria-label={t("items.edit", { text: display || item.text })}
              className="cursor-pointer w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-[color,opacity] active:scale-[0.92] rounded-md sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={onDelete}
              data-testid={`item-delete-${item.id}`}
              aria-label={t("items.delete", {
                text: display || item.text,
              })}
              className="cursor-pointer w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-[color,opacity] active:scale-[0.92] rounded-md sm:opacity-0 sm:transition-opacity sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.done === next.item.done &&
    prev.item.text === next.item.text &&
    prev.item.likeCount === next.item.likeCount &&
    prev.item.likedByMe === next.item.likedByMe &&
    prev.item.commentCount === next.item.commentCount &&
    prev.highlighted === next.highlighted &&
    prev.activeTag === next.activeTag &&
    prev.caps?.canWrite === next.caps?.canWrite &&
    prev.caps?.canToggle === next.caps?.canToggle &&
    prev.caps?.canLike === next.caps?.canLike &&
    prev.caps?.canComment === next.caps?.canComment &&
    prev.isDragOver === next.isDragOver &&
    !!prev.dragHandlers === !!next.dragHandlers &&
    !!prev.onLike === !!next.onLike &&
    !!prev.onComment === !!next.onComment
);
