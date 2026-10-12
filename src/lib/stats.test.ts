import { describe, expect, it } from 'vitest'
import { battingRates, compressYears, fmtHeight, fmtIP, fmtRate, pitchingRates, statObject, sumCol, totals } from './stats'

const names = ['G', 'AB', 'H', 'SB']
const rows = [[0, 10, 40, 12, null], [1, 5, 20, 8, null], [2, 2, null, null, 3]]

describe('stats', () => {
  it('sums columns and keeps all-missing stats null', () => {
    expect(sumCol(rows, names, 'G')).toBe(17)
    expect(sumCol(rows, names, 'AB')).toBe(60)
    expect(sumCol(rows.slice(0, 2), names, 'SB')).toBeNull()
    expect(totals(rows, names).SB).toBe(3)
  })
  it('computes batting rates', () => {
    const r = battingRates({ AB: 100, H: 30, '2B': 5, '3B': 1, HR: 4, BB: 10, HBP: 2, SF: 3 })
    expect(r.AVG).toBeCloseTo(0.3)
    expect(r.OBP).toBeCloseTo(42 / 115)
    expect(r.SLG).toBeCloseTo((30 + 5 + 2 + 12) / 100)
    expect(battingRates({ AB: 0, H: 0 }).AVG).toBeNull()
  })
  it('computes pitching rates and innings', () => {
    const r = pitchingRates({ IPouts: 270, ER: 30, H: 80, BB: 20 })
    expect(r.ERA).toBeCloseTo(3.0)
    expect(r.WHIP).toBeCloseTo(1.111, 3)
    expect(fmtIP(200)).toBe('66.2')
    expect(pitchingRates({ IPouts: 0 }).ERA).toBeNull()
  })
  it('formats rates, heights and year ranges', () => {
    expect(fmtRate(0.3014)).toBe('.301')
    expect(fmtRate(1.0)).toBe('1.000')
    expect(fmtRate(null)).toBe('—')
    expect(fmtHeight('74')).toBe('6′ 2″')
    expect(fmtHeight('')).toBeNull()
    expect(compressYears([2015, 2009, 2010, 2011, 2022, 2011])).toBe('2009–2011, 2015, 2022')
  })
  it('maps a row to named stats', () => {
    expect(statObject(rows[2], names)).toEqual({ G: 2, AB: null, H: null, SB: 3 })
  })
})
