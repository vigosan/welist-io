import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const RESISTANCE = 0.45;

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const directionLocked = useRef(false);
  const currentPull = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      startY.current = e.touches[0].clientY;
      isPulling.current = false;
      directionLocked.current = false;
    }

    function handleTouchMove(e: TouchEvent) {
      // biome-ignore lint/style/noNonNullAssertion: el is checked above before this closure is registered
      if (el!.scrollTop > 0) return;

      const delta = e.touches[0].clientY - startY.current;

      if (!directionLocked.current) {
        directionLocked.current = true;
        if (delta <= 0) return;
        isPulling.current = true;
      }

      if (!isPulling.current) return;

      if (delta <= 0) {
        isPulling.current = false;
        currentPull.current = 0;
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      const clamped = Math.min(delta * RESISTANCE, THRESHOLD);
      currentPull.current = clamped;
      setPullDistance(clamped);
    }

    function handleTouchEnd() {
      directionLocked.current = false;
      if (!isPulling.current) return;
      isPulling.current = false;
      if (currentPull.current >= THRESHOLD) {
        setRefreshing(true);
        currentPull.current = 0;
        setPullDistance(0);
        onRefreshRef.current().finally(() => setRefreshing(false));
      } else {
        currentPull.current = 0;
        setPullDistance(0);
      }
    }

    el.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    el.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    el.addEventListener("touchend", handleTouchEnd);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  return { containerRef, pullDistance, refreshing };
}
