import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "@/i18n/service";
import { PARTIAL_PLACE_REGEX } from "@/lib/places";
import { tagColor } from "@/lib/tags";
import type { Place } from "@/services/geocoding.service";
import type { Coords } from "@/services/items.service";
import { BulkPastePreview } from "./BulkPastePreview";
import { GeocodingDropdown } from "./GeocodingDropdown";

interface Props {
  newItem: string;
  setNewItem: Dispatch<SetStateAction<string>>;
  pendingBulk: string[] | null;
  setPendingBulk: Dispatch<SetStateAction<string[] | null>>;
  placeDropdownOpen: boolean;
  setPlaceDropdownOpen: (open: boolean) => void;
  setPendingCoords: Dispatch<SetStateAction<Coords | null>>;
  partialPlace: string | null;
  tagSuggestions: string[];
  placeSuggestions: string[];
  geocodingResults: Place[];
  geocodingLoading: boolean;
  addInputRef: React.RefObject<HTMLInputElement | null>;
  addPending: boolean;
  bulkPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onBulkConfirm: () => void;
}

export function AddItemForm({
  newItem,
  setNewItem,
  pendingBulk,
  setPendingBulk,
  placeDropdownOpen,
  setPlaceDropdownOpen,
  setPendingCoords,
  partialPlace,
  tagSuggestions,
  placeSuggestions,
  geocodingResults,
  geocodingLoading,
  addInputRef,
  addPending,
  bulkPending,
  onSubmit,
  onPaste,
  onBulkConfirm,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="relative shrink-0 px-4 pt-3 pb-6 space-y-2">
      {pendingBulk ? (
        <BulkPastePreview
          texts={pendingBulk}
          isPending={bulkPending}
          onChange={setPendingBulk}
          onConfirm={onBulkConfirm}
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
            onSubmit={onSubmit}
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
              onPaste={onPaste}
              placeholder={t("list.addItemPlaceholder")}
              aria-label={t("list.addItemAriaLabel")}
              data-testid="add-item-input"
              className="flex-1 pl-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 bg-transparent outline-none"
            />
            <button
              type="submit"
              disabled={!newItem.trim() || addPending}
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
