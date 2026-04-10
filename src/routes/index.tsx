import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateList } from "@/hooks/useList";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const createList = useCreateList();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) createList.mutate(trimmed, {
      onSuccess: (list) => navigate({ to: "/lists/$listId", params: { listId: list.id } }),
    });
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/[0.06] w-full max-w-md p-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-2">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-balance">Welist</h1>
          <p className="text-sm text-gray-400 text-pretty">Crea una lista y comparte el enlace con quien quieras.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="¿Cómo se llama tu lista?"
            data-testid="list-name-input"
            className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || createList.isPending}
            data-testid="create-list-btn"
            className="px-5 py-2.5 text-sm font-semibold bg-gray-950 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.96]"
          >
            {createList.isPending ? "…" : "Crear →"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-300">o</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <Link
          to="/explore"
          className="flex items-center justify-center gap-2 w-full py-2.5 text-sm text-gray-500 hover:text-gray-900 transition"
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
