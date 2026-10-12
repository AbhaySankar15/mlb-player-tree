/** Level-of-detail clusters: players are binned on a square grid in layout space; each non-empty cell becomes one bubble. */
export interface Cluster { x: number; y: number; count: number; depth: number; depthCounts: number[] }

/** Zoom level shown for a camera ratio (bigger ratio = more zoomed out). `full` shows every individual dot. */
export type Detail = 'coarse' | 'fine' | 'full'
export const COARSE_CELL = 26
export const FINE_CELL = 9
/** Camera ratios at which the view switches from coarse to fine bubbles and from fine bubbles to individual dots. */
export const FINE_BELOW = 0.55
export const FULL_BELOW = 0.22

export function detailFor(ratio: number): Detail {
  return ratio > FINE_BELOW ? 'coarse' : ratio > FULL_BELOW ? 'fine' : 'full'
}

export function buildClusters(x: ArrayLike<number>, y: ArrayLike<number>, depth: ArrayLike<number>, cell: number, maxDepth = 10): Cluster[] {
  const cells = new Map<string, { sx: number; sy: number; counts: number[]; n: number }>()
  for (let i = 0; i < x.length; i++) {
    const key = `${Math.floor(x[i] / cell)},${Math.floor(y[i] / cell)}`
    let c = cells.get(key)
    if (!c) { c = { sx: 0, sy: 0, counts: new Array(maxDepth + 1).fill(0), n: 0 }; cells.set(key, c) }
    c.sx += x[i]; c.sy += y[i]; c.n++
    c.counts[Math.min(depth[i], maxDepth)]++
  }
  return [...cells.values()].map((c) => {
    let best = 0
    c.counts.forEach((v, d) => { if (v > c.counts[best]) best = d })
    return { x: c.sx / c.n, y: c.sy / c.n, count: c.n, depth: best, depthCounts: c.counts }
  })
}

/** Bubble radius in layout units: grows with the square root of the count but never exceeds ~half a cell. */
export function clusterRadius(count: number, maxCount: number, cell: number): number {
  return cell * (0.08 + 0.38 * Math.sqrt(count / maxCount))
}
