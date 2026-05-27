import { sql as drizzleSql } from "drizzle-orm";
import pg from "pg";
import { db } from "../src/db/client.js";

const CHANNEL = "list_changes";
const RECONNECT_DELAY_MS = 2000;
const HEARTBEAT_MS = 25_000;

export type ListChangePayload = {
  listId: string;
};

type Subscriber = (payload: ListChangePayload) => void;
const subscribers = new Map<string, Set<Subscriber>>();

let listenClient: pg.Client | null = null;
let connecting: Promise<void> | null = null;

function listenUrl() {
  const raw =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.DATABASE_URL ??
    "";
  return raw.replace(/([?&])sslmode=[^&]*(&|$)/, (_, prefix, suffix) =>
    suffix === "&" ? prefix : ""
  );
}

async function connectListener(): Promise<void> {
  if (listenClient) return;
  if (connecting) return connecting;
  connecting = (async () => {
    const client = new pg.Client({
      connectionString: listenUrl(),
      ssl: { rejectUnauthorized: false },
    });
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      let payload: ListChangePayload;
      try {
        payload = JSON.parse(msg.payload) as ListChangePayload;
      } catch {
        return;
      }
      const set = subscribers.get(payload.listId);
      if (!set) return;
      for (const fn of set) fn(payload);
    });
    client.on("error", () => {
      listenClient = null;
      setTimeout(() => {
        connectListener().catch(() => {});
      }, RECONNECT_DELAY_MS);
    });
    client.on("end", () => {
      if (listenClient === client) {
        listenClient = null;
        setTimeout(() => {
          connectListener().catch(() => {});
        }, RECONNECT_DELAY_MS);
      }
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    listenClient = client;
  })().finally(() => {
    connecting = null;
  });
  return connecting;
}

function subscribe(listId: string, fn: Subscriber): () => void {
  let set = subscribers.get(listId);
  if (!set) {
    set = new Set();
    subscribers.set(listId, set);
  }
  set.add(fn);
  return () => {
    const current = subscribers.get(listId);
    if (!current) return;
    current.delete(fn);
    if (current.size === 0) subscribers.delete(listId);
  };
}

export async function notifyListChange(listId: string): Promise<void> {
  await db.execute(
    drizzleSql`SELECT pg_notify(${CHANNEL}, ${JSON.stringify({ listId })})`
  );
}

export async function listChangesStream(listId: string): Promise<Response> {
  await connectListener();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        try {
          controller.enqueue(chunk);
        } catch {
          cleanup();
        }
      };
      const cleanup = () => {
        if (heartbeat) clearInterval(heartbeat);
        heartbeat = null;
        if (unsubscribe) unsubscribe();
        unsubscribe = null;
      };

      safeEnqueue(encoder.encode("retry: 3000\n\n"));
      heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(": ping\n\n"));
      }, HEARTBEAT_MS);

      unsubscribe = subscribe(listId, (payload) => {
        safeEnqueue(
          encoder.encode(
            `event: list-changed\ndata: ${JSON.stringify(payload)}\n\n`
          )
        );
      });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
