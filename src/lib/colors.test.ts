import { describe, expect, it } from 'vitest'
import { edgeColor, hexToRgba, nodeSize } from './colors'

describe('colors', () => {
  it('converts hex to rgba', () => {
    expect(hexToRgba('#ff8000', 0.5)).toBe('rgba(255,128,0,0.5)')
  })
  it('fades edges with depth but never below a floor', () => {
    const a = (d: number) => Number(edgeColor(d).match(/,([\d.]+)\)$/)![1])
    expect(a(1)).toBeGreaterThan(a(2))
    expect(a(2)).toBeGreaterThan(a(5))
    expect(a(10)).toBeGreaterThanOrEqual(0.04)
  })
  it('keeps the root largest and distant nodes small but visible', () => {
    expect(nodeSize(0)).toBeGreaterThan(nodeSize(1))
    expect(nodeSize(10)).toBeGreaterThanOrEqual(0.7)
  })
})
