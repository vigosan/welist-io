import { useEffect, useMemo, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import type { Action } from "@/components/CommandPalette";
import type { List } from "@/db/schema";
import { useTranslation } from "@/i18n/service";

interface Options {
  list: List | undefined;
  allTags: string[];
  activeTag: string | undefined;
  addInputRef: React.RefObject<HTMLInputElement | null>;
  handleShare: () => void;
  setActiveTag: (t: string | null) => void;
  setStatusFilter: (s: "all" | "pending" | "done") => void;
  setNameValue: (v: string) => void;
  setEditingName: (v: boolean) => void;
  togglePublicMutate: (v: boolean) => void;
  onSearch: () => void;
}

export function useCommandPalette({
  list, allTags, activeTag, addInputRef, handleShare,
  setActiveTag, setStatusFilter, setNameValue, setEditingName, togglePublicMutate, onSearch,
}: Options) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        onSearch();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onSearch]);

  const paletteActions: Action[] = useMemo(
    () => [
      { id: "search", label: t("command.searchItems"), onSelect: onSearch },
      { id: "add-item", label: t("command.addItem"), onSelect: () => addInputRef.current?.focus() },
      { id: "share", label: t("command.copyLink"), onSelect: handleShare },
      {
        id: "toggle-public",
        label: list?.public ? t("command.makePrivate") : t("command.makePublic"),
        onSelect: () => togglePublicMutate(!list?.public),
      },
      {
        id: "rename",
        label: t("command.rename"),
        onSelect: () => { setNameValue(list?.name ?? ""); setEditingName(true); },
      },
      ...allTags.map((tag) => ({
        id: `filter-${tag}`,
        label: t("command.filterByTag", { tag }),
        onSelect: () => setActiveTag(activeTag === tag ? null : tag),
      })),
      { id: "filter-all", label: t("command.showAll"), onSelect: () => setStatusFilter("all") },
      { id: "filter-pending", label: t("command.showPending"), onSelect: () => setStatusFilter("pending") },
      { id: "filter-done", label: t("command.showDone"), onSelect: () => setStatusFilter("done") },
      ...(activeTag ? [{ id: "clear-filter", label: t("command.clearTagFilter"), onSelect: () => setActiveTag(null) }] : []),
      { id: "confetti", label: t("command.testConfetti"), onSelect: fireConfetti },
    ],
    [t, list?.public, list?.name, allTags, activeTag, handleShare, addInputRef, setActiveTag, setStatusFilter, setNameValue, setEditingName, togglePublicMutate, onSearch],
  );

  return { paletteOpen, setPaletteOpen, paletteActions };
}
