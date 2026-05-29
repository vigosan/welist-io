import { signIn } from "@hono/auth-js/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { useSignup } from "@/hooks/useList";
import { useTranslation } from "@/i18n/service";
import type { ApiError } from "@/lib/api-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signup = useSignup();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && password.length < 8) {
      setError(t("auth.errorMinLength"));
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        try {
          await signup.mutateAsync({
            email,
            password,
            name: name.trim() || undefined,
          });
        } catch (err) {
          const status = (err as ApiError).response?.status;
          setError(
            status === 409 ? t("auth.errorEmailInUse") : t("auth.errorGeneric")
          );
          return;
        }
      }
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(t("auth.errorInvalid"));
        return;
      }
      navigate({ to: "/lists" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col dark:bg-canvas-dark dark:text-paper">
      <AppNav />

      <main className="flex-1 flex flex-col items-center px-4 pt-16 pb-16 sm:pt-24 sm:pb-20">
        <div className="w-full max-w-[400px] flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <span className="self-start inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-canvas px-2.5 py-1 text-[12px] text-muted dark:border-white/[0.08] dark:bg-canvas-dark">
              <span className="rounded-full bg-ink px-2 py-px text-[10px] font-semibold uppercase tracking-[0.04em] text-canvas dark:bg-paper dark:text-canvas-dark">
                Wilist
              </span>
              <span>{t("auth.badge")}</span>
            </span>
            <h1
              className="font-bold text-ink dark:text-paper"
              style={{
                fontSize: "clamp(34px, 6vw, 48px)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                textWrap: "balance",
                animation:
                  "rise 0.6s 0.05s cubic-bezier(0.2, 0.7, 0.25, 1) both",
              }}
            >
              {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
            </h1>
            <p className="text-[15px] leading-[1.55] text-muted">
              {mode === "login"
                ? t("auth.loginSubtitle")
                : t("auth.signupSubtitle")}
            </p>
          </div>

          <button
            type="button"
            data-testid="auth-google-btn"
            onClick={() => signIn("google", { callbackUrl: "/lists" })}
            className="cursor-pointer w-full flex items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-canvas px-4 py-2.5 text-[13px] font-medium text-ink transition-all duration-150 hover:border-ink/30 active:scale-[0.98] dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:hover:border-paper/30"
          >
            {t("auth.google")}
          </button>

          <div className="flex items-center gap-3">
            <span className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
            <span className="text-[12px] text-muted">{t("auth.or")}</span>
            <span className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "signup" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] text-muted">{t("auth.name")}</span>
                <input
                  type="text"
                  data-testid="auth-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("auth.namePlaceholder")}
                  className="w-full rounded-xl border border-black/[0.08] bg-canvas px-3.5 py-2.5 text-[14px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-ink/30 dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:focus:border-paper/30"
                />
              </label>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-muted">{t("auth.email")}</span>
              <input
                type="email"
                required
                data-testid="auth-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="w-full rounded-xl border border-black/[0.08] bg-canvas px-3.5 py-2.5 text-[14px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-ink/30 dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:focus:border-paper/30"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] text-muted">
                {t("auth.password")}
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  data-testid="auth-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  className="w-full rounded-xl border border-black/[0.08] bg-canvas px-3.5 py-2.5 pr-10 text-[14px] text-ink placeholder-muted outline-none transition-colors duration-200 focus:border-ink/30 dark:border-white/[0.08] dark:bg-canvas-dark dark:text-paper dark:focus:border-paper/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink dark:hover:text-paper"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p
                data-testid="auth-error"
                className="text-[12px] text-ink dark:text-paper"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={submitting}
              className="cursor-pointer mt-1 w-full rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold tracking-[0.01em] text-paper transition hover:bg-black active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-[0.75] dark:bg-paper dark:text-ink dark:hover:bg-white"
            >
              {mode === "login"
                ? t("auth.submitLogin")
                : t("auth.submitSignup")}
            </button>
          </form>

          <button
            type="button"
            data-testid="auth-toggle-mode"
            onClick={() => {
              setMode((m) => (m === "login" ? "signup" : "login"));
              setError(null);
            }}
            className="cursor-pointer self-center text-[12.5px] text-muted transition-colors hover:text-ink dark:hover:text-paper"
          >
            {mode === "login"
              ? t("auth.toggleToSignup")
              : t("auth.toggleToLogin")}
          </button>
        </div>
      </main>
    </div>
  );
}
