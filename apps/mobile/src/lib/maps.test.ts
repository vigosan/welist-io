import { describe, expect, it } from "vitest";
import { mapsUrl } from "./maps";

describe("mapsUrl", () => {
  it("returns an Apple Maps URL on iOS so the system map app handles it natively", () => {
    expect(
      mapsUrl({ latitude: "41.39", longitude: "2.16", placeName: "Plaça Catalunya" }, "ios")
    ).toBe("https://maps.apple.com/?ll=41.39,2.16&q=Pla%C3%A7a%20Catalunya");
  });

  it("returns a Google Maps geo URL on Android so any installed maps app can handle it", () => {
    expect(
      mapsUrl({ latitude: "41.39", longitude: "2.16", placeName: "Plaça Catalunya" }, "android")
    ).toBe("https://www.google.com/maps/search/?api=1&query=41.39%2C2.16");
  });

  it("encodes special characters in the place name so URLs stay valid", () => {
    const url = mapsUrl(
      { latitude: "0", longitude: "0", placeName: "Café & Bar" },
      "ios"
    );
    expect(url).toContain("Caf%C3%A9%20%26%20Bar");
  });
});
