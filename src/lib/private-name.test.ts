import { describe, expect, it } from "vitest";
import { initials, privateName } from "./private-name";

describe("privateName", () => {
  it("returns em dash for null", () => {
    expect(privateName(null)).toBe("—");
  });

  it("returns em dash for undefined", () => {
    expect(privateName(undefined)).toBe("—");
  });

  it("returns em dash for empty string", () => {
    expect(privateName("")).toBe("—");
  });

  it("returns the only part when name is a single token", () => {
    expect(privateName("Madonna")).toBe("Madonna");
  });

  it("abbreviates the last name with an initial", () => {
    expect(privateName("Vicent Gozalbes")).toBe("Vicent G.");
  });

  it("uses the last token as the surname when there are middle names", () => {
    expect(privateName("Ana María García López")).toBe("Ana L.");
  });

  it("collapses internal whitespace", () => {
    expect(privateName("  Vicent   Gozalbes  ")).toBe("Vicent G.");
  });

  it("titleizes an all-uppercase single token", () => {
    expect(privateName("ROCIOAR")).toBe("Rocioar");
  });

  it("titleizes a lowercase single token", () => {
    expect(privateName("texts")).toBe("Texts");
  });

  it("titleizes an all-uppercase full name", () => {
    expect(privateName("VICENT GOZALBES")).toBe("Vicent G.");
  });

  it("uppercases the surname initial regardless of case", () => {
    expect(privateName("vicent gozalbes")).toBe("Vicent G.");
  });
});

describe("initials", () => {
  it("returns a question mark for null", () => {
    expect(initials(null)).toBe("?");
  });

  it("returns a question mark for undefined", () => {
    expect(initials(undefined)).toBe("?");
  });

  it("returns a single uppercase letter for a single token", () => {
    expect(initials("madonna")).toBe("M");
  });

  it("returns first and last initials for a full name", () => {
    expect(initials("Vicent Gozalbes")).toBe("VG");
  });

  it("uppercases initials regardless of source case", () => {
    expect(initials("ana maría garcía lópez")).toBe("AL");
  });

  it("collapses internal whitespace", () => {
    expect(initials("  vicent   gozalbes  ")).toBe("VG");
  });
});
