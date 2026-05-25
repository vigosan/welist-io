export function reorderArray<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr;
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const copy = arr.slice();
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}
