import { describe, expect, it } from 'vitest'
import { pathToRoot } from './pathToRoot'

describe('pathToRoot', () => {
  const parent = [-1, 0, 1, 1, -1, 4]
  it('walks to root', () => expect(pathToRoot(parent, 2)).toEqual([2, 1, 0]))
  it('root is itself', () => expect(pathToRoot(parent, 0)).toEqual([0]))
  it('other component', () => expect(pathToRoot(parent, 5)).toEqual([5, 4]))
  it('guards cycles', () => expect(pathToRoot([1, 0], 0)).toEqual([0, 1]))
  it('out of range yields empty', () => expect(pathToRoot(parent, 99)).toEqual([]))
})
