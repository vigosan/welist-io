import { useEffect, useState } from "react";
import type { Action } from "@/components/CommandPalette";
import type { List } from "@/db/schema";
import { useTranslation } from "@/i18n/service";
import { fireConfetti } from "@/lib/confetti";

interface Options {
  list: List | undefined;
  allTags: string[];
  allPlaces: string[];
  activeTag: string | undefined;
  activePlace: string | undefined;
  statusFilter: "all" | "pending" | "done";
  viewMode: "list" | "map";
  isOwner: boolean;
  addInputRef: React.RefObject<HTMLInputElement | null>;
  handleShare: () => void;
  handleExport: () => void;
  pickRandomItem: () => void;
  setActiveTag: (t: string | null) => void;
  setActivePlace: (p: string | undefined) => void;
  setStatusFilter: (s: "all" | "pending" | "done") => void;
  setViewMode: (v: "list" | "map") => void;
  setNameValue: (v: string) => void;
  setEditingName: (v: boolean) => void;
  togglePublicMutate: (v: boolean) => void;
  toggleCollaborativeMutate: (v: boolean) => void;
  onDelete: () => void;
  onSearch: () => void;
}

export function useCommandPalette({
  list,
  allTags,
  allPlaces,
  activeTag,
  activePlace,
  statusFilter,
  viewMode,
  isOwner,
  addInputRef,
  handleShare,
  handleExport,
  pickRandomItem,
  setActiveTag,
  setActivePlace,
  setStatusFilter,
  setViewMode,
  setNameValue,
  setEditingName,
  togglePublicMutate,
  toggleCollaborativeMutate,
  onDelete,
  onSearch,
}: Options) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onSearch();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [onSearch]);

  const filtersActive = !!activeTag || !!activePlace || statusFilter !== "all";

  const paletteActions: Action[] = [
    {
      id: "search",
      label: t("command.searchItems"),
      onSelect: onSearch,
    },
    {
      id: "add-item",
      label: t("command.addItem"),
      onSelect: () => addInputRef.current?.focus(),
    },
    {
      id: "toggle-view",
      label: viewMode === "list" ? t("command.showMap") : t("command.showList"),
      onSelect: () => setViewMode(viewMode === "list" ? "map" : "list"),
    },
    {
      id: "random-item",
      label: t("command.randomItem"),
      onSelect: pickRandomItem,
    },
    {
      id: "share",
      label: t("command.copyLink"),
      onSelect: handleShare,
    },
    {
      id: "export",
      label: t("command.export"),
      onSelect: handleExport,
    },
    ...(isOwner
      ? [
          {
            id: "toggle-public",
            label: list?.public
              ? t("command.makePrivate")
              : t("command.makePublic"),
            onSelect: () => togglePublicMutate(!list?.public),
          },
          {
            id: "toggle-collaborative",
            label: list?.collaborative
              ? t("command.makeNonCollaborative")
              : t("command.makeCollaborative"),
            onSelect: () => toggleCollaborativeMutate(!list?.collaborative),
          },
          {
            id: "rename",
            label: t("command.rename"),
            onSelect: () => {
              setNameValue(list?.name ?? "");
              setEditingName(true);
            },
          },
        ]
      : []),
    ...allTags.map((tag) => ({
      id: `filter-${tag}`,
      label: t("command.filterByTag", { tag }),
      onSelect: () => setActiveTag(activeTag === tag ? null : tag),
    })),
    ...allPlaces.map((place) => ({
      id: `filter-place-${place}`,
      label: t("command.filterByPlace", { place }),
      onSelect: () => setActivePlace(activePlace === place ? undefined : place),
    })),
    {
      id: "filter-all",
      label: t("command.showAll"),
      onSelect: () => setStatusFilter("all"),
    },
    {
      id: "filter-pending",
      label: t("command.showPending"),
      onSelect: () => setStatusFilter("pending"),
    },
    {
      id: "filter-done",
      label: t("command.showDone"),
      onSelect: () => setStatusFilter("done"),
    },
    ...(activeTag
      ? [
          {
            id: "clear-filter",
            label: t("command.clearTagFilter"),
            onSelect: () => setActiveTag(null),
          },
        ]
      : []),
    ...(filtersActive
      ? [
          {
            id: "clear-all-filters",
            label: t("command.clearAllFilters"),
            onSelect: () => {
              setActiveTag(null);
              setActivePlace(undefined);
              setStatusFilter("all");
            },
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            id: "delete-list",
            label: t("command.deleteList"),
            onSelect: onDelete,
          },
        ]
      : []),
    {
      id: "confetti",
      label: t("command.testConfetti"),
      onSelect: fireConfetti,
    },
  ];

  function openPalette() {
    setPaletteOpen(true);
  }

  return { paletteOpen, setPaletteOpen, openPalette, paletteActions };
}
