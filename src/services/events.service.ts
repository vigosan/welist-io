export interface EventInput {
  type: string;
  listId?: string;
  itemId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export const eventsService = {
  async track(input: EventInput): Promise<void> {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [input] }),
      });
    } catch {
      // swallow: tracking must never break the UI
    }
  },
};
