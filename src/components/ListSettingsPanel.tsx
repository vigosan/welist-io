import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CategoryCombobox } from "@/components/lists/CategoryCombobox";
import { CollaboratorsManager } from "@/components/lists/CollaboratorsManager";
import {
  useList,
  useToggleCollaborative,
  useTogglePublic,
  useUpdateCategory,
} from "@/hooks/useList";
import {
  useListPrice,
  useRemovePrice,
  useSetPrice,
} from "@/hooks/useListPrice";
import { useListSlugEditor } from "@/hooks/useListSlugEditor";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { useTranslation } from "@/i18n/service";
import type { ListCategory } from "@/lib/categories";

type Props = {
  listId: string;
  onClose: () => void;
  onSlugUpdated: (updated: { slug: string | null; id: string }) => void;
};

function SegmentedToggle({
  leftLabel,
  rightLabel,
  rightActive,
  onLeft,
  onRight,
}: {
  leftLabel: string;
  rightLabel: string;
  rightActive: boolean;
  onLeft: () => void;
  onRight: () => void;
}) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
      <button
        type="button"
        onClick={onLeft}
        data-testid={`seg-left-${leftLabel}`}
        className={`cursor-pointer px-3 py-1.5 transition active:scale-[0.96] ${
          !rightActive
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        {leftLabel}
      </button>
      <button
        type="button"
        onClick={onRight}
        data-testid={`seg-right-${rightLabel}`}
        className={`cursor-pointer px-3 py-1.5 transition active:scale-[0.96] ${
          rightActive
            ? "bg-gray-900 text-white"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
        }`}
      >
        {rightLabel}
      </button>
    </div>
  );
}

function VisibilitySection({ listId }: { listId: string }) {
  const { t } = useTranslation();
  const { data: list } = useList(listId);
  const togglePublic = useTogglePublic(listId);
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{t("list.visibility")}</span>
      <SegmentedToggle
        leftLabel={t("list.visibilityPrivate")}
        rightLabel={t("list.visibilityPublic")}
        rightActive={!!list?.public}
        onLeft={() => togglePublic.mutate(false)}
        onRight={() => togglePublic.mutate(true)}
      />
    </div>
  );
}

function AccessSection({ listId }: { listId: string }) {
  const { t } = useTranslation();
  const { data: list } = useList(listId);
  const toggleCollaborative = useToggleCollaborative(listId);
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{t("list.access")}</span>
      <SegmentedToggle
        leftLabel={t("list.accessSolo")}
        rightLabel={t("list.accessCollaborative")}
        rightActive={!!list?.collaborative}
        onLeft={() => toggleCollaborative.mutate(false)}
        onRight={() => toggleCollaborative.mutate(true)}
      />
    </div>
  );
}

function CategorySection({ listId }: { listId: string }) {
  const { t } = useTranslation();
  const { data: list } = useList(listId);
  const updateCategory = useUpdateCategory(listId);
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{t("list.category")}</span>
      <CategoryCombobox
        value={(list?.category ?? null) as ListCategory | null}
        onChange={(v) => updateCategory.mutate(v)}
      />
    </div>
  );
}

function SlugSection({
  listId,
  onSlugUpdated,
}: {
  listId: string;
  onSlugUpdated: Props["onSlugUpdated"];
}) {
  const { t } = useTranslation();
  const {
    list,
    editingSlug,
    setEditingSlug,
    slugValue,
    setSlugValue,
    slugError,
    startEditingSlug,
    handleSlugSubmit,
    updateSlug,
  } = useListSlugEditor({ listId, onSlugUpdated });
  const slug = list?.slug ?? listId;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 shrink-0">
          {t("list.urlLabel")}
        </span>
        {editingSlug ? (
          <form
            onSubmit={handleSlugSubmit}
            className="flex items-center gap-1.5 min-w-0"
          >
            <span className="text-xs text-gray-400 shrink-0">/lists/</span>
            <input
              autoFocus
              value={slugValue}
              onChange={(e) =>
                setSlugValue(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                )
              }
              placeholder="mi-lista"
              aria-label={t("list.confirmSlug")}
              data-testid="slug-input"
              className="text-xs text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-gray-400 w-32 transition"
            />
            <button
              type="submit"
              aria-label={t("list.confirmSlug")}
              disabled={!slugValue.trim() || updateSlug.isPending}
              className="cursor-pointer text-xs text-gray-500 hover:text-gray-900 transition disabled:opacity-40 p-1"
            >
              ✓
            </button>
            <button
              type="button"
              aria-label={t("list.cancelSlug")}
              onClick={() => setEditingSlug(false)}
              className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition p-1"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={startEditingSlug}
            data-testid="edit-slug-btn"
            className="cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition min-w-0"
          >
            <span className="truncate">
              /lists/
              {slug.length > 20 ? `${slug.slice(0, 12)}…` : slug}
            </span>
            <svg
              aria-hidden="true"
              className="w-3 h-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </button>
        )}
      </div>
      {slugError && (
        <p className="text-xs text-gray-400 -mt-2 self-end">{slugError}</p>
      )}
    </>
  );
}

function PriceSection({ listId }: { listId: string }) {
  const { t } = useTranslation();
  const { data: list } = useList(listId);
  const { data: listPrice } = useListPrice(listId, true);
  const { data: stripeStatus } = useStripeAccountStatus(true);
  const togglePublic = useTogglePublic(listId);
  const setPrice = useSetPrice(listId);
  const removePrice = useRemovePrice(listId);

  const priceInCents = listPrice?.priceInCents ?? null;
  const stripeConnected = !!stripeStatus?.onboardingComplete;
  const isPublic = !!list?.public;
  const isPaid = priceInCents !== null;
  const [priceInput, setPriceInput] = useState(
    priceInCents !== null ? String(Math.round(priceInCents / 100)) : ""
  );

  function handlePriceTogglePaid() {
    if (!stripeConnected) return;
    if (!isPaid) {
      const cents = Math.round((parseFloat(priceInput) || 1) * 100);
      const clamped = Math.max(100, Math.min(100_000, cents));
      if (!isPublic) togglePublic.mutate(true);
      setPrice.mutate(clamped);
    }
  }

  function handlePriceToggleFree() {
    removePrice.mutate();
  }

  function handlePriceBlur() {
    const dollars = parseFloat(priceInput);
    if (!Number.isNaN(dollars) && dollars >= 1) {
      const cents = Math.round(dollars * 100);
      const clamped = Math.max(100, Math.min(100_000, cents));
      setPrice.mutate(clamped);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{t("list.price")}</span>
        {!stripeConnected ? (
          <Link
            to="/settings"
            className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 transition"
          >
            {t("list.connectStripe")}
          </Link>
        ) : (
          <SegmentedToggle
            leftLabel={t("list.free")}
            rightLabel={t("list.paid")}
            rightActive={isPaid}
            onLeft={handlePriceToggleFree}
            onRight={handlePriceTogglePaid}
          />
        )}
      </div>

      {isPaid && stripeConnected && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">$</span>
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            onBlur={handlePriceBlur}
            data-testid="price-input"
            placeholder="1"
            className="w-20 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-gray-400 transition tabular-nums"
          />
          <span className="text-xs text-gray-400">USD</span>
        </div>
      )}
    </>
  );
}

export function ListSettingsPanel({ listId, onClose, onSlugUpdated }: Props) {
  const { t } = useTranslation();
  const { data: list } = useList(listId);

  return (
    <div
      data-testid="list-settings-panel"
      className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {t("list.settings")}
        </span>
        <button
          type="button"
          onClick={onClose}
          data-testid="settings-close-btn"
          aria-label="Close settings"
          className="cursor-pointer h-6 w-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-700 transition"
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
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <VisibilitySection listId={listId} />
      <AccessSection listId={listId} />
      <CategorySection listId={listId} />
      <SlugSection listId={listId} onSlugUpdated={onSlugUpdated} />
      <PriceSection listId={listId} />

      <CollaboratorsManager
        listId={listId}
        isCollaborative={!!list?.collaborative}
      />
    </div>
  );
}
