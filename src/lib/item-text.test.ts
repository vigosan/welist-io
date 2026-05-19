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

  it("strips places", () => {
    expect(plainItemText("visitar @Barcelona")).toBe("visitar");
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

  it("extracts only places", () => {
    expect(parseItemText("visitar @Barcelona")).toEqual({
      display: "visitar",
      tags: [],
      places: ["Barcelona"],
    });
  });

  it("extracts both tags and places", () => {
    expect(parseItemText("comer @Tokyo #gastronomia")).toEqual({
      display: "comer",
      tags: ["gastronomia"],
      places: ["Tokyo"],
    });
  });

  it("extracts multiple tags and multiple places", () => {
    const result = parseItemText("ver @Roma @París #viajes #europe");
    expect(result.tags).toEqual(["viajes", "europe"]);
    expect(result.places).toContain("Roma");
    expect(result.display).toBe("ver");
  });

  it("strips both tags and places from display", () => {
    const { display } = parseItemText("ir a @Madrid #urgente");
    expect(display).toBe("ir a");
  });
});
