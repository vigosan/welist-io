import { describe, expect, it } from "vitest";
import { cleanName, slugify } from "./slug";

describe("cleanName", () => {
  it("trims surrounding whitespace", () => {
    expect(cleanName("  Mi lista  ")).toBe("Mi lista");
  });

  it("collapses runs of internal whitespace to single spaces", () => {
    expect(cleanName("Mi    lista   secreta")).toBe("Mi lista secreta");
  });

  it("treats tabs and newlines as whitespace", () => {
    expect(cleanName("Mi\tlista\nsecreta")).toBe("Mi lista secreta");
  });

  it("preserves case so brand names like NASA stay intact", () => {
    expect(cleanName("NASA Apollo")).toBe("NASA Apollo");
  });
});

describe("slugify", () => {
  it("lowercases ASCII text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Pingüino crónica")).toBe("pinguino-cronica");
  });

  it("removes punctuation and emoji", () => {
    expect(slugify("¡Hola, mundo! 🌍")).toBe("hola-mundo");
  });

  it("collapses runs of separators to a single hyphen", () => {
    expect(slugify("a   --  b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("truncates to 60 characters without trailing hyphen", () => {
    const long = "a".repeat(80);
    const result = slugify(long);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith("-")).toBe(false);
  });

  it("returns empty string when input has no slug-safe characters", () => {
    expect(slugify("🌍🌍🌍")).toBe("");
  });
});
