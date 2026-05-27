import { describe, expect, it } from "vitest";
import { getPartialPlace, parsePlaces } from "./places";

describe("parsePlaces", () => {
  it("returns empty places and full text when no @places", () => {
    expect(parsePlaces("comprar leche")).toEqual({
      display: "comprar leche",
      places: [],
    });
  });

  it("inlines a single place and strips the @ marker", () => {
    expect(parsePlaces("visitar @Barcelona")).toEqual({
      display: "visitar Barcelona",
      places: ["Barcelona"],
    });
  });

  it("inlines a multi-word place", () => {
    expect(parsePlaces("comer en @Nueva York")).toEqual({
      display: "comer en Nueva York",
      places: ["Nueva York"],
    });
  });

  it("inlines multiple places", () => {
    expect(parsePlaces("viajar @París @Roma")).toEqual({
      display: "viajar París Roma",
      places: ["París", "Roma"],
    });
  });

  it("preserves original casing of places", () => {
    expect(parsePlaces("ir a @Buenos Aires")).toEqual({
      display: "ir a Buenos Aires",
      places: ["Buenos Aires"],
    });
  });

  it("handles places with accented characters", () => {
    const { places } = parsePlaces("visitar @Montañas");
    expect(places).toContain("Montañas");
  });

  it("uses the place as the entire display when nothing else is present", () => {
    expect(parsePlaces("@Zafra")).toEqual({
      display: "Zafra",
      places: ["Zafra"],
    });
  });
});

describe("getPartialPlace", () => {
  it("returns null when no @ present", () => {
    expect(getPartialPlace("comprar leche")).toBeNull();
  });

  it("returns null when @ is not at the end", () => {
    expect(getPartialPlace("@Barcelona y más texto")).toBeNull();
  });

  it("returns empty string for bare @ at end", () => {
    expect(getPartialPlace("algo @")).toBe("");
  });

  it("returns the partial word after @", () => {
    expect(getPartialPlace("visitar @Bar")).toBe("Bar");
  });

  it("preserves casing of the partial", () => {
    expect(getPartialPlace("ir a @Madr")).toBe("Madr");
  });

  it("returns null when completed place is followed by space", () => {
    expect(getPartialPlace("visitar @Barcelona ")).toBeNull();
  });
});
