export function doneCountFromProgress(progress: number, total: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return Math.round(clamped * total);
}

export function shuffledOrder(
  n: number,
  rng: () => number = Math.random
): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function flagsFromOrder(order: number[], doneCount: number): boolean[] {
  const flags = new Array(order.length).fill(false);
  for (let i = 0; i < doneCount; i++) flags[order[i]] = true;
  return flags;
}
