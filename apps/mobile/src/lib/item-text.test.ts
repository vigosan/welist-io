import { describe, expect, it } from "vitest";
import { displayItemText } from "./item-text";

describe("displayItemText", () => {
  it("returns plain text unchanged", () => {
    expect(displayItemText("comprar leche")).toBe("comprar leche");
  });

  it("strips hashtags", () => {
    expect(displayItemText("comprar leche #urgente")).toBe("comprar leche");
  });

  it("inlines @places without the @ marker", () => {
    expect(displayItemText("visitar @Barcelona")).toBe("visitar Barcelona");
  });

  it("strips tags and inlines places together", () => {
    expect(displayItemText("@Zafra #Badajoz")).toBe("Zafra");
  });

  it("inlines a multi-word place", () => {
    expect(displayItemText("comer en @Nueva York")).toBe("comer en Nueva York");
  });
});
