import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCreateList } from "@/hooks/useList";
import { AppNav } from "@/components/AppNav";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function CreateForm() {
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
    <form
      onSubmit={handleSubmit}
      className="flex gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl focus-within:border-gray-400 transition-[border-color] duration-150 w-full"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre de la lista…"
        data-testid="list-name-input"
        className="flex-1 pl-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none min-w-0"
      />
      <button
        type="submit"
        disabled={!name.trim() || createList.isPending}
        data-testid="create-list-btn"
        className="px-5 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96] shrink-0"
      >
        {createList.isPending ? "…" : "Crear lista"}
      </button>
    </form>
  );
}

function HomePage() {
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <AppNav />

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="max-w-lg w-full space-y-5">
          <h1 className="text-5xl sm:text-[3.25rem] font-bold tracking-tight text-gray-900 leading-[1.1]">
            Listas para compartir,<br />
            <span className="text-gray-400">retos para superar.</span>
          </h1>
          <p className="text-base text-gray-500 leading-relaxed text-pretty">
            Crea cualquier lista, comparte el enlace y acepta los retos de otros.
          </p>
          <div className="pt-2">
            <CreateForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 shrink-0 text-center">
        <div className="max-w-4xl mx-auto w-full px-6 py-4">
          <span className="text-xs text-gray-300">© {new Date().getFullYear()} Welist - Made with love, Rocio ❤️</span>
        </div>
      </footer>
    </div>
  );
}
