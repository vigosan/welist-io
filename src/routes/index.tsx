import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import {
  Chip,
  card,
  Progress,
  SectionHeading,
  SectionKicker,
  StatusPill,
} from "@/components/ui";
import {
  useCreateList,
  useExplore,
  useStats,
  useUserDirectory,
} from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const PREVIEW_FEATURED = {
  name: "Pueblos más bonitos de España",
  slug: "pueblos-mas-bonitos-espana",
  items: [
    { id: "p1", text: "Osuna, Sevilla", done: true },
    { id: "p2", text: "Zafra, Badajoz", done: true },
    { id: "p3", text: "Ribadeo, Lugo", done: true },
    { id: "p4", text: "Sigüenza, Guadalajara", done: false },
    { id: "p5", text: "Cardona, Barcelona", done: false },
  ],
  participantCount: 3,
};

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "";
          el.style.animation = "fadeInUp 0.6s ease-out both";
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function HeroBadge() {
  const { t } = useTranslation();
  return (
    <span
      data-testid="hero-badge"
      className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-canvas px-2.5 py-1 text-[12px] text-muted dark:border-white/[0.08] dark:bg-canvas-dark"
    >
      <span className="rounded-full bg-ink px-2 py-px text-[10px] font-semibold uppercase tracking-[0.04em] text-canvas dark:bg-paper dark:text-canvas-dark">
        {t("home.heroBadgeTag")}
      </span>
      <span>{t("home.heroBadgeText")}</span>
    </span>
  );
}

function Headline() {
  const { t } = useTranslation();
  const words = t("home.headline").split(".").filter(Boolean);
  return (
    <h1
      className="font-bold text-ink dark:text-paper"
      style={{
        fontSize: "clamp(56px, 9vw, 104px)",
        letterSpacing: "-0.045em",
        lineHeight: 0.92,
        textWrap: "balance",
      }}
    >
      {words.map((word, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: word order is stable
          key={i}
          className="block"
          style={{
            animation: `rise 0.7s ${0.05 + i * 0.12}s cubic-bezier(0.2, 0.7, 0.25, 1) both`,
          }}
        >
          {word.trim()}.
        </span>
      ))}
    </h1>
  );
}

function CreateForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const createList = useCreateList();
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed)
      createList.mutate(trimmed, {
        onSuccess: (list) =>
          navigate({ to: "/lists/$listId", params: { listId: list.id } }),
      });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={[
        "flex w-full items-center gap-1.5 rounded-2xl border bg-canvas p-1.5 transition-colors duration-200 dark:bg-canvas-dark",
        focused
          ? "border-ink/30 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] dark:border-paper/30"
          : "border-black/[0.08] dark:border-white/[0.08]",
      ].join(" ")}
    >
      <span aria-hidden="true" className="ml-2 text-muted">
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
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("home.listNamePlaceholder")}
        aria-label={t("home.listNameAriaLabel")}
        data-testid="list-name-input"
        className="flex-1 min-w-0 bg-transparent px-1 py-1.5 text-[14px] text-ink placeholder-muted outline-none focus-visible:outline-none! dark:text-paper"
      />
      <kbd className="hidden sm:inline-block font-mono text-[10px] text-muted border border-black/[0.08] rounded px-1 py-px mr-1 dark:border-white/[0.08]">
        ⏎
      </kbd>
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="create-list-btn"
        className="shrink-0 cursor-pointer rounded-xl border-none bg-ink px-4 py-2 text-[12.5px] font-semibold tracking-[0.01em] text-paper transition active:scale-[0.96] hover:bg-black disabled:cursor-not-allowed disabled:opacity-[0.75] dark:bg-paper dark:text-ink dark:hover:bg-white"
      >
        {createList.isPending ? "…" : `${t("home.createList")} →`}
      </button>
    </form>
  );
}

function MetaRow() {
  const { t } = useTranslation();
  const items = [
    t("home.metaNoSignup"),
    t("home.metaFreeStart"),
    t("home.metaSell"),
  ];
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-muted">
      {items.map((label) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-grid h-3.5 w-3.5 place-items-center rounded-full bg-ink text-canvas dark:bg-paper dark:text-canvas-dark"
          >
            <svg
              aria-hidden="true"
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          {label}
        </span>
      ))}
    </div>
  );
}

type ExploreItem = {
  id: string;
  text: string;
  done: boolean;
};

function PreviewRow({ item, idx }: { item: ExploreItem; idx: number }) {
  return (
    <div
      data-testid="preview-row"
      className={[
        "flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-150",
        "hover:bg-black/[0.025] dark:hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          item.done
            ? "bg-ink border-ink dark:bg-paper dark:border-paper"
            : "border-black/15 bg-canvas dark:border-white/20 dark:bg-canvas-dark",
        ].join(" ")}
      >
        <svg
          aria-hidden="true"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-canvas dark:text-canvas-dark transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            opacity: item.done ? 1 : 0,
            transform: item.done ? "scale(1)" : "scale(0.4)",
            filter: item.done ? "blur(0px)" : "blur(2px)",
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span
        className={[
          "flex-1 text-[14px] leading-tight tracking-[-0.005em] transition-[color,text-decoration-color] duration-500",
          item.done
            ? "text-muted line-through decoration-muted"
            : "text-ink decoration-transparent dark:text-paper",
        ].join(" ")}
      >
        {item.text}
      </span>
      {idx < 3 && (
        <span
          aria-hidden="true"
          className="inline-grid h-[22px] w-[22px] place-items-center rounded-full bg-ink font-mono text-[10px] font-medium text-canvas dark:bg-paper dark:text-canvas-dark"
        >
          {String.fromCharCode(67 + idx)}
        </span>
      )}
    </div>
  );
}

function ProductPreview() {
  const { t } = useTranslation();
  const featured = PREVIEW_FEATURED;
  const total = featured.items.length;
  const targetDoneCount = featured.items.filter((i) => i.done).length;
  const [doneFlags, setDoneFlags] = useState<boolean[]>(() =>
    new Array(total).fill(false)
  );

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDoneFlags(featured.items.map((_, i) => i < targetDoneCount));
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current = new Array(total).fill(false);
    let lastPick = -1;
    const MIN_GAP = 1300;
    const MAX_GAP = 2600;
    const step = () => {
      if (cancelled) return;
      let pick = Math.floor(Math.random() * total);
      if (pick === lastPick) pick = (pick + 1) % total;
      lastPick = pick;
      current = current.map((v, i) => (i === pick ? !v : v));
      setDoneFlags(current);
      timer = setTimeout(step, MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
    };
    timer = setTimeout(step, 700);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [total, targetDoneCount]);

  const items = featured.items.map((it, i) => ({
    ...it,
    done: doneFlags[i] ?? false,
  }));
  const done = doneFlags.filter(Boolean).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const slug = featured.slug;

  return (
    <div className="relative" data-testid="product-preview">
      <div
        className="rounded-3xl border border-black/[0.08] bg-canvas shadow-[0_30px_60px_-30px_rgba(0,0,0,0.18),0_60px_100px_-50px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-canvas-dark"
        style={{
          transform: "perspective(2000px) rotateY(-3deg) rotateX(2deg)",
        }}
      >
        {/* browser bar */}
        <div className="flex items-center gap-2 border-b border-black/[0.06] px-3.5 py-3 dark:border-white/[0.06]">
          <span className="h-2.5 w-2.5 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-black/10 dark:bg-white/15" />
          <span className="ml-2 flex flex-1 items-center gap-1.5 rounded-md bg-black/[0.04] px-3 py-1.5 font-mono text-[11px] text-muted dark:bg-white/[0.04]">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full border border-muted"
            />
            welist.io/
            <strong className="font-medium text-ink dark:text-paper">
              {slug}
            </strong>
          </span>
        </div>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className="truncate text-[18px] font-semibold leading-tight tracking-[-0.02em] text-ink dark:text-paper"
                data-testid="preview-title"
              >
                {featured.name}
              </h3>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {t("home.previewItems", { count: total })}
                {` · ${t("home.previewChallengers", { count: featured.participantCount })}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Share"
                className="inline-grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-black/[0.08] bg-canvas text-muted hover:border-black/20 hover:text-ink transition dark:border-white/[0.08] dark:bg-canvas-dark dark:hover:border-white/20 dark:hover:text-paper"
              >
                <svg
                  aria-hidden="true"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
              </button>
            </div>
          </div>

          {/* progress */}
          <Progress value={pct} className="mt-4 h-1.5" />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-muted">
            <span>{t("home.previewCompletedShort", { done, total })}</span>
            <span className="font-medium text-ink dark:text-paper">{pct}%</span>
          </div>

          {/* items */}
          <div className="mt-5 flex flex-col gap-1">
            {items.slice(0, 5).map((item, idx) => (
              <PreviewRow key={item.id} item={item} idx={idx} />
            ))}
          </div>
        </div>
      </div>

      {/* float card */}
      {featured.participantCount > 0 ? (
        <div
          className="absolute -bottom-6 -right-2 sm:right-0 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-paper shadow-[0_18px_40px_-16px_rgba(0,0,0,0.4)] dark:bg-paper dark:text-canvas-dark"
          style={{ animation: "float-y 4s ease-in-out infinite" }}
        >
          <span className="font-mono text-[20px] font-medium tracking-[-0.02em]">
            +{featured.participantCount}
          </span>
          <span className="text-[12px] leading-tight">
            {t("home.previewFloatTook")}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.55] dark:opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-ink) 10%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 30% 35%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 30% 35%, black 30%, transparent 75%)",
          animation: "hero-drift 28s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block dark:opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-paper) 12%, transparent) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 30% 35%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 30% 35%, black 30%, transparent 75%)",
          animation: "hero-drift 28s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  return (
    <section className="relative px-4 pt-16 pb-16 sm:px-12 sm:pt-24 sm:pb-20">
      <HeroBackdrop />
      <div className="mx-auto grid max-w-[1240px] items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <div>
          <div className="mb-7">
            <HeroBadge />
          </div>
          <Headline />
          <p
            className="mt-7 text-muted"
            style={{ fontSize: 17, maxWidth: 460, lineHeight: 1.55 }}
          >
            {t("home.tagline")}
          </p>
          <div className="mt-8 max-w-[520px]">
            <CreateForm />
          </div>
          <MetaRow />
        </div>
        <div className="hidden lg:block">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const { t } = useTranslation();
  const explore = useExplore();
  const labels = (explore.data?.pages?.[0]?.items ?? [])
    .slice(0, 8)
    .map((l) => l.name);
  const fallback = [
    "Pueblos más bonitos de España",
    "Planes para conocerse mejor en pareja",
    "Rutas en bici · Asturias",
    "Discos que cambian la vida",
    "Películas de Wong Kar-wai",
    "Bares con barra de mármol · Madrid",
    "100 libros antes de los 30",
  ];
  const list = labels.length > 0 ? labels : fallback;
  const loop = [...list, ...list];

  return (
    <section className="border-y border-black/[0.06] bg-black/[0.015] py-6 overflow-hidden dark:border-white/[0.06] dark:bg-white/[0.015]">
      <p className="mb-3 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
        {t("home.tickerLabel")}
      </p>
      <div
        className="flex w-max gap-12 whitespace-nowrap"
        style={{ animation: "marquee 50s linear infinite" }}
      >
        {loop.map((label, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: marquee loop, stable order
            key={`${label}-${i}`}
            className="flex items-center gap-12 text-[15px] font-medium tracking-[-0.01em] text-ink dark:text-paper"
          >
            {label}
            <span
              aria-hidden="true"
              className="inline-block h-1 w-1 rounded-full bg-muted/40"
            />
          </span>
        ))}
      </div>
    </section>
  );
}

function StepIcon({ kind }: { kind: "plus" | "share" | "bolt" }) {
  return (
    <span className="inline-grid h-9 w-9 place-items-center rounded-[10px] border border-black/[0.08] bg-canvas text-ink dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper">
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "plus" && <path d="M12 5v14M5 12h14" />}
        {kind === "share" && (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
          </>
        )}
        {kind === "bolt" && (
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        )}
      </svg>
    </span>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const ref = useFadeIn();

  const steps: {
    num: string;
    title: string;
    desc: string;
    tag: string;
    icon: "plus" | "share" | "bolt";
  }[] = [
    {
      num: "01",
      title: t("home.step1Title"),
      desc: t("home.step1Desc"),
      tag: t("home.step1Tag"),
      icon: "plus",
    },
    {
      num: "02",
      title: t("home.step2Title"),
      desc: t("home.step2Desc"),
      tag: t("home.step2Tag"),
      icon: "share",
    },
    {
      num: "03",
      title: t("home.step3Title"),
      desc: t("home.step3Desc"),
      tag: t("home.step3Tag"),
      icon: "bolt",
    },
  ];

  return (
    <section className="border-t border-black/[0.08] px-4 py-20 sm:px-12 dark:border-white/[0.08]">
      <div ref={ref} className="mx-auto max-w-[1240px]">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <SectionKicker>{t("home.howKicker")}</SectionKicker>
            <div className="mt-3.5 max-w-[16ch]">
              <SectionHeading size="lg">{t("home.howHeadline")}</SectionHeading>
            </div>
          </div>
          <Link
            to="/explore"
            className="rounded-full border border-black/[0.08] px-3.5 py-2 text-[13px] text-muted no-underline hover:border-ink hover:text-ink transition-colors dark:border-white/[0.08] dark:hover:border-paper dark:hover:text-paper"
          >
            {t("home.howDemoCta")}
          </Link>
        </div>

        <div className="grid gap-px overflow-hidden rounded-3xl border border-black/[0.08] bg-black/[0.08] sm:grid-cols-3 dark:border-white/[0.08] dark:bg-white/[0.08]">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="flex flex-col gap-4 bg-canvas p-7 transition-colors duration-300 hover:bg-canvas/60 dark:bg-canvas-dark dark:hover:bg-canvas-dark/60"
              data-testid={`step-${i + 1}`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                <span>{s.num}</span>
                <StepIcon kind={s.icon} />
              </div>
              <h3 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink dark:text-paper">
                {s.title}
              </h3>
              <p className="flex-1 text-[14px] leading-[1.55] text-muted">
                {s.desc}
              </p>
              <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-ink dark:bg-paper"
                />
                {s.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExploreSection() {
  const ref = useFadeIn();
  const { t } = useTranslation();
  const explore = useExplore();
  const lists = explore.data?.pages?.[0]?.items?.slice(0, 3) ?? [];
  const loading = explore.isLoading;

  const chips = [
    { id: "all", label: t("home.chipAll"), active: true },
    { id: "travel", label: t("home.chipTravel") },
    { id: "culture", label: t("home.chipCulture") },
    { id: "couple", label: t("home.chipCouple") },
    { id: "cooking", label: t("home.chipCooking") },
  ];

  const statuses = [
    t("home.cardStatusActive"),
    t("home.cardStatusNew"),
    t("home.cardStatusOngoing"),
  ];

  return (
    <section className="px-4 py-16 sm:px-12 sm:py-20">
      <div ref={ref} className="mx-auto max-w-[1240px]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionKicker>{t("nav.explore")}</SectionKicker>
            <div className="mt-3.5 max-w-[18ch]">
              <SectionHeading>{t("home.exploreHeadline")}</SectionHeading>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <Chip key={c.id} active={c.active}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                data-testid="proof-cards-skeleton"
                className="h-full rounded-2xl border border-black/[0.08] bg-canvas p-6 dark:border-white/[0.08] dark:bg-canvas-dark"
              >
                <Skeleton variant="text" className="mb-2 h-4 w-2/3" />
                <Skeleton variant="text" className="mb-2 h-3 w-full" />
                <Skeleton variant="text" className="mb-4 h-3 w-5/6" />
                <div className="mt-auto flex gap-4">
                  <Skeleton variant="text" className="h-3 w-16" />
                  <Skeleton variant="text" className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {lists.map((list, idx) => {
              const pct =
                list.itemCount && list.itemCount > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((list.participantCount ?? 0) /
                          Math.max(1, list.itemCount)) *
                          100
                      )
                    )
                  : 0;
              return (
                <Link
                  key={list.id}
                  to="/explore/$listId"
                  params={{ listId: list.slug ?? list.id }}
                  className="block no-underline"
                >
                  <article className={`${card} flex h-full flex-col gap-4 p-5`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                        {list.category ?? "·"}
                      </span>
                      <StatusPill>{statuses[idx % statuses.length]}</StatusPill>
                    </div>
                    <h3 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-ink dark:text-paper">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="line-clamp-3 flex-1 text-[13.5px] leading-[1.55] text-muted">
                        {list.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between border-t border-black/[0.04] pt-3 dark:border-white/[0.04]">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="w-[80px]" />
                        <span className="font-mono text-[11px] text-ink dark:text-paper">
                          {pct}%
                        </span>
                      </div>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                        {t("home.cardParticipants", {
                          count: list.participantCount ?? 0,
                        })}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8">
          <Link
            to="/explore"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted no-underline transition-colors hover:text-ink dark:hover:text-paper"
          >
            {t("home.proofViewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProofAvatars() {
  const { data, isLoading } = useUserDirectory();
  const { t } = useTranslation();
  const users = (data?.pages?.[0]?.users ?? [])
    .filter((u) => u.image)
    .slice(0, 9);
  const total = data?.pages?.[0]?.users.length ?? 0;
  if (isLoading) {
    return (
      <div
        data-testid="proof-avatars-skeleton"
        className="flex items-center gap-5"
      >
        <div className="flex -space-x-2.5">
          {["a", "b", "c", "d", "e"].map((k) => (
            <Skeleton
              key={k}
              variant="circle"
              className="h-9 w-9 outline outline-2 outline-canvas dark:outline-canvas-dark"
            />
          ))}
        </div>
        <Skeleton variant="text" className="h-4 w-48" />
      </div>
    );
  }
  if (users.length === 0) return null;
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <div className="flex -space-x-2.5">
        {users.map((u) => (
          <img
            key={u.id}
            src={u.image ?? ""}
            alt={u.name ?? ""}
            title={u.name ?? ""}
            className="h-9 w-9 rounded-full object-cover outline outline-2 outline-canvas dark:outline-canvas-dark"
          />
        ))}
      </div>
      <p className="text-[13.5px] text-muted">
        {t("home.proofCaption", { count: total > 9 ? `${total}+` : total })}
      </p>
    </div>
  );
}

function BigCta() {
  const ref = useFadeIn();
  const { t } = useTranslation();
  const { data: stats } = useStats();

  function scrollToHero() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="list-name-input"]'
    );
    if (input)
      window.setTimeout(() => input.focus({ preventScroll: true }), 500);
  }

  const tiles = [
    { n: stats?.lists ?? 0, l: t("home.statsLists") },
    { n: stats?.users ?? 0, l: t("home.statsUsers") },
    { n: stats?.challenges ?? 0, l: t("home.statsChallenges") },
    { n: stats?.itemsCompleted ?? 0, l: t("home.statsItems") },
  ];

  return (
    <section className="px-4 pb-20 sm:px-12">
      <div ref={ref} className="mx-auto max-w-[1240px]">
        <div
          className="relative overflow-hidden rounded-3xl bg-ink px-7 py-12 text-paper sm:px-14 sm:py-16 dark:bg-paper dark:text-canvas-dark"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        >
          <div className="grid items-center gap-10 sm:grid-cols-[1.4fr_1fr] sm:gap-16">
            <div>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] opacity-70">
                {t("home.finalKicker")}
              </p>
              <h2
                className="font-bold"
                style={{
                  fontSize: "clamp(32px, 4.5vw, 56px)",
                  letterSpacing: "-0.04em",
                  lineHeight: 0.98,
                }}
              >
                {t("home.finalHeadline")}
              </h2>
              <p className="mt-5 max-w-[380px] text-[15px] opacity-70">
                {t("home.finalDesc")}
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={scrollToHero}
                  data-testid="big-cta-primary"
                  className="inline-flex items-center gap-2 rounded-lg bg-paper px-4 py-2.5 text-[13.5px] font-semibold text-ink transition active:scale-[0.96] hover:bg-white dark:bg-canvas-dark dark:text-paper dark:hover:bg-black"
                >
                  {t("home.finalCta")} →
                </button>
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-lg border border-paper/15 px-4 py-2.5 text-[13.5px] font-medium text-paper no-underline transition hover:border-paper/40 hover:bg-paper/[0.04] dark:border-canvas-dark/15 dark:text-canvas-dark dark:hover:border-canvas-dark/40 dark:hover:bg-canvas-dark/[0.04]"
                >
                  {t("home.bigCtaSecondary")}
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-7">
              {tiles.map((tile) => (
                <div key={tile.l}>
                  <div
                    className="font-bold tabular-nums"
                    style={{
                      fontSize: "clamp(28px, 3.5vw, 42px)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {tile.n.toLocaleString("es-ES")}
                  </div>
                  <div className="mt-2 text-[12.5px] opacity-70">{tile.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 border-t border-paper/10 pt-7 dark:border-canvas-dark/10">
            <ProofAvatars />
          </div>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col dark:bg-canvas-dark dark:text-paper">
      <AppNav />

      <main className="flex-1 flex flex-col">
        <Hero />
        <Ticker />
        <HowItWorks />
        <ExploreSection />
        <BigCta />
      </main>

      <AppFooter />
    </div>
  );
}
