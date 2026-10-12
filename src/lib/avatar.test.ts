import { describe, expect, it } from 'vitest'
import { colorFor, hash, initials, leagueChips, playerImageUrl, teamAbbr } from './avatar'

describe('avatar helpers', () => {
  it('builds initials from first and last word', () => {
    expect(initials('Rich Hill')).toBe('RH')
    expect(initials('José Fernández')).toBe('JF')
    expect(initials('Ken Griffey Jr.')).toBe('KJ')
    expect(initials('Hill')).toBe('H')
    expect(initials('')).toBe('?')
    expect(initials('  - ')).toBe('?')
  })
  it('gives stable colors per key, different for different keys', () => {
    expect(colorFor('hillri01')).toEqual(colorFor('hillri01'))
    expect(colorFor('hillri01').bg).not.toBe(colorFor('paigesa01').bg)
    expect(hash('a')).toBe(hash('a'))
  })
  it('abbreviates teams and collapses Negro Leagues chips', () => {
    expect(teamAbbr('bos')).toBe('BOS')
    expect(teamAbbr('CHN')).toBe('CHN')
    expect(leagueChips('AL,IND,NAL,NN2,NNL,NL')).toEqual(['AL', 'Negro Leagues', 'NL'])
  })
  it('has no licensed image source configured', () => {
    expect(playerImageUrl('hillri01')).toBeNull()
  })
})
