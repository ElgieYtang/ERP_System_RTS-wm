import { describe, expect, it } from 'vitest'
import { paginateItems } from './quotations.js'

describe('paginateItems', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('returns the first page', () => {
    const result = paginateItems(items, 1, 10)
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.currentPage).toBe(1)
    expect(result.totalPages).toBe(3)
    expect(result.totalItems).toBe(25)
  })

  it('clamps page past the end', () => {
    const result = paginateItems(items, 99, 10)
    expect(result.currentPage).toBe(3)
    expect(result.items).toEqual([21, 22, 23, 24, 25])
  })

  it('handles empty lists', () => {
    const result = paginateItems([], 1, 10)
    expect(result.items).toEqual([])
    expect(result.totalPages).toBe(1)
    expect(result.totalItems).toBe(0)
  })
})
