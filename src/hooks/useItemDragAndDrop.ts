import { useRef, useState } from "react";

interface Options {
  itemIds: string[];
  onReorder: (ids: string[]) => void;
}

export function useItemDragAndDrop({ itemIds, onReorder }: Options) {
  const dragItemId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  function handleDragStart(id: string) {
    return (e: React.DragEvent) => {
      dragItemId.current = id;
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverId((prev) => (prev !== id ? id : prev));
    };
  }

  function handleDrop(id: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      const fromId = dragItemId.current;
      if (!fromId || fromId === id) return;
      const ids = [...itemIds];
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(id);
      if (fromIdx === -1 || toIdx === -1) return;
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, fromId);
      onReorder(ids);
      setDragOverId(null);
    };
  }

  function handleDragEnd() {
    dragItemId.current = null;
    setDragOverId(null);
  }

  return {
    dragOverId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
