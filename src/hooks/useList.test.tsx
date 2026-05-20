import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { List } from "@/db/schema";
import type { ListWithParticipation } from "@/services/lists.service";
import {
  useAcceptChallenge,
  useList,
  useTogglePublic,
  useUpdateDescription,
  useUpdateName,
  useUserAchievements,
} from "./useList";

vi.mock("@/services/lists.service", () => ({
  listsService: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    clone: vi.fn(),
    explore: vi.fn(),
    accept: vi.fn(),
  },
  usersService: {
    getAchievements: vi.fn(),
  },
}));

vi.mock("@/services/events.service", () => ({
  eventsService: { track: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    notFound: vi.fn(() => new Error("Not Found")),
  };
});

import { listsService, usersService } from "@/services/lists.service";

const LIST: ListWithParticipation = {
  id: "list-1",
  name: "Mi lista",
  slug: null,
  description: null,
  category: null,
  public: false,
  collaborative: false,
  ownerId: null,
  createdAt: new Date(),
  participated: false,
  participationCompletedAt: null,
};

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { qc, Wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe("useList", () => {
  it("returns the list from listsService.get", async () => {
    vi.mocked(listsService.get).mockResolvedValue(LIST);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useList(LIST.id), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(LIST);
    expect(listsService.get).toHaveBeenCalledWith(LIST.id);
  });

  it("throws notFound when service errors", async () => {
    vi.mocked(listsService.get).mockRejectedValue(new Error("Network error"));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useList(LIST.id), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const { notFound } = await import("@tanstack/react-router");
    expect(notFound).toHaveBeenCalled();
  });
});

describe("useUpdateName", () => {
  it("optimistically updates name in cache", async () => {
    vi.mocked(listsService.update).mockResolvedValue({
      ...LIST,
      name: "Nuevo nombre",
    });
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], LIST);

    const { result } = renderHook(() => useUpdateName(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("Nuevo nombre");
    });

    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.name).toBe("Nuevo nombre");
  });

  it("rolls back name on error", async () => {
    vi.mocked(listsService.update).mockRejectedValue(new Error("fail"));
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], LIST);

    const { result } = renderHook(() => useUpdateName(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("Nuevo nombre");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.name).toBe("Mi lista");
  });
});

describe("useUpdateDescription", () => {
  it("optimistically updates description in cache", async () => {
    vi.mocked(listsService.update).mockResolvedValue({
      ...LIST,
      description: "Una descripción",
    });
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], LIST);

    const { result } = renderHook(() => useUpdateDescription(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("Una descripción");
    });

    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.description).toBe("Una descripción");
  });

  it("rolls back description on error", async () => {
    vi.mocked(listsService.update).mockRejectedValue(new Error("fail"));
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], {
      ...LIST,
      description: "Original",
    });

    const { result } = renderHook(() => useUpdateDescription(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("Cambiada");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.description).toBe("Original");
  });
});

describe("useTogglePublic", () => {
  it("optimistically sets public to true", async () => {
    vi.mocked(listsService.update).mockResolvedValue({
      ...LIST,
      public: true,
    });
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], LIST);

    const { result } = renderHook(() => useTogglePublic(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate(true);
    });

    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.public).toBe(true);
  });

  it("rolls back public on error", async () => {
    vi.mocked(listsService.update).mockRejectedValue(new Error("fail"));
    const { qc, Wrapper } = makeWrapper();
    qc.setQueryData(["list", LIST.id], LIST);

    const { result } = renderHook(() => useTogglePublic(LIST.id), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate(true);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = qc.getQueryData<List>(["list", LIST.id]);
    expect(cached?.public).toBe(false);
  });
});

describe("useUserAchievements", () => {
  it("returns the achievements array for a user", async () => {
    vi.mocked(usersService.getAchievements).mockResolvedValue({
      achievements: [
        { type: "ten_lists_accepted", unlockedAt: "2026-05-20T00:00:00Z" },
      ],
    });
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useUserAchievements("u1"), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(usersService.getAchievements).toHaveBeenCalledWith("u1");
    expect(result.current.data).toEqual([
      { type: "ten_lists_accepted", unlockedAt: "2026-05-20T00:00:00Z" },
    ]);
  });
});

describe("useAcceptChallenge", () => {
  it("tracks list_accepted on successful accept", async () => {
    vi.mocked(listsService.accept).mockResolvedValue({
      ...LIST,
      id: "user-list-1",
    });
    const { eventsService } = await import("@/services/events.service");
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAcceptChallenge(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("source-list-1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eventsService.track).toHaveBeenCalledWith({
      type: "list_accepted",
      listId: "source-list-1",
    });
  });

  it("does not track when accept fails", async () => {
    vi.mocked(listsService.accept).mockRejectedValue(new Error("boom"));
    const { eventsService } = await import("@/services/events.service");
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useAcceptChallenge(), {
      wrapper: Wrapper,
    });
    await act(async () => {
      result.current.mutate("source-list-2");
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(eventsService.track).not.toHaveBeenCalled();
  });
});
