import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useSession } from "@hono/auth-js/react";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { z } from "zod";
import { useStripeAccountStatus } from "@/hooks/useStripeAccount";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const searchSchema = z.object({
  stripe: z.enum(["success", "refresh"]).optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: searchSchema,
  component: SettingsPage,
});

function SettingsPage() {
  const { data: session } = useSession();
  const { stripe: stripeParam } = useSearch({ from: "/settings" });
  const qc = useQueryClient();
  const { data: status, isLoading: loading, refetch } = useStripeAccountStatus();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (stripeParam) {
      qc.invalidateQueries({ queryKey: queryKeys.stripeAccountStatus() });
      refetch();
    }
  }, [stripeParam]);

  async function handleConnectStripe() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setConnecting(false);
    }
  }

  if (!session?.user) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8] flex flex-col">
        <AppNav />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-sm text-gray-400">Inicia sesión para ver la configuración.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex flex-col">
      <AppNav />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col gap-8">
        <div>
          <Link to="/lists" className="text-xs text-gray-400 hover:text-gray-700 transition">
            ← Mis listas
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-gray-900">Configuración</h1>
        </div>

        <section className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Cuenta</p>
            <p className="text-sm text-gray-500 mt-0.5">{session.user.email}</p>
          </div>

          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-12 h-12 rounded-full outline outline-1 outline-black/10"
            />
          )}
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Pagos con Stripe</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Conecta tu cuenta de Stripe para vender el acceso a tus listas. El dinero va directo a tu cuenta.
            </p>
          </div>

          {stripeParam === "success" && (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
              Cuenta conectada correctamente.
            </div>
          )}
          {stripeParam === "refresh" && (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
              El proceso fue interrumpido. Vuelve a conectar tu cuenta.
            </div>
          )}

          {loading ? (
            <div className="h-8 w-40 rounded-xl bg-gray-100 animate-pulse" />
          ) : status?.onboardingComplete ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Stripe conectado
              </span>
            </div>
          ) : (
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="cursor-pointer self-start px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-40 transition-[background-color,transform] duration-150 active:scale-[0.96]"
            >
              {connecting ? "Redirigiendo…" : status?.connected ? "Continuar configuración" : "Conectar Stripe"}
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
