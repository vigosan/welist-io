import { describe, it, expect, beforeEach } from "vitest";
import i18next from "./index";

describe("i18n", () => {
  beforeEach(() => i18next.changeLanguage("es"));

  it("returns Spanish strings by default", () => {
    expect(i18next.t("error.title")).toBe("Algo fue mal");
    expect(i18next.t("nav.explore")).toBe("Explorar");
    expect(i18next.t("bulk.cancel")).toBe("Cancelar");
  });

  it("handles interpolation", () => {
    expect(i18next.t("list.progress", { done: 3, total: 10 })).toBe("3 / 10 completados");
    expect(i18next.t("list.noResults", { query: "hola" })).toBe('Sin resultados para "hola".');
  });

  it("handles plurals in Spanish", () => {
    expect(i18next.t("bulk.header", { count: 1 })).toBe("1 elemento para añadir");
    expect(i18next.t("bulk.header", { count: 3 })).toBe("3 elementos para añadir");
    expect(i18next.t("bulk.confirm", { count: 1 })).toBe("Añadir 1 elemento");
    expect(i18next.t("bulk.confirm", { count: 5 })).toBe("Añadir 5 elementos");
  });

  it("switches to English and returns English strings", () => {
    i18next.changeLanguage("en");
    expect(i18next.t("error.title")).toBe("Something went wrong");
    expect(i18next.t("nav.explore")).toBe("Explore");
    expect(i18next.t("bulk.cancel")).toBe("Cancel");
  });

  it("handles English plurals", () => {
    i18next.changeLanguage("en");
    expect(i18next.t("bulk.header", { count: 1 })).toBe("1 item to add");
    expect(i18next.t("bulk.header", { count: 3 })).toBe("3 items to add");
  });

  it("falls back to Spanish for unknown language", () => {
    i18next.changeLanguage("fr");
    expect(i18next.t("error.title")).toBe("Algo fue mal");
  });
});
