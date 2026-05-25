import { useSession } from "@hono/auth-js/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { AppNav } from "@/components/AppNav";
import {
  useSetPassword,
  useUpdateProfile,
  useUserMe,
} from "@/hooks/useList";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { queryKeys } from "@/lib/query-keys";

const searchSchema = z.object({
  stripe: z.enum(["success", "refresh"]).optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: searchSchema,
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { stripe: stripeParam } = useSearch({
    from: "/settings",
  });
  const qc = useQueryClient();
  const {
    data: status,
    isLoading: loading,
    refetch,
  } = useStripeAccountStatus();
  const { data: userMe } = useUserMe();
  const updateProfile = useUpdateProfile();
  const [connecting, setConnecting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const setPasswordMutation = useSetPassword();
  const hasPassword = userMe?.hasPassword ?? false;

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (password.length < 8) {
      setPasswordError(t("settings.password.minLength"));
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError(t("settings.password.notMatch"));
      return;
    }
    try {
      await setPasswordMutation.mutateAsync(password);
      setPassword("");
      setPasswordConfirm("");
    } catch {}
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — qc and refetch are stable
  useEffect(() => {
    if (stripeParam) {
      qc.invalidateQueries({
        queryKey: queryKeys.stripeAccountStatus(),
      });
      refetch();
    }
  }, [stripeParam]);

  async function handleConnectStripe() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setConnecting(false);
    }
  }

  if (!session?.user) {
    return (
      <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-gray-500 dark:text-[#a0a09c]">
            Inicia sesión para ver la configuración.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-[760px] mx-auto px-4 sm:px-12 py-10 flex flex-col gap-8">
        <div>
          <Link
            to="/lists"
            className="text-xs text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition"
          >
            ← Mis listas
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-[#0c0c0b] dark:text-[#f0ede8]">
            Configuración
          </h1>
        </div>

        <section className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
              Cuenta
            </p>
            <p className="text-sm text-gray-500 dark:text-[#a0a09c] mt-0.5">
              {session.user.email}
            </p>
          </div>

          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-12 h-12 rounded-full outline outline-1 outline-black/10 dark:outline-white/10"
            />
          )}
        </section>

        <section className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
              Perfil
            </p>
            <p className="text-xs text-gray-500 dark:text-[#a0a09c] mt-0.5 leading-relaxed">
              Controla si apareces en el directorio público de usuarios.
            </p>
          </div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-[#0c0c0b] dark:text-[#f0ede8]">
              Aparecer en el directorio de usuarios
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={userMe?.publicProfile ?? true}
              data-testid="public-profile-toggle"
              onClick={() =>
                updateProfile.mutate({
                  publicProfile: !(userMe?.publicProfile ?? true),
                })
              }
              disabled={updateProfile.isPending || userMe === undefined}
              className={`cursor-pointer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none disabled:opacity-40 ${
                (userMe?.publicProfile ?? true)
                  ? "bg-[#0c0c0b] dark:bg-[#f0ede8]"
                  : "bg-black/[0.10] dark:bg-white/[0.10]"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0c0c0b] shadow transition-transform duration-150 ${
                  (userMe?.publicProfile ?? true)
                    ? "translate-x-4.5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </section>

        <section className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
              Notificaciones por email
            </p>
            <p className="text-xs text-gray-500 dark:text-[#a0a09c] mt-0.5 leading-relaxed">
              Recibe un recordatorio quincenal con un ítem aleatorio pendiente
              de tus listas para que no se te olvide.
            </p>
          </div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm text-[#0c0c0b] dark:text-[#f0ede8]">
              Recibir recordatorios por email
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={userMe?.emailOptIn ?? true}
              data-testid="email-opt-in-toggle"
              onClick={() =>
                updateProfile.mutate({
                  emailOptIn: !(userMe?.emailOptIn ?? true),
                })
              }
              disabled={updateProfile.isPending || userMe === undefined}
              className={`cursor-pointer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none disabled:opacity-40 ${
                (userMe?.emailOptIn ?? true)
                  ? "bg-[#0c0c0b] dark:bg-[#f0ede8]"
                  : "bg-black/[0.10] dark:bg-white/[0.10]"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-[#0c0c0b] shadow transition-transform duration-150 ${
                  (userMe?.emailOptIn ?? true)
                    ? "translate-x-4.5"
                    : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </section>

        <section className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
              {hasPassword
                ? t("settings.password.titleChange")
                : t("settings.password.title")}
            </p>
            <p className="text-xs text-gray-500 dark:text-[#a0a09c] mt-0.5 leading-relaxed">
              {hasPassword
                ? t("settings.password.descriptionSet")
                : t("settings.password.description")}
            </p>
          </div>
          <form
            onSubmit={handleSavePassword}
            className="flex flex-col gap-3"
            data-testid="set-password-form"
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("settings.password.newPassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="password-input"
                className="w-full px-3 py-2 pr-10 text-sm bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[#0c0c0b] dark:text-[#f0ede8] outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? t("settings.password.hide")
                    : t("settings.password.show")
                }
                data-testid="toggle-password-visibility"
                className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("settings.password.confirmPassword")}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                data-testid="password-confirm-input"
                className="w-full px-3 py-2 pr-10 text-sm bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-[#0c0c0b] dark:text-[#f0ede8] outline-none focus:border-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm((v) => !v)}
                aria-label={
                  showPasswordConfirm
                    ? t("settings.password.hide")
                    : t("settings.password.show")
                }
                data-testid="toggle-password-confirm-visibility"
                className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 dark:text-[#a0a09c] hover:text-[#0c0c0b] dark:hover:text-[#f0ede8] transition-colors"
              >
                {showPasswordConfirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {passwordError}
              </p>
            )}
            {setPasswordMutation.isSuccess && (
              <p className="text-xs text-gray-500 dark:text-[#a0a09c]">
                {t("settings.password.saved")}
              </p>
            )}
            {setPasswordMutation.isError && !passwordError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {t("settings.password.genericError")}
              </p>
            )}
            <button
              type="submit"
              disabled={setPasswordMutation.isPending || !password}
              data-testid="save-password-button"
              className="cursor-pointer self-start px-4 py-2 text-sm font-medium bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] rounded-xl hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-150 active:scale-[0.96]"
            >
              {setPasswordMutation.isPending
                ? t("settings.password.saving")
                : t("settings.password.save")}
            </button>
          </form>
        </section>

        <section className="bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-[#0c0c0b] dark:text-[#f0ede8]">
              Pagos con Stripe
            </p>
            <p className="text-xs text-gray-500 dark:text-[#a0a09c] mt-0.5 leading-relaxed">
              Conecta tu cuenta de Stripe para vender el acceso a tus listas. El
              dinero va directo a tu cuenta.
            </p>
          </div>

          {stripeParam === "success" && (
            <div className="px-3 py-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-gray-600 dark:text-[#a0a09c]">
              Cuenta conectada correctamente.
            </div>
          )}
          {stripeParam === "refresh" && (
            <div className="px-3 py-2 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl text-xs text-gray-500 dark:text-[#a0a09c]">
              El proceso fue interrumpido. Vuelve a conectar tu cuenta.
            </div>
          )}

          {loading ? (
            <div className="h-8 w-40 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] animate-pulse" />
          ) : status?.onboardingComplete ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0c0c0b] dark:text-[#f0ede8] px-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] rounded-xl">
                <svg
                  aria-hidden="true"
                  className="w-3 h-3 text-gray-500 dark:text-[#a0a09c]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Stripe conectado
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectStripe}
              disabled={connecting}
              className="cursor-pointer self-start px-4 py-2 text-sm font-medium bg-[#0c0c0b] text-[#f8f7f5] dark:bg-[#f0ede8] dark:text-[#0c0c0b] rounded-xl hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-150 active:scale-[0.96]"
            >
              {connecting
                ? "Redirigiendo…"
                : status?.connected
                  ? "Continuar configuración"
                  : "Conectar Stripe"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
