import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

class FakePgClient extends EventEmitter {
  connect = vi.fn().mockResolvedValue(undefined);
  query = vi.fn().mockResolvedValue(undefined);
  end = vi.fn().mockResolvedValue(undefined);
}

const fakeClient = new FakePgClient();

vi.mock("pg", () => ({
  default: {
    Client: vi.fn().mockImplementation(() => fakeClient),
  },
}));

const mockExecute = vi.fn().mockResolvedValue(undefined);
vi.mock("../src/db/client", () => ({
  db: { execute: mockExecute },
}));

const { listChangesStream, notifyListChange } = await import("./realtime.js");

function emitNotification(payload: unknown) {
  fakeClient.emit("notification", {
    channel: "list_changes",
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

describe("notifyListChange", () => {
  beforeEach(() => mockExecute.mockClear());

  it("emits pg_notify on the list_changes channel with the listId payload", async () => {
    await notifyListChange("list-1");

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(mockExecute.mock.calls[0][0]);
    expect(serialized).toContain("pg_notify");
    expect(serialized).toContain("list_changes");
    expect(serialized).toContain("list-1");
  });
});

describe("listChangesStream", () => {
  it("returns an SSE response with the expected headers", async () => {
    const res = await listChangesStream("list-1");
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
    await res.body?.cancel();
  });

  it("delivers a list-changed event to subscribers on the matching listId", async () => {
    const res = await listChangesStream("list-A");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");
    const decoder = new TextDecoder();

    // first chunk is the retry preamble
    await reader.read();

    emitNotification({ listId: "list-A" });

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain("event: list-changed");
    expect(text).toContain('"listId":"list-A"');

    await reader.cancel();
  });

  it("ignores notifications for a different listId", async () => {
    const res = await listChangesStream("list-X");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");
    const decoder = new TextDecoder();
    await reader.read(); // preamble

    emitNotification({ listId: "list-Y" });
    emitNotification({ listId: "list-X" });

    const { value } = await reader.read();
    const text = decoder.decode(value);
    expect(text).toContain('"listId":"list-X"');
    expect(text).not.toContain('"listId":"list-Y"');

    await reader.cancel();
  });

  it("unsubscribes when the stream is cancelled", async () => {
    const resA = await listChangesStream("list-Z");
    const readerA = resA.body?.getReader();
    if (!readerA) throw new Error("no body");
    await readerA.read(); // preamble
    await readerA.cancel();

    const resB = await listChangesStream("list-Z");
    const readerB = resB.body?.getReader();
    if (!readerB) throw new Error("no body");
    const decoder = new TextDecoder();
    await readerB.read(); // preamble

    emitNotification({ listId: "list-Z" });

    const { value } = await readerB.read();
    expect(decoder.decode(value)).toContain('"listId":"list-Z"');
    await readerB.cancel();
  });
});
