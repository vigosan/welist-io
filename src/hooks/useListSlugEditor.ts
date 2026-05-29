import { useState } from "react";
import { useTranslation } from "@/i18n/service";
import type { ApiError } from "@/lib/api-client";
import { useList, useUpdateSlug } from "./useList";

interface Options {
  listId: string;
  onSlugUpdated: (updated: { slug: string | null; id: string }) => void;
}

export function useListSlugEditor({ listId, onSlugUpdated }: Options) {
  const { data: list } = useList(listId);
  const { t } = useTranslation();
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState("");
  const [slugError, setSlugError] = useState("");
  const updateSlug = useUpdateSlug(listId);

  function startEditingSlug() {
    setSlugValue(list?.slug ?? "");
    setSlugError("");
    setEditingSlug(true);
  }

  function handleSlugSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = slugValue.trim();
    if (!trimmed) return;
    if (trimmed === list?.slug) {
      setEditingSlug(false);
      return;
    }
    setSlugError("");
    updateSlug.mutate(trimmed, {
      onSuccess: (updated) => {
        setEditingSlug(false);
        onSlugUpdated(updated);
      },
      onError: async (err: unknown) => {
        const res =
          err instanceof Error && "response" in err
            ? (err as ApiError).response
            : null;
        const body: unknown = (await res?.json().catch(() => ({}))) ?? {};
        const isSlugTaken =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          (body as { error: unknown }).error === "slug_taken";
        setSlugError(
          isSlugTaken ? t("slugError.taken") : t("slugError.saveFailed")
        );
      },
    });
  }

  return {
    list,
    editingSlug,
    setEditingSlug,
    slugValue,
    setSlugValue,
    slugError,
    startEditingSlug,
    handleSlugSubmit,
    updateSlug,
  };
}
