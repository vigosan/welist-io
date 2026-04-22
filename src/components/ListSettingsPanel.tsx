import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "@/i18n/service";

type Props = {
  isPublic: boolean;
  isCollaborative: boolean;
  priceInCents: number | null;
  stripeConnected: boolean;
  onTogglePublic: (v: boolean) => void;
  onToggleCollaborative: (v: boolean) => void;
  onSetPrice: (cents: number) => void;
  onRemovePrice: () => void;
  onClose: () => void;
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

export function ListSettingsPanel({
  isPublic,
  isCollaborative,
  priceInCents,
  stripeConnected,
  onTogglePublic,
  onToggleCollaborative,
  onSetPrice,
  onRemovePrice,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const isPaid = priceInCents !== null;
  const [priceInput, setPriceInput] = useState(
    priceInCents !== null ? String(Math.round(priceInCents / 100)) : ""
  );

  function handlePriceTogglePaid() {
    if (!stripeConnected) return;
    if (!isPaid) {
      const cents = Math.round((parseFloat(priceInput) || 1) * 100);
      const clamped = Math.max(100, Math.min(100_000, cents));
      if (!isPublic) onTogglePublic(true);
      onSetPrice(clamped);
    }
  }

  function handlePriceToggleFree() {
    onRemovePrice();
  }

  function handlePriceBlur() {
    const dollars = parseFloat(priceInput);
    if (!Number.isNaN(dollars) && dollars >= 1) {
      const cents = Math.round(dollars * 100);
      const clamped = Math.max(100, Math.min(100_000, cents));
      onSetPrice(clamped);
    }
  }

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
          <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{t("list.visibility")}</span>
        <SegmentedToggle
          leftLabel={t("list.visibilityPrivate")}
          rightLabel={t("list.visibilityPublic")}
          rightActive={isPublic}
          onLeft={() => onTogglePublic(false)}
          onRight={() => onTogglePublic(true)}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{t("list.access")}</span>
        <SegmentedToggle
          leftLabel={t("list.accessSolo")}
          rightLabel={t("list.accessCollaborative")}
          rightActive={isCollaborative}
          onLeft={() => onToggleCollaborative(false)}
          onRight={() => onToggleCollaborative(true)}
        />
      </div>

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
    </div>
  );
}
