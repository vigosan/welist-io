import { describe, it, expect } from "vitest";
import { parseTags, tagColor, getPartialTag } from "./tags";

describe("parseTags", () => {
  it("returns empty tags and full text when no hashtags", () => {
    expect(parseTags("comprar leche")).toEqual({ display: "comprar leche", tags: [] });
  });

  it("extracts a single tag", () => {
    expect(parseTags("viaje a París #viajes")).toEqual({ display: "viaje a París", tags: ["viajes"] });
  });

  it("extracts multiple tags", () => {
    expect(parseTags("esto es un item #etiqueta1 #etiqueta2")).toEqual({
      display: "esto es un item",
      tags: ["etiqueta1", "etiqueta2"],
    });
  });

  it("lowercases tags", () => {
    expect(parseTags("algo #Urgente")).toEqual({ display: "algo", tags: ["urgente"] });
  });

  it("handles tags in the middle of text", () => {
    const { display, tags } = parseTags("comprar #super leche");
    expect(tags).toContain("super");
    expect(display).toBe("comprar leche");
  });

  it("handles accented characters in tags", () => {
    const { tags } = parseTags("algo #montaña");
    expect(tags).toContain("montaña");
  });
});

describe("getPartialTag", () => {
  it("returns null when no # present", () => {
    expect(getPartialTag("comprar leche")).toBeNull();
  });

  it("returns null when # is not at the end", () => {
    expect(getPartialTag("#viajes y más texto")).toBeNull();
  });

  it("returns empty string for bare # at end", () => {
    expect(getPartialTag("algo #")).toBe("");
  });

  it("returns the partial word after #", () => {
    expect(getPartialTag("viaje a Roma #via")).toBe("via");
  });

  it("lowercases the partial", () => {
    expect(getPartialTag("algo #URG")).toBe("urg");
  });
});

describe("tagColor", () => {
  it("returns a non-empty string", () => {
    expect(tagColor("viajes").length).toBeGreaterThan(0);
  });

  it("returns the same color for the same tag", () => {
    expect(tagColor("viajes")).toBe(tagColor("viajes"));
  });

  it("can return different colors for different tags", () => {
    const colors = new Set(["viajes", "urgente", "trabajo", "casa", "compras"].map(tagColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});
