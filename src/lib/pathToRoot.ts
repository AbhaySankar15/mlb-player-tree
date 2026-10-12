/** Indices from `start` up through parents to its component root (inclusive). Cycle-safe. */
export function pathToRoot(parent: ArrayLike<number>, start: number): number[] {
  const path: number[] = []
  const seen = new Set<number>()
  let cur = start
  while (cur >= 0 && cur < parent.length && !seen.has(cur)) {
    seen.add(cur)
    path.push(cur)
    cur = parent[cur]
  }
  return path
}
