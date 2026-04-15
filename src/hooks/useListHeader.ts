import { useState, useCallback } from "react";
import { useList, useUpdateName, useUpdateSlug, useUpdateDescription, useTogglePublic } from "./useList";
import { useTranslation } from "@/i18n/service";
import type { ApiError } from "@/lib/api-client";

interface Options {
  listId: string;
  onSlugUpdated: (updated: { slug: string | null; id: string }) => void;
}

export function useListHeader({ listId, onSlugUpdated }: Options) {
  const { data: list, isLoading: listLoading, isError: listError, refetch: refetchList } = useList(listId);
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [copied, setCopied] = useState(false);

  const updateName = useUpdateName(listId);
  const updateSlug = useUpdateSlug(listId);
  const updateDescription = useUpdateDescription(listId);
  const togglePublic = useTogglePublic(listId);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  function startEditingSlug() {
    setSlugValue(list?.slug ?? "");
    setSlugError("");
    setEditingSlug(true);
  }

  function handleSlugSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = slugValue.trim();
    if (!trimmed) return;
    if (trimmed === list?.slug) { setEditingSlug(false); return; }
    setSlugError("");
    updateSlug.mutate(trimmed, {
      onSuccess: (updated) => {
        setEditingSlug(false);
        onSlugUpdated(updated);
      },
      onError: async (err: unknown) => {
        const res = err instanceof Error && "response" in err ? (err as ApiError).response : null;
        const body: unknown = await res?.json().catch(() => ({})) ?? {};
        const isSlugTaken = typeof body === "object" && body !== null && "error" in body && (body as { error: unknown }).error === "slug_taken";
        setSlugError(isSlugTaken ? t("slugError.taken") : t("slugError.saveFailed"));
      },
    });
  }

  return {
    list, listLoading, listError, refetchList,
    editingName, setEditingName, nameValue, setNameValue, updateName,
    editingSlug, setEditingSlug, slugValue, setSlugValue, slugError,
    startEditingSlug, handleSlugSubmit, updateSlug,
    editingDescription, setEditingDescription, descriptionValue, setDescriptionValue, updateDescription,
    copied, handleShare,
    togglePublic,
  };
}
