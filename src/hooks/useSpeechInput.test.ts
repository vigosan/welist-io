import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "./useSpeechInput";

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  interimResults = false;
  continuous = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  started = false;
  aborted = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
  }
  emitResult(transcript: string) {
    this.onresult?.({
      results: [[{ transcript }]],
    });
  }
}

beforeEach(() => {
  FakeRecognition.instances = [];
  vi.stubGlobal("SpeechRecognition", FakeRecognition);
  vi.stubGlobal("webkitSpeechRecognition", undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSpeechInput", () => {
  it("reports supported when the API is present", () => {
    const { result } = renderHook(() => useSpeechInput("es", vi.fn()));
    expect(result.current.supported).toBe(true);
  });

  it("reports unsupported when no SpeechRecognition exists", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const { result } = renderHook(() => useSpeechInput("es", vi.fn()));
    expect(result.current.supported).toBe(false);
  });

  it("starts listening and flips the listening flag", () => {
    const { result } = renderHook(() => useSpeechInput("es", vi.fn()));
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(FakeRecognition.instances[0].started).toBe(true);
  });

  it("passes the transcript to onResult and stops listening", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechInput("en", onResult));
    act(() => result.current.start());
    act(() => FakeRecognition.instances[0].emitResult("buy milk"));
    expect(onResult).toHaveBeenCalledWith("buy milk");
  });

  it("clears the listening flag when recognition ends", () => {
    const { result } = renderHook(() => useSpeechInput("es", vi.fn()));
    act(() => result.current.start());
    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
  });

  it("sets the recognition language from the argument", () => {
    const { result } = renderHook(() => useSpeechInput("en", vi.fn()));
    act(() => result.current.start());
    const last =
      FakeRecognition.instances[FakeRecognition.instances.length - 1];
    expect(last?.lang).toBe("en-US");
  });
});
