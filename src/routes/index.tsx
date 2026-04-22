import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { useCreateList } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/")({
  component: HomePage,
});

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
        "flex w-full overflow-hidden transition-all duration-200",
        "rounded-lg",
        focused
          ? "bg-black/[0.06] dark:bg-white/[0.07] border border-black/[0.20] dark:border-white/[0.18]"
          : "bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]",
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
        className="flex-1 px-4 py-3 text-[13px] text-[#0c0c0b] dark:text-[#f0ede8] placeholder-[#a0a09c] dark:placeholder-[#4a4a47] bg-transparent outline-none min-w-0"
      />
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="create-list-btn"
        className="cursor-pointer px-5 py-3 text-[12px] font-semibold tracking-[0.04em] bg-[#0c0c0b] dark:bg-[#f0ede8] text-[#f8f7f5] dark:text-[#0c0c0b] border-none shrink-0 disabled:opacity-[0.75] disabled:cursor-not-allowed transition-opacity duration-150"
        style={{ borderRadius: 0 }}
      >
        {createList.isPending ? "…" : `${t("home.createList")} →`}
      </button>
    </form>
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
    <div className="w-full max-w-[1100px] mx-auto">
      <div className="border-t border-black/[0.08] dark:border-white/[0.08]" />
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className={[
              "px-7 pt-6 pb-7 flex flex-col gap-4 cursor-default",
              i < 3
                ? "border-r border-black/[0.08] dark:border-white/[0.08]"
                : "",
            ].join(" ")}
          >
            <div
              className="text-[10px] tracking-[0.08em] transition-colors duration-200"
              style={{
                color: "#a0a09c",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {step.number}
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-semibold text-[#0c0c0b] dark:text-[#f0ede8] leading-snug tracking-[-0.01em]">
                {step.title}
              </p>
              <p
                className="text-[12px] leading-[1.65]"
                style={{ color: "#a0a09c" }}
              >
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-[#f8f7f5] dark:bg-[#0c0c0b] flex flex-col text-[#0c0c0b] dark:text-[#f0ede8]">
      <AppNav />

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <div className="flex flex-col items-center text-center px-4 sm:px-12 pt-[90px] pb-[72px]">
          <div
            className="flex flex-col items-center w-full"
            style={{ maxWidth: 520 }}
          >
            {/* Badge */}
            <div
              className="mb-7 inline-block text-[10px] tracking-[0.16em] uppercase px-3.5 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.08]"
              style={{
                color: "#a0a09c",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {t("home.badge")}
            </div>

            {/* Headline */}
            <h1
              className="font-bold text-[#0c0c0b] dark:text-[#f0ede8] mb-6"
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

            {/* Tagline */}
            <p
              className="mb-11 leading-[1.65]"
              style={{ fontSize: 15, color: "#a0a09c", maxWidth: 360 }}
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

            {/* Input */}
            <div className="w-full">
              <CreateForm />
            </div>

            {/* Free note */}
            <p
              className="mt-2.5 text-[10px] opacity-50"
              style={{
                color: "#a0a09c",
                fontFamily: "'Space Mono', monospace",
              }}
            >
              {t("home.freeToStart")}
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="pb-[72px]">
          <HowItWorks />
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
