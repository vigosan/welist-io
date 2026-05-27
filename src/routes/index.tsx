import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { Skeleton } from "@/components/Skeleton";
import {
  useCreateList,
  useExplore,
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

function Hero() {
  const { t } = useTranslation();

  return (
    <section className="flex flex-col items-center justify-center px-4 pt-24 pb-20 text-center sm:px-12 sm:pt-[120px] sm:pb-[100px]">
      <div
        className="flex w-full flex-col items-center"
        style={{ maxWidth: 720 }}
      >
        <h1
          className="mb-8 font-bold text-ink dark:text-paper"
          style={{
            fontSize: "clamp(56px, 10vw, 104px)",
            letterSpacing: "-0.045em",
            lineHeight: 0.95,
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
          className="mb-12 leading-[1.55] text-muted"
          style={{ fontSize: 17, maxWidth: 420 }}
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

        <div className="w-full" style={{ maxWidth: 520 }}>
          <CreateForm />
        </div>

        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted/70">
          {t("home.freeToStart")}
        </p>
      </div>
    </section>
  );
}

function ProofSection() {
  const ref = useFadeIn();
  const { t } = useTranslation();
  const { data: exploreData, isLoading: exploreLoading } = useExplore();
  const { data: usersData, isLoading: usersLoading } = useUserDirectory();
  const lists = exploreData?.pages[0]?.items?.slice(0, 3) ?? [];
  const users = (usersData?.pages[0]?.users ?? [])
    .filter((u) => u.image)
    .slice(0, 9);
  const total = usersData?.pages[0]?.users.length ?? 0;

  if (
    !exploreLoading &&
    !usersLoading &&
    lists.length === 0 &&
    users.length === 0
  )
    return null;

  return (
    <section className="border-t border-ink/[0.08] px-4 py-20 sm:px-12 dark:border-paper/[0.08]">
      <div ref={ref} className="mx-auto max-w-[1100px]">
        {usersLoading ? (
          <div
            data-testid="proof-avatars-skeleton"
            className="mb-14 flex items-center gap-5"
          >
            <div className="flex -space-x-2.5">
              {["a", "b", "c", "d", "e", "f", "g", "h", "i"].map((k) => (
                <Skeleton
                  key={k}
                  variant="circle"
                  className="h-9 w-9 outline outline-2 outline-canvas dark:outline-canvas-dark"
                />
              ))}
            </div>
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
        ) : users.length > 0 ? (
          <div className="mb-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
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
            <p className="text-[14px] text-muted">
              {t("home.proofCaption", {
                count: total > 9 ? `${total}+` : total,
              })}
            </p>
          </div>
        ) : null}

        <h2
          className="mb-8 font-bold text-ink dark:text-paper"
          style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            maxWidth: "18ch",
          }}
        >
          {t("home.exploreHeadline")}
        </h2>

        {exploreLoading ? (
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["a", "b", "c"].map((k) => (
              <div
                key={k}
                data-testid="proof-cards-skeleton"
                className="h-full rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-6 dark:border-paper/[0.08] dark:bg-paper/[0.02]"
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
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {lists.map((list) => (
              <Link
                key={list.id}
                to="/explore/$listId"
                params={{ listId: list.slug ?? list.id }}
                className="block no-underline"
              >
                <div className="h-full cursor-pointer rounded-2xl border border-ink/[0.08] bg-ink/[0.015] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 dark:border-paper/[0.08] dark:bg-paper/[0.02] dark:hover:border-paper/20">
                  <p className="mb-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-ink dark:text-paper">
                    {list.name}
                  </p>
                  {list.description && (
                    <p
                      className="mb-4 text-[12px] text-muted"
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
                        className="font-mono text-[11px] text-muted"
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
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted no-underline transition-colors hover:text-ink dark:hover:text-paper"
        >
          {t("home.proofViewAll")}
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
        <ProofSection />
        <FinalCta />
      </main>

      <AppFooter />
    </div>
  );
}
