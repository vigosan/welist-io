import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateList } from "@/hooks/useList";
import { AppNav } from "@/components/AppNav";
import { useTranslation } from "@/i18n/service";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function CreateForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const createList = useCreateList();
  const { t } = useTranslation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) createList.mutate(trimmed, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl focus-within:border-gray-400 transition-[border-color] duration-150 w-full shadow-sm"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("home.listNamePlaceholder")}
        data-testid="list-name-input"
        className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none min-w-0"
      />
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="create-list-btn"
        className="cursor-pointer px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96] shrink-0"
      >
        {createList.isPending ? "…" : t("home.createList")}
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
  ];

  return (
    <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
      {steps.map((step) => (
        <div key={step.number} className="bg-[#FAFAF8] px-6 py-6 flex flex-col gap-2">
          <span className="font-mono text-xs text-gray-400 tracking-widest">{step.number}</span>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{step.title}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
        </div>
      ))}
    </div>
  );
}

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex flex-col">
      <AppNav />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 gap-16">
        <div className="max-w-xl w-full flex flex-col items-center gap-6">
          <h1 className="text-5xl sm:text-[3.5rem] font-bold tracking-tight text-gray-900 leading-[1.1] text-balance">
            {t("home.headline")}<br />
            <span className="text-gray-400">{t("home.headlineSub")}</span>
          </h1>
          <p className="text-base text-gray-500 leading-relaxed text-pretty max-w-md">
            {t("home.tagline")}
          </p>
          <div className="w-full pt-2">
            <CreateForm />
          </div>
        </div>

        <HowItWorks />
      </main>

      <footer className="border-t border-gray-100 shrink-0 text-center">
        <div className="max-w-4xl mx-auto w-full px-6 py-4">
          <span className="text-xs text-gray-300">
            {t("home.footer", { year: new Date().getFullYear() })}
          </span>
        </div>
      </footer>
    </div>
  );
}
