import { render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eventsService } from "@/services/events.service";
import { useTrackOnMount } from "./useTrackOnMount";

describe("useTrackOnMount", () => {
  beforeEach(() => {
    vi.spyOn(eventsService, "track").mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function Probe({ type, listId }: { type: string; listId?: string }) {
    useTrackOnMount({ type, listId });
    return null;
  }

  it("fires the event exactly once on mount", () => {
    render(<Probe type="explore_view" />);
    expect(eventsService.track).toHaveBeenCalledOnce();
    expect(eventsService.track).toHaveBeenCalledWith({ type: "explore_view" });
  });

  it("passes listId through", () => {
    render(<Probe type="list_view" listId="l1" />);
    expect(eventsService.track).toHaveBeenCalledWith({
      type: "list_view",
      listId: "l1",
    });
  });

  it("does not fire again on re-render", () => {
    function Rerenderer() {
      const [n, setN] = useState(0);
      useTrackOnMount({ type: "explore_view" });
      return (
        <button type="button" data-testid="bump" onClick={() => setN(n + 1)}>
          {n}
        </button>
      );
    }
    const { getByTestId } = render(<Rerenderer />);
    getByTestId("bump").click();
    getByTestId("bump").click();
    expect(eventsService.track).toHaveBeenCalledOnce();
  });
});
