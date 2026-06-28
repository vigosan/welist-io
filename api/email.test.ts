import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email.js";

const ARGS = {
  to: "user@example.com",
  subject: "Hola",
  html: "<p>hi</p>",
  text: "hi",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendEmail", () => {
  it("skips and does not call fetch when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const res = await sendEmail(ARGS);
    expect(res).toEqual({ skipped: true, reason: "no_api_key" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("posts to Resend with bearer auth and json body when key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "msg-1" }), { status: 200 })
    );
    const res = await sendEmail(ARGS);
    expect(res).toEqual({ skipped: false, id: "msg-1" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      })
    );
    const [, opts] = vi.mocked(globalThis.fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(opts.body as string)).toMatchObject({
      to: "user@example.com",
      subject: "Hola",
      html: "<p>hi</p>",
      text: "hi",
    });
  });

  it("adds one-click unsubscribe headers when listUnsubscribeUrl is provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ id: "msg-1" }), { status: 200 })
    );
    await sendEmail({
      ...ARGS,
      listUnsubscribeUrl: "https://welist.io/api/unsubscribe?token=x",
    });
    const [, opts] = vi.mocked(globalThis.fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];
    const headers = opts.headers as Record<string, string>;
    expect(headers["List-Unsubscribe"]).toBe(
      "<https://welist.io/api/unsubscribe?token=x>"
    );
    expect(headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("throws when Resend returns a non-ok response", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("nope", { status: 422 })
    );
    await expect(sendEmail(ARGS)).rejects.toThrow(/422/);
  });
});
