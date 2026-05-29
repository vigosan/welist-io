import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { SectionHeading, SectionKicker } from "@/components/ui";
import { useTranslation } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

type HelpSectionData = { title: string; items: string[] };

function HelpSection({
  index,
  title,
  items,
  defaultOpen,
}: {
  index: number;
  title: string;
  items: readonly string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const numberLabel = String(index + 1).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-canvas transition-colors duration-200 hover:border-ink/30 dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-paper/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="text-[11px] text-muted tabular-nums shrink-0 font-mono">
          {numberLabel}
        </span>
        <span className="flex-1 text-sm font-semibold text-ink dark:text-paper tracking-[0.01em]">
          {title}
        </span>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-muted transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {items.map((item) => (
            <div key={item} className="flex gap-2.5 py-1.5">
              <span className="shrink-0 mt-0.5 text-[11px] text-muted">→</span>
              <span className="text-sm leading-[1.6] text-ink/85 dark:text-paper/80">
                {renderInlineMarkdown(item)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HelpPage() {
  const { t } = useTranslation();
  const sections = t("help.sections", {
    returnObjects: true,
  }) as unknown as HelpSectionData[];

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 py-10">
        <div className="max-w-[760px] mx-auto px-4 sm:px-12">
          <div className="mb-9">
            <SectionKicker>{t("help.nav")}</SectionKicker>
            <div className="mt-3.5 mb-3">
              <SectionHeading>{t("help.title")}</SectionHeading>
            </div>
            <p className="text-sm text-muted">{t("help.subtitle")}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {sections.map((section, i) => (
              <HelpSection
                key={section.title}
                index={i}
                title={section.title}
                items={section.items}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
