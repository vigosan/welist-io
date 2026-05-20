import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, verifyUnsubscribeToken } from "./email-token";

const SECRET = "test-secret-1";

describe("unsubscribe token", () => {
  it("verifies a freshly signed token and returns the user id", async () => {
    const token = await signUnsubscribeToken("user-123", SECRET);
    expect(await verifyUnsubscribeToken(token, SECRET)).toBe("user-123");
  });

  it("returns null when the signature is tampered with", async () => {
    const token = await signUnsubscribeToken("user-123", SECRET);
    const tampered = `${token.slice(0, -1)}${token.slice(-1) === "A" ? "B" : "A"}`;
    expect(await verifyUnsubscribeToken(tampered, SECRET)).toBeNull();
  });

  it("returns null when verified with a different secret", async () => {
    const token = await signUnsubscribeToken("user-123", SECRET);
    expect(await verifyUnsubscribeToken(token, "other-secret")).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    expect(await verifyUnsubscribeToken("not-a-token", SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken("", SECRET)).toBeNull();
  });

  it("supports user ids containing dots", async () => {
    const token = await signUnsubscribeToken("user.with.dots", SECRET);
    expect(await verifyUnsubscribeToken(token, SECRET)).toBe("user.with.dots");
  });
});
