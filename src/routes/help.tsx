import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { AppNav } from "@/components/AppNav";
import { useLanguage } from "@/i18n/service";
import { renderInlineMarkdown } from "@/lib/inline-markdown";

export const Route = createFileRoute("/help")({
  component: HelpPage,
});

const content = {
  en: {
    title: "How Welist works",
    subtitle: "Everything you can do with Welist, explained.",
    sections: [
      {
        title: "Lists",
        items: [
          "Create a list and give it a name",
          "Add items one by one or paste up to 100 at once",
          "Edit any item by double-clicking it",
          "Reorder items by dragging them",
          "Mark items as done or pending",
          "Tag items with #hashtag to filter them later",
          "Search inside a list with ⌘K or the search icon",
          "Set a custom URL slug for your list",
          "Add a description to give context",
          "Delete a list from My lists",
        ],
      },
      {
        title: "Places & Map",
        items: [
          "Type `@placename` while adding or editing an item to attach a location",
          "After 3 characters a geocoding dropdown appears — select a result to save coordinates",
          "Press Escape to dismiss the dropdown without saving a location",
          "Items with a location show a pin badge with the place name",
          "Click the map icon in the list header to switch to map view",
          "The map view shows all items that have coordinates as pins",
          "Click a pin on the map to see the item name",
        ],
      },
      {
        title: "Challenges",
        items: [
          "Make a list public and share the link",
          "Others can accept your list as a challenge",
          "Each participant gets their own copy to complete",
          "Progress is tracked independently per person",
          "Completing all items triggers a confetti celebration",
        ],
      },
      {
        title: "Collaboration",
        items: [
          "Enable Collaborative mode to let anyone with the link add items",
          "See who's participating and their progress",
          "Activity is logged: adds, edits, deletes, and completions",
          "No sign-in required to contribute to a collaborative list",
        ],
      },
      {
        title: "Sell a list",
        items: [
          "Connect your Stripe account from Settings",
          "Open list settings and switch Price to Paid",
          "Set a price between $1 and $1000 USD",
          "The list must be public to be sellable",
          "Buyers pay via Stripe and get immediate access",
          "You receive 90% — Welist takes a 10% fee",
          "You cannot purchase your own list",
        ],
      },
      {
        title: "Discover",
        items: [
          "Browse all public lists on the Explore page",
          "Search public lists by name",
          "See how many items, participants, and completions each list has",
          "Accept any challenge directly from the Explore page",
          "Sign in with Google to accept challenges and track progress",
        ],
      },
      {
        title: "Formatting",
        items: [
          "Item text supports inline markdown",
          "**Bold** — wrap text with double asterisks: `**bold**`",
          "*Italic* — wrap text with single asterisks: `*italic*`",
          "`Code` — wrap text with backticks (grave accent)",
          "[Link](url) — write `[label](url)` to add a clickable link",
          "Bare URLs like `https://…` are automatically turned into links",
        ],
      },
    ],
  },
  es: {
    title: "Cómo funciona Welist",
    subtitle: "Todo lo que puedes hacer con Welist, explicado.",
    sections: [
      {
        title: "Listas",
        items: [
          "Crea una lista y dale un nombre",
          "Añade elementos uno a uno o pega hasta 100 a la vez",
          "Edita cualquier elemento haciendo doble clic",
          "Reordena los elementos arrastrándolos",
          "Marca elementos como hechos o pendientes",
          "Etiqueta elementos con #hashtag para filtrarlos después",
          "Busca dentro de una lista con ⌘K o el icono de búsqueda",
          "Pon un slug personalizado a tu lista",
          "Añade una descripción para dar contexto",
          "Elimina una lista desde Mis listas",
        ],
      },
      {
        title: "Lugares y mapa",
        items: [
          "Escribe `@lugar` al añadir o editar un elemento para adjuntar una ubicación",
          "Tras 3 caracteres aparece un desplegable de geocodificación — selecciona un resultado para guardar las coordenadas",
          "Pulsa Escape para cerrar el desplegable sin guardar la ubicación",
          "Los elementos con ubicación muestran un pin con el nombre del lugar",
          "Haz clic en el icono de mapa en la cabecera de la lista para cambiar a la vista de mapa",
          "La vista de mapa muestra como pines todos los elementos que tienen coordenadas",
          "Haz clic en un pin del mapa para ver el nombre del elemento",
        ],
      },
      {
        title: "Retos",
        items: [
          "Haz una lista pública y comparte el enlace",
          "Otros pueden aceptar tu lista como un reto",
          "Cada participante tiene su propia copia para completar",
          "El progreso se registra de forma independiente por persona",
          "Completar todos los elementos dispara una celebración con confetti",
        ],
      },
      {
        title: "Colaboración",
        items: [
          "Activa el modo Colaborativo para que cualquiera con el enlace añada elementos",
          "Ve quién participa y su progreso",
          "La actividad queda registrada: añadidos, ediciones, eliminaciones y completados",
          "No hace falta iniciar sesión para contribuir a una lista colaborativa",
        ],
      },
      {
        title: "Vender una lista",
        items: [
          "Conecta tu cuenta de Stripe desde Ajustes",
          "Abre los ajustes de la lista y cambia Precio a De pago",
          "Pon un precio entre 1$ y 1000$ USD",
          "La lista debe ser pública para poder venderse",
          "Los compradores pagan con Stripe y obtienen acceso inmediato",
          "Tú recibes el 90% — Welist se lleva un 10% de comisión",
          "No puedes comprar tu propia lista",
        ],
      },
      {
        title: "Descubrir",
        items: [
          "Explora todas las listas públicas en la página Explorar",
          "Busca listas públicas por nombre",
          "Ve cuántos elementos, participantes y completados tiene cada lista",
          "Acepta cualquier reto directamente desde la página Explorar",
          "Inicia sesión con Google para aceptar retos y registrar el progreso",
        ],
      },
      {
        title: "Formato",
        items: [
          "El texto de los elementos admite markdown básico",
          "**Negrita** — rodea el texto con dobles asteriscos: `**negrita**`",
          "*Cursiva* — rodea el texto con asteriscos simples: `*cursiva*`",
          "`Código` — rodea el texto con acentos graves (acento grave)",
          "[Enlace](url) — escribe `[etiqueta](url)` para añadir un enlace",
          "Las URLs como `https://…` se convierten automáticamente en enlaces",
        ],
      },
    ],
  },
} as const;

function HelpSection({
  index,
  title,
  items,
  defaultOpen,
}: {
  index: number;
  title: string;
  items: readonly string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const numberLabel = String(index + 1).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.02] transition-colors duration-150 hover:border-black/[0.14] dark:hover:border-white/[0.14]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 bg-transparent border-none cursor-pointer text-left"
      >
        <span
          className="text-[11px] text-gray-400 dark:text-[#6b6b67] tabular-nums shrink-0"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {numberLabel}
        </span>
        <span className="flex-1 text-sm font-semibold text-ink dark:text-paper tracking-[0.01em]">
          {title}
        </span>
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-gray-400 dark:text-[#6b6b67] transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
          {items.map((item) => (
            <div key={item} className="flex gap-2.5 py-1.5">
              <span className="shrink-0 mt-0.5 text-[11px] text-gray-400 dark:text-[#6b6b67]">
                →
              </span>
              <span className="text-sm leading-[1.6] text-gray-600 dark:text-muted">
                {renderInlineMarkdown(item)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HelpPage() {
  const { language } = useLanguage();
  const page = content[language] ?? content.es;

  return (
    <div className="min-h-dvh bg-canvas dark:bg-canvas-dark flex flex-col">
      <AppNav />

      <main className="flex-1 py-10">
        <div className="max-w-[760px] mx-auto px-4 sm:px-12">
          <div className="mb-9">
            <h1
              className="text-[28px] font-bold text-ink dark:text-paper mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              {page.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-muted">
              {page.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {page.sections.map((section, i) => (
              <HelpSection
                key={section.title}
                index={i}
                title={section.title}
                items={section.items}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
