import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
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
        "flex w-full overflow-hidden rounded-2xl border p-1.5 transition-colors duration-200",
        focused
          ? "bg-ink/[0.06] border-ink/20 dark:bg-paper/[0.07] dark:border-paper/[0.18]"
          : "bg-ink/[0.03] border-ink/[0.08] dark:bg-paper/[0.04] dark:border-paper/[0.08]",
      ].join(" ")}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={t("home.listNamePlaceholder")}
        aria-label={t("home.listNameAriaLabel")}
        data-testid="list-name-input"
        className="flex-1 min-w-0 bg-transparent px-3.5 text-[13px] text-ink placeholder-muted outline-none focus-visible:outline-none! dark:text-paper"
      />
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="create-list-btn"
        className="shrink-0 cursor-pointer rounded-xl border-none bg-ink px-5 py-2.5 text-[12px] font-semibold tracking-[0.04em] text-paper transition active:scale-[0.96] hover:bg-black disabled:cursor-not-allowed disabled:opacity-[0.75] dark:bg-paper dark:text-ink dark:hover:bg-white"
      >
        {createList.isPending ? "…" : `${t("home.createList")} →`}
      </button>
    </form>
  );
}

function HeroStats() {
  const { data, isLoading } = useStats();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div
        data-testid="hero-stats-skeleton"
        className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3"
      >
        {["lists", "users", "challenges"].map((k, i, arr) => (
          <div key={k} className="flex items-center gap-2">
            <Skeleton variant="text" className="h-3.5 w-10" />
            <Skeleton variant="text" className="h-3 w-24" />
            {i < arr.length - 1 && (
              <span aria-hidden className="ml-5 text-muted/40">
                ·
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;
  const stats = [
    { value: data.lists, label: t("home.statsLists") },
    { value: data.users, label: t("home.statsUsers") },
    { value: data.challenges, label: t("home.statsChallenges") },
  ];
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[11px] tracking-[0.08em] text-muted">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="font-mono tabular-nums text-[13px] font-semibold text-ink dark:text-paper">
            {s.value.toLocaleString()}
          </span>
          <span className="lowercase">{s.label}</span>
          {i < stats.length - 1 && (
            <span aria-hidden className="ml-5 text-muted/40">
              ·
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center px-4 pt-[90px] pb-[72px] text-center sm:px-12">
      <div
        className="flex w-full flex-col items-center"
        style={{ maxWidth: 560 }}
      >
        <div className="mb-7 inline-block rounded-full border border-ink/[0.08] px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted dark:border-paper/[0.08]">
          {t("home.badge")}
        </div>

        <h1
          className="mb-6 font-bold text-ink dark:text-paper"
          style={{
            fontSize: "clamp(48px, 7vw, 72px)",
            letterSpacing: "-0.04em",
            lineHeight: 1.0,
            textWrap: "balance",
          }}
        >
          {t("home.headline")
            .split(".")
            .filter(Boolean)
            .map((word, i, arr) => (
              <span key={word}>
                {word.trim()}.{i < arr.length - 1 && <br />}
              </span>
            ))}
        </h1>

        <p
          className="mb-10 leading-[1.65] text-muted"
          style={{ fontSize: 15, maxWidth: 380 }}
        >
          {t("home.tagline")
            .split(".")
            .filter(Boolean)
            .map((s, i, arr) => (
              <span key={s}>
                {s.trim()}.{i < arr.length - 1 && <br />}
              </span>
            ))}
        </p>

        <div className="w-full">
          <CreateForm />
        </div>

        <p className="mt-2.5 font-mono text-[10px] text-muted/70">
          {t("home.freeToStart")}
        </p>

        <div className="mt-8 flex items-center gap-4 text-[11px] text-muted">
          <span className="h-px w-12 bg-ink/10 dark:bg-paper/10" />
          <span className="font-mono uppercase tracking-[0.14em]">
            {t("home.heroOr")}
          </span>
          <span className="h-px w-12 bg-ink/10 dark:bg-paper/10" />
        </div>

        <Link
          to="/explore"
          className="group mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-ink no-underline transition active:scale-[0.96] dark:text-paper"
        >
          <span className="border-b border-ink/30 pb-0.5 transition-colors group-hover:border-ink dark:border-paper/30 dark:group-hover:border-paper">
            {t("home.heroExploreCta")} →
          </span>
        </Link>
        <p className="mt-2 text-[12px] text-muted">
          {t("home.heroExploreHint")}
        </p>

        <HeroStats />
      </div>
    </section>
  );
}

function FeaturesGrid() {
  const ref = useFadeIn();
  const { t } = useTranslation();

  const features = [
    { n: "01", title: t("home.feature1Title"), desc: t("home.feature1Desc") },
    { n: "02", title: t("home.feature2Title"), desc: t("home.feature2Desc") },
    { n: "03", title: t("home.feature3Title"), desc: t("home.feature3Desc") },
    { n: "04", title: t("home.feature4Title"), desc: t("home.feature4Desc") },
    { n: "05", title: t("home.feature5Title"), desc: t("home.feature5Desc") },
    { n: "06", title: t("home.feature6Title"), desc: t("home.feature6Desc") },
  ];

  return (
    <section className="border-t border-ink/[0.08] px-4 py-20 sm:px-12 dark:border-paper/[0.08]">
      <div ref={ref} className="mx-auto max-w-[1100px]">
        <div className="mb-12 max-w-xl">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {t("home.featuresKicker")}
          </p>
          <h2
            className="mb-4 font-bold text-ink dark:text-paper"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {t("home.featuresHeadline")}
          </h2>
          <p className="text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
            {t("home.featuresSubline")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.n}
              className="flex flex-col gap-3 rounded-2xl border border-ink/[0.08] bg-ink/[0.015] p-7 transition-colors hover:border-ink/20 dark:border-paper/[0.08] dark:bg-paper/[0.02] dark:hover:border-paper/20"
            >
              <span className="font-mono text-[10px] tabular-nums tracking-[0.12em] text-muted/60">
                {f.n}
              </span>
              <p className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink dark:text-paper">
                {f.title}
              </p>
              <p
                className="text-[12px] text-muted"
                style={{ lineHeight: 1.65 }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    { number: "01", title: t("home.step1Title"), desc: t("home.step1Desc") },
    { number: "02", title: t("home.step2Title"), desc: t("home.step2Desc") },
    { number: "03", title: t("home.step3Title"), desc: t("home.step3Desc") },
    { number: "04", title: t("home.step4Title"), desc: t("home.step4Desc") },
  ];

  return (
    <section className="px-4 pb-20 sm:px-12">
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col gap-3">
            <span className="font-mono text-[10px] tabular-nums tracking-[0.12em] text-muted/60">
              {step.number}
            </span>
            <p className="text-[13px] font-semibold leading-snug tracking-[-0.01em] text-ink dark:text-paper">
              {step.title}
            </p>
            <p className="text-[12px] text-muted" style={{ lineHeight: 1.7 }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExploreSection() {
  const { t } = useTranslation();
  const ref = useFadeIn();
  const { data, isLoading } = useExplore();
  const lists = data?.pages[0]?.items?.slice(0, 3) ?? [];

  if (!isLoading && lists.length === 0) return null;

  return (
    <section className="bg-ink px-4 py-20 sm:px-12 dark:bg-black">
      <div ref={ref} className="mx-auto max-w-[1100px]">
        <div className="mb-10">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/30">
            {t("home.exploreSubline")}
          </p>
          <h2
            className="font-bold text-paper"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              maxWidth: "18ch",
            }}
          >
            {t("home.exploreHeadline")}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                data-testid="explore-section-skeleton"
                className="h-full rounded-2xl border border-paper/[0.07] bg-paper/[0.04] p-6"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {lists.map((list) => (
              <Link
                key={list.id}
                to="/explore/$listId"
                params={{ listId: list.slug ?? list.id }}
                className="no-underline block"
              >
                <div className="h-full rounded-2xl border border-paper/[0.07] bg-paper/[0.04] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-paper/[0.18] cursor-pointer">
                  <p className="mb-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-paper">
                    {list.name}
                  </p>
                  {list.description && (
                    <p
                      className="mb-4 text-[12px] text-paper/30"
                      style={{ lineHeight: 1.6 }}
                    >
                      {list.description}
                    </p>
                  )}
                  <div className="mt-auto flex gap-4">
                    {[
                      { label: list.itemCount, suffix: "items" },
                      { label: list.participantCount, suffix: "retos" },
                    ].map(({ label, suffix }) => (
                      <span
                        key={suffix}
                        className="font-mono text-[11px] text-paper/30"
                      >
                        {label} {suffix}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          to="/explore"
          className="text-[13px] font-medium text-paper/60 no-underline transition-colors duration-150 hover:text-paper"
        >
          {t("home.exploreCtaAll")}
        </Link>
      </div>
    </section>
  );
}

function CreatorsSection() {
  const ref = useFadeIn();
  const { t } = useTranslation();
  const bullets = [
    t("home.creatorsBullet1"),
    t("home.creatorsBullet2"),
    t("home.creatorsBullet3"),
  ];

  return (
    <section className="border-t border-ink/[0.08] px-4 py-20 sm:px-12 dark:border-paper/[0.08]">
      <div
        ref={ref}
        className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center"
      >
        <div>
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {t("home.creatorsKicker")}
          </p>
          <h2
            className="mb-6 font-bold text-ink dark:text-paper"
            style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {t("home.creatorsHeadline")}
          </h2>
          <p
            className="mb-8 text-muted"
            style={{ fontSize: 15, lineHeight: 1.65 }}
          >
            {t("home.creatorsDesc")}
          </p>
          <ul className="flex flex-col gap-3">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-[14px] text-ink dark:text-paper"
              >
                <span
                  aria-hidden
                  className="mt-[7px] inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-ink dark:bg-paper"
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-8 dark:border-paper/[0.08] dark:bg-paper/[0.02]">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between border-b border-ink/[0.08] pb-4 dark:border-paper/[0.08]">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                preview
              </span>
              <span className="font-mono text-[10px] tabular-nums text-muted">
                $19.00
              </span>
            </div>
            <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink dark:text-paper">
              Italia en 14 días
            </p>
            <p className="text-[12px] text-muted" style={{ lineHeight: 1.6 }}>
              Ruta probada por 240 viajeros · 32 lugares · mapa incluido.
            </p>
            <div className="flex items-center gap-1.5 text-[12px] text-ink dark:text-paper">
              {"★★★★★".split("").map((s, i) => (
                <span key={`star-${i.toString()}`}>{s}</span>
              ))}
              <span className="ml-2 font-mono text-[11px] tabular-nums text-muted">
                4.8 · 86
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled
                className="cursor-default rounded-xl bg-ink px-4 py-2 text-[12px] font-semibold text-paper dark:bg-paper dark:text-ink"
              >
                Comprar acceso
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                Stripe
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  const ref = useFadeIn();
  const { data, isLoading } = useUserDirectory();
  const users = (data?.pages[0]?.users ?? [])
    .filter((u) => u.image)
    .slice(0, 9);
  const total = data?.pages[0]?.users.length ?? 0;

  if (!isLoading && users.length === 0) return null;

  return (
    <section className="border-t border-ink/[0.08] dark:border-paper/[0.08]">
      <div
        ref={ref}
        className="mx-auto flex w-full max-w-[1100px] flex-col items-start gap-5 px-4 py-14 sm:flex-row sm:items-center sm:px-12"
      >
        {isLoading ? (
          <>
            <div
              data-testid="community-avatars-skeleton"
              className="flex -space-x-2.5"
            >
              {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((k) => (
                <Skeleton
                  key={k}
                  variant="circle"
                  className="h-9 w-9 outline outline-2 outline-canvas dark:outline-canvas-dark"
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton variant="text" className="h-3.5 w-44" />
              <Skeleton variant="text" className="h-3 w-64" />
            </div>
          </>
        ) : (
          <>
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
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[13px] font-medium text-ink dark:text-paper">
                Únete a {total > 9 ? `${total}+` : total} personas
              </p>
              <p className="text-[12px] text-muted">
                que ya crean y completan listas en welist
              </p>
            </div>
          </>
        )}
        <Link
          to="/users"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted no-underline transition-colors hover:text-ink dark:hover:text-paper"
        >
          ver comunidad →
        </Link>
      </div>
    </section>
  );
}

function FinalCta() {
  const ref = useFadeIn();
  const { t } = useTranslation();

  function scrollToHero() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="list-name-input"]'
    );
    if (input)
      window.setTimeout(() => input.focus({ preventScroll: true }), 500);
  }

  return (
    <section className="border-t border-ink/[0.08] px-4 py-24 text-center sm:px-12 dark:border-paper/[0.08]">
      <div
        ref={ref}
        className="mx-auto flex max-w-[560px] flex-col items-center"
      >
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          {t("home.finalKicker")}
        </p>
        <h2
          className="mb-4 font-bold text-ink dark:text-paper"
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            textWrap: "balance",
          }}
        >
          {t("home.finalHeadline")}
        </h2>
        <p
          className="mb-10 text-muted"
          style={{ fontSize: 15, lineHeight: 1.6 }}
        >
          {t("home.finalDesc")}
        </p>
        <button
          type="button"
          onClick={scrollToHero}
          className="inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-[13px] font-semibold tracking-[0.04em] text-paper transition active:scale-[0.96] hover:bg-black dark:bg-paper dark:text-ink dark:hover:bg-white"
        >
          {t("home.finalCta")} →
        </button>
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
        <FeaturesGrid />
        <HowItWorks />
        <ExploreSection />
        <CreatorsSection />
        <CommunitySection />
        <FinalCta />
      </main>

      <AppFooter />
    </div>
  );
}
