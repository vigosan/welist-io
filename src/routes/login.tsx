import { signIn } from "@hono/auth-js/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { SectionHeading, SectionKicker } from "@/components/ui";
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
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[420px] mx-auto px-4 py-10 flex flex-col gap-8">
        <div>
          <SectionKicker>Wilist</SectionKicker>
          <div className="mt-3.5">
            <SectionHeading>
              {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
            </SectionHeading>
          </div>
        </div>

        <button
          type="button"
          data-testid="auth-google-btn"
          onClick={() => signIn("google", { callbackUrl: "/lists" })}
          className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition active:scale-[0.98]"
        >
          {t("auth.google")}
        </button>

        <div className="flex items-center gap-3">
          <span className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
          <span className="text-xs text-muted">{t("auth.or")}</span>
          <span className="flex-1 h-px bg-black/[0.08] dark:bg-white/[0.08]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">{t("auth.name")}</span>
              <input
                type="text"
                data-testid="auth-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.namePlaceholder")}
                className="px-3 py-2 text-sm text-ink dark:text-paper placeholder-gray-400 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 transition-[border-color]"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t("auth.email")}</span>
            <input
              type="email"
              required
              data-testid="auth-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              className="px-3 py-2 text-sm text-ink dark:text-paper placeholder-gray-400 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 transition-[border-color]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t("auth.password")}</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                data-testid="auth-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="w-full px-3 py-2 pr-10 text-sm text-ink dark:text-paper placeholder-gray-400 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-gray-400 transition-[border-color]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <p
              data-testid="auth-error"
              className="text-xs text-ink dark:text-paper"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            data-testid="auth-submit-btn"
            disabled={submitting}
            className="cursor-pointer mt-1 w-full px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-paper text-white dark:text-ink text-sm font-medium hover:bg-black transition active:scale-[0.98] disabled:opacity-40"
          >
            {mode === "login" ? t("auth.submitLogin") : t("auth.submitSignup")}
          </button>
        </form>

        <button
          type="button"
          data-testid="auth-toggle-mode"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
          className="cursor-pointer text-xs text-muted hover:text-ink dark:hover:text-paper transition self-center"
        >
          {mode === "login"
            ? t("auth.toggleToSignup")
            : t("auth.toggleToLogin")}
        </button>
      </main>
    </div>
  );
}
