import { useEffect } from "react";
import { type EventInput, eventsService } from "@/services/events.service";

export function useTrackOnMount(input: EventInput) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once per mount, even if input identity changes
  useEffect(() => {
    eventsService.track(input);
  }, []);
}
