import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

interface Stats {
  users: number;
  lists: number;
  items: number;
  participations: number;
  purchases: number;
  topLists: {
    id: string;
    name: string;
    slug: string | null;
    participations: number;
  }[];
  weeklyLists: { week: string; count: number }[];
  revenue: number;
}

const SESSION_KEY = "admin_password";

function authHeader(password: string) {
  return `Basic ${btoa(`admin:${password}`)}`;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
    </div>
  );
}

function AdminPage() {
  const [password, setPassword] = useState(
    () => sessionStorage.getItem(SESSION_KEY) ?? ""
  );
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats(pwd: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: authHeader(pwd) },
      });
      if (res.status === 401) {
        setError("Contraseña incorrecta.");
        sessionStorage.removeItem(SESSION_KEY);
        setPassword("");
        return;
      }
      const data = (await res.json()) as Stats;
      setStats(data);
      sessionStorage.setItem(SESSION_KEY, pwd);
      setPassword(pwd);
    } catch {
      setError("Error de red.");
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — run only on mount
  useEffect(() => {
    if (password) fetchStats(password);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) fetchStats(input.trim());
  }

  if (!password || error) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8] flex items-center justify-center px-4">
        <div className="w-full max-w-xs flex flex-col gap-6">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            Admin
          </h1>
          {error && <p className="text-sm text-gray-500">{error}</p>}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-gray-400 transition-[border-color]">
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Contraseña"
                autoFocus
                className="flex-1 px-2 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer px-4 py-1.5 text-sm font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl hover:bg-black dark:hover:bg-gray-100 disabled:opacity-40 transition-[background-color,transform] duration-150 active:scale-[0.96]"
              >
                {loading ? "…" : "Entrar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="min-h-dvh bg-[#FAFAF8] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex flex-col">
      <header className="w-full max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Admin
        </h1>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setPassword("");
            setStats(null);
          }}
          className="cursor-pointer text-xs text-gray-400 hover:text-gray-700 transition"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pb-12 flex flex-col gap-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard label="Usuarios" value={stats.users} />
          <StatCard label="Listas" value={stats.lists} />
          <StatCard label="Elementos" value={stats.items} />
          <StatCard label="Participaciones" value={stats.participations} />
          <StatCard label="Compras" value={stats.purchases} />
        </div>

        <StatCard
          label="Revenue"
          value={`$${(stats.revenue / 100).toFixed(2)}`}
        />

        <section className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-900">
            Top listas por participaciones
          </p>
          {stats.topLists.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos.</p>
          ) : (
            <ol className="flex flex-col divide-y divide-gray-50">
              {stats.topLists.map((list, i) => (
                <li
                  key={list.id}
                  className="flex items-center justify-between py-2.5 gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-gray-400 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <a
                      href={`/${list.slug ?? list.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-gray-900 hover:underline truncate"
                    >
                      {list.name}
                    </a>
                  </div>
                  <span className="text-sm text-gray-500 shrink-0">
                    {list.participations} part.
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-900">
            Listas nuevas por semana (últimas 8 semanas)
          </p>
          {stats.weeklyLists.length === 0 ? (
            <p className="text-sm text-gray-400">Sin datos.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.weeklyLists.map(({ week, count }) => {
                const max = Math.max(
                  ...stats.weeklyLists.map((w) => w.count),
                  1
                );
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={week} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 shrink-0">
                      {week}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-6 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
