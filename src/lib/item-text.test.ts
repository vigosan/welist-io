import { describe, expect, it } from "vitest";
import { parseItemText, plainItemText } from "./item-text";

describe("plainItemText", () => {
  it("returns plain text unchanged", () => {
    expect(plainItemText("comprar leche")).toBe("comprar leche");
  });

  it("strips tags and flattens markdown links", () => {
    expect(
      plainItemText("[Torre del Visco](https://torredelvisco.com) #teruel")
    ).toBe("Torre del Visco");
  });

  it("inlines places into the display text", () => {
    expect(plainItemText("visitar @Barcelona")).toBe("visitar Barcelona");
  });

  it("uses the place as display when there is no other text", () => {
    expect(plainItemText("@Zafra #Badajoz")).toBe("Zafra");
  });

  it("drops trailing bare urls", () => {
    expect(plainItemText("Parador de Bielsa https://paradores.es")).toBe(
      "Parador de Bielsa"
    );
  });
});

describe("parseItemText", () => {
  it("handles text with no tags or places", () => {
    expect(parseItemText("comprar leche")).toEqual({
      display: "comprar leche",
      tags: [],
      places: [],
    });
  });

  it("extracts only tags", () => {
    expect(parseItemText("viaje a París #viajes")).toEqual({
      display: "viaje a París",
      tags: ["viajes"],
      places: [],
    });
  });

  it("inlines a place into the display", () => {
    expect(parseItemText("visitar @Barcelona")).toEqual({
      display: "visitar Barcelona",
      tags: [],
      places: ["Barcelona"],
    });
  });

  it("inlines a place and extracts a tag", () => {
    expect(parseItemText("comer @Tokyo #gastronomia")).toEqual({
      display: "comer Tokyo",
      tags: ["gastronomia"],
      places: ["Tokyo"],
    });
  });

  it("inlines multiple places and extracts multiple tags", () => {
    const result = parseItemText("ver @Roma @París #viajes #europe");
    expect(result.tags).toEqual(["viajes", "europe"]);
    expect(result.places).toEqual(["Roma", "París"]);
    expect(result.display).toBe("ver Roma París");
  });

  it("keeps the place inline while stripping the tag", () => {
    expect(parseItemText("ir a @Madrid #urgente").display).toBe("ir a Madrid");
  });

  it("uses the place as the entire display when there is no other text", () => {
    expect(parseItemText("@Zafra #Badajoz")).toEqual({
      display: "Zafra",
      tags: ["badajoz"],
      places: ["Zafra"],
    });
  });
});
