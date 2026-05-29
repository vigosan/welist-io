import { useCallback, useEffect, useRef, useState } from "react";
import {
  useList,
  useTogglePublic,
  useUpdateDescription,
  useUpdateName,
} from "./useList";

interface Options {
  listId: string;
}

export function useListHeader({ listId }: Options) {
  const {
    data: list,
    isLoading: listLoading,
    isError: listError,
    refetch: refetchList,
  } = useList(listId);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const updateName = useUpdateName(listId);
  const updateDescription = useUpdateDescription(listId);
  const togglePublic = useTogglePublic(listId);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    if (copiedTimeoutRef.current !== null) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, []);

  return {
    list,
    listLoading,
    listError,
    refetchList,
    editingName,
    setEditingName,
    nameValue,
    setNameValue,
    updateName,
    editingDescription,
    setEditingDescription,
    descriptionValue,
    setDescriptionValue,
    updateDescription,
    copied,
    handleShare,
    togglePublic,
  };
}
