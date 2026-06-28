import { useMemo, useState } from "react";
import { useGeocodingSearch } from "@/hooks/useGeocodingSearch";
import { useAddItem, useBulkAddItems } from "@/hooks/useItems";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useLanguage, useTranslation } from "@/i18n/service";
import { parseBulkText } from "@/lib/bulk-text";
import { BULK_ITEM_LIMIT } from "@/lib/constants";
import { getPartialPlace, PARTIAL_PLACE_REGEX } from "@/lib/places";
import { getPartialTag, tagColor } from "@/lib/tags";
import type { Coords } from "@/services/items.service";
import { BulkPastePreview } from "./BulkPastePreview";
import { GeocodingDropdown } from "./GeocodingDropdown";

interface Props {
  listId: string;
  allTags: string[];
  allPlaces: string[];
  addInputRef: React.RefObject<HTMLInputElement | null>;
}

export function AddItemForm({
  listId,
  allTags,
  allPlaces,
  addInputRef,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [newItem, setNewItem] = useState("");
  const [pendingBulk, setPendingBulk] = useState<string[] | null>(null);
  const [pendingCoords, setPendingCoords] = useState<Coords | null>(null);
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false);

  const addItem = useAddItem(listId);
  const bulkAddItems = useBulkAddItems(listId);
  const speech = useSpeechInput(language, (text) => {
    setNewItem((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
    addInputRef.current?.focus();
  });

  const partialTag = useMemo(() => getPartialTag(newItem), [newItem]);
  const partialPlace = useMemo(() => getPartialPlace(newItem), [newItem]);
  const tagSuggestions = useMemo(
    () =>
      partialTag !== null
        ? allTags.filter((tag) => tag.startsWith(partialTag))
        : [],
    [partialTag, allTags]
  );
  const placeSuggestions = useMemo(
    () =>
      partialPlace !== null
        ? allPlaces.filter((place) =>
            place.toLowerCase().startsWith(partialPlace.toLowerCase())
          )
        : [],
    [partialPlace, allPlaces]
  );

  const geocodingQuery =
    placeDropdownOpen && partialPlace !== null && partialPlace.length >= 3
      ? partialPlace
      : "";
  const { results: geocodingResults, isLoading: geocodingLoading } =
    useGeocodingSearch(geocodingQuery);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newItem.trim();
    if (!trimmed) return;
    addItem.mutate(
      { text: trimmed, coords: pendingCoords ?? undefined },
      {
        onSuccess: () => {
          setNewItem("");
          setPendingCoords(null);
          setPlaceDropdownOpen(false);
        },
      }
    );
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const items = parseBulkText(e.clipboardData.getData("text"));
    if (items.length < 2) return;
    e.preventDefault();
    setPendingBulk(items.slice(0, BULK_ITEM_LIMIT));
    setNewItem("");
  }

  function handleBulkConfirm() {
    if (!pendingBulk) return;
    bulkAddItems.mutate(pendingBulk, {
      onSuccess: () => setPendingBulk(null),
    });
  }

  return (
    <div className="relative shrink-0 px-4 pt-3 pb-6 space-y-2">
      {pendingBulk ? (
        <BulkPastePreview
          texts={pendingBulk}
          isPending={bulkAddItems.isPending}
          onChange={setPendingBulk}
          onConfirm={handleBulkConfirm}
          onCancel={() => setPendingBulk(null)}
        />
      ) : (
        <>
          {tagSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setNewItem((prev) =>
                      prev.replace(/#([a-zA-ZÀ-ÿ\w-]*)$/, `#${tag} `)
                    );
                    addInputRef.current?.focus();
                  }}
                  className={`cursor-pointer inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition active:scale-[0.96] ${tagColor(tag)}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          {placeSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {placeSuggestions.map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => {
                    setNewItem((prev) =>
                      prev.replace(PARTIAL_PLACE_REGEX, `@${place} `)
                    );
                    setPlaceDropdownOpen(false);
                    addInputRef.current?.focus();
                  }}
                  className="cursor-pointer inline-flex items-center gap-0.5 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition active:scale-[0.96]"
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
          {placeDropdownOpen &&
            partialPlace !== null &&
            partialPlace.length >= 3 && (
              <GeocodingDropdown
                results={geocodingResults}
                loading={geocodingLoading}
                query={partialPlace}
                className="absolute bottom-full left-0 right-0 mb-2 z-10"
                onSelect={(result) => {
                  setNewItem((prev) =>
                    prev.replace(PARTIAL_PLACE_REGEX, `@${result.name} `)
                  );
                  setPendingCoords({
                    latitude: result.latitude,
                    longitude: result.longitude,
                    placeName: result.name,
                  });
                  setPlaceDropdownOpen(false);
                  addInputRef.current?.focus();
                }}
              />
            )}
          <form
            onSubmit={handleAdd}
            className="flex gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl"
          >
            <input
              ref={addInputRef}
              value={newItem}
              onChange={(e) => {
                const val = e.target.value;
                setNewItem(val);
                const hasAt = PARTIAL_PLACE_REGEX.test(val);
                setPlaceDropdownOpen(hasAt);
                if (!hasAt) setPendingCoords(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && placeDropdownOpen) {
                  e.preventDefault();
                  setNewItem((v) =>
                    v.replace(PARTIAL_PLACE_REGEX, "").trimEnd()
                  );
                  setPlaceDropdownOpen(false);
                }
              }}
              onPaste={handlePaste}
              placeholder={t("list.addItemPlaceholder")}
              aria-label={t("list.addItemAriaLabel")}
              data-testid="add-item-input"
              className="flex-1 pl-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
            />
            {speech.supported && (
              <button
                type="button"
                onClick={() =>
                  speech.listening ? speech.stop() : speech.start()
                }
                data-testid="add-item-mic"
                aria-label={t("list.dictate")}
                aria-pressed={speech.listening}
                className={`cursor-pointer shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition active:scale-[0.92] ${
                  speech.listening
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 animate-pulse"
                    : "text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
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
                    d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4"
                  />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={!newItem.trim() || addItem.isPending}
              data-testid="add-item-submit"
              className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
            >
              {t("list.addItem")}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
