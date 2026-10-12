export const ROOT_COLOR = '#ffd23f'
export const DEPTH_COLORS = [
  '#ffd23f', // 0 root
  '#ff6b6b', '#ff9f43', '#feca57', '#7bed9f', '#1dd1a1',
  '#48dbfb', '#54a0ff', '#8c7ae6', '#c56cf0', '#ff78c4',
]
export const EDGE_COLOR = 'rgba(120,140,190,0.16)'
export const EDGE_DIM = 'rgba(120,140,190,0.04)'
export const PATH_COLOR = '#ffffff'
export const DIM_NODE = '#2a3350'

export function depthColor(depth: number): string {
  return DEPTH_COLORS[Math.min(Math.max(depth, 0), DEPTH_COLORS.length - 1)]
}

export function nodeSize(depth: number): number {
  if (depth === 0) return 14
  if (depth === 1) return 3
  return Math.max(0.8, 2.4 - depth * 0.18)
}
