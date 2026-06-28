export type ListTemplate = {
  id: string;
  name: string;
  items: string[];
};

type Lang = "es" | "en";

const TEMPLATES: Record<Lang, ListTemplate[]> = {
  es: [
    {
      id: "movies",
      name: "Películas que quiero ver",
      items: [
        "In the Mood for Love",
        "Cinema Paradiso",
        "Parásitos",
        "El viaje de Chihiro",
        "Lost in Translation",
      ],
    },
    {
      id: "travel",
      name: "Pueblos más bonitos de España",
      items: [
        "Albarracín, Teruel",
        "Cudillero, Asturias",
        "Frigiliana, Málaga",
        "Besalú, Girona",
        "Morella, Castellón",
      ],
    },
    {
      id: "books",
      name: "Libros para este año",
      items: [
        "Cien años de soledad",
        "Stoner",
        "La carretera",
        "El nombre de la rosa",
      ],
    },
    {
      id: "couple",
      name: "Planes en pareja",
      items: [
        "Cocinar algo nuevo juntos",
        "Excursión al amanecer",
        "Noche de cine en casa",
        "Fin de semana sin móvil",
      ],
    },
  ],
  en: [
    {
      id: "movies",
      name: "Movies I want to watch",
      items: [
        "In the Mood for Love",
        "Cinema Paradiso",
        "Parasite",
        "Spirited Away",
        "Lost in Translation",
      ],
    },
    {
      id: "travel",
      name: "Places to visit",
      items: [
        "Kyoto, Japan",
        "Lisbon, Portugal",
        "Patagonia",
        "Reykjavík, Iceland",
        "Hoi An, Vietnam",
      ],
    },
    {
      id: "books",
      name: "Books for this year",
      items: [
        "One Hundred Years of Solitude",
        "Stoner",
        "The Road",
        "The Name of the Rose",
      ],
    },
    {
      id: "couple",
      name: "Date ideas",
      items: [
        "Cook something new together",
        "Sunrise hike",
        "Movie night at home",
        "A weekend with no phones",
      ],
    },
  ],
};

export function getListTemplates(lang: string): ListTemplate[] {
  return TEMPLATES[lang === "es" ? "es" : "en"];
}
