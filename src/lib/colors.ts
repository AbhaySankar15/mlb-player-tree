export const ROOT_COLOR = '#ffd23f'
export const DEPTH_COLORS = [
  '#ffd23f', // 0 root
  '#ff6b6b', '#ff9f43', '#feca57', '#7bed9f', '#1dd1a1',
  '#48dbfb', '#54a0ff', '#8c7ae6', '#c56cf0', '#ff78c4',
]
/** Edge color tinted by the child's depth; deeper edges are fainter so dense outer bundles don't blow out. */
export function edgeColor(childDepth: number): string {
  const alpha = childDepth <= 1 ? 0.3 : childDepth === 2 ? 0.1 : Math.max(0.04, 0.09 - childDepth * 0.01)
  return hexToRgba(depthColor(childDepth), alpha)
}
export function edgeColorFocused(childDepth: number): string {
  return hexToRgba(depthColor(childDepth), 0.55)
}
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`
}
export const EDGE_DIM = 'rgba(120,140,190,0.03)'
export const FOCUS_DIM_NODE = '#3a4468'
export const PATH_COLOR = '#ffffff'
export const DIM_NODE = '#2a3350'

export function depthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(Math.max(depth, 0), DEPTH_COLORS.length - 1)]
}

export function nodeSize(depth: number): number {
  if (depth === 0) return 12
  if (depth === 1) return 2
  return Math.max(0.7, 1.7 - depth * 0.12)
}
