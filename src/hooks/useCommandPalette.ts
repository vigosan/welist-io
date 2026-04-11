import { useEffect, useMemo, useState } from "react";
import { fireConfetti } from "@/lib/confetti";
import type { Action } from "@/components/CommandPalette";
import type { List } from "@/db/schema";

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
      { id: "search", label: "Buscar elementos", onSelect: onSearch },
      { id: "add-item", label: "Añadir elemento", onSelect: () => addInputRef.current?.focus() },
      { id: "share", label: "Copiar enlace", onSelect: handleShare },
      {
        id: "toggle-public",
        label: list?.public ? "Hacer privada" : "Hacer pública",
        onSelect: () => togglePublicMutate(!list?.public),
      },
      {
        id: "rename",
        label: "Cambiar nombre",
        onSelect: () => { setNameValue(list?.name ?? ""); setEditingName(true); },
      },
      ...allTags.map((tag) => ({
        id: `filter-${tag}`,
        label: `Filtrar por #${tag}`,
        onSelect: () => setActiveTag(activeTag === tag ? null : tag),
      })),
      { id: "filter-all", label: "Mostrar todos los elementos", onSelect: () => setStatusFilter("all") },
      { id: "filter-pending", label: "Mostrar solo pendientes", onSelect: () => setStatusFilter("pending") },
      { id: "filter-done", label: "Mostrar solo completados", onSelect: () => setStatusFilter("done") },
      ...(activeTag ? [{ id: "clear-filter", label: "Limpiar filtro de tags", onSelect: () => setActiveTag(null) }] : []),
      { id: "confetti", label: "Probar confetti", onSelect: fireConfetti },
    ],
    [list?.public, list?.name, allTags, activeTag, handleShare, addInputRef, setActiveTag, setStatusFilter, setNameValue, setEditingName, togglePublicMutate, onSearch],
  );

  return { paletteOpen, setPaletteOpen, paletteActions };
}
