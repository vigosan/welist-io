import { describe, expect, it } from "vitest";
import { getListTemplates } from "./list-templates";

describe("getListTemplates", () => {
  it("returns Spanish content for es so new users see localized starters", () => {
    const templates = getListTemplates("es");
    expect(templates.length).toBeGreaterThan(0);
    const movies = templates.find((t) => t.id === "movies");
    expect(movies?.name).toBe("Películas que quiero ver");
    expect(movies?.items.length).toBeGreaterThan(0);
  });

  it("returns English content for en", () => {
    const movies = getListTemplates("en").find((t) => t.id === "movies");
    expect(movies?.name).toBe("Movies I want to watch");
  });

  it("falls back to English for unknown languages", () => {
    expect(getListTemplates("fr")).toEqual(getListTemplates("en"));
  });

  it("keeps template ids stable across locales for selection", () => {
    const esIds = getListTemplates("es").map((t) => t.id);
    const enIds = getListTemplates("en").map((t) => t.id);
    expect(esIds).toEqual(enIds);
  });
});
