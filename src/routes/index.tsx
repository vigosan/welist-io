import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateList } from "@/hooks/useList";
import { UserMenu } from "@/components/UserMenu";
import { useSession } from "@hono/auth-js/react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const createList = useCreateList();
  const { data: session } = useSession();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) createList.mutate(trimmed, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
  }

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-xl p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welist</h1>
            <p className="text-sm text-gray-400">Crea una lista y comparte el enlace con quien quieras.</p>
          </div>
          <UserMenu />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la lista"
            data-testid="list-name-input"
            className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || createList.isPending}
            data-testid="create-list-btn"
            className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
          >
            {createList.isPending ? "…" : "Crear"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-300">o</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {session?.user && (
          <Link
            to="/my-lists"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Mis listas
          </Link>
        )}

        <Link
          to="/explore"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Explorar listas públicas
        </Link>
      </div>
    </div>
  );
}
