import { createFileRoute } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { AppFooter } from "@/components/AppFooter";
import { useLanguage } from "@/i18n/service";

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
    ],
  },
} as const;

function HelpSection({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
            <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-gray-300" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpPage() {
  const { language } = useLanguage();
  const page = content[language] ?? content.es;

  return (
    <div className="min-h-dvh bg-[#FAFAF8] flex flex-col">
      <AppNav />

      <main className="flex-1 px-6 py-12">
        <div className="max-w-xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{page.title}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">{page.subtitle}</p>
          </div>

          <div className="flex flex-col gap-8">
            {page.sections.map((section) => (
              <HelpSection key={section.title} title={section.title} items={section.items} />
            ))}
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
