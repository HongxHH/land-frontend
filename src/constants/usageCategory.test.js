import { describe, expect, it } from 'vitest'
import {
  floorAreaTypeLabel,
  floorAreaTypeTagType,
  normalizeUsageCategoryCode,
  usageCategoryLabel
} from '@/constants/usageCategory.js'

describe('usageCategory constants', () => {
  it('maps usage category code to Chinese label', () => {
    expect(usageCategoryLabel('RESIDENTIAL')).toBe('住宅')
    expect(usageCategoryLabel('COMMERCIAL')).toBe('商业')
    expect(usageCategoryLabel('UNKNOWN')).toBe('未知')
  })

  it('passes through already localized usage category text', () => {
    expect(usageCategoryLabel('住宅', '未知')).toBe('住宅')
    expect(usageCategoryLabel('商业', '未知')).toBe('商业')
  })

  it('maps floor area type code to Chinese label', () => {
    expect(floorAreaTypeLabel('BUILDABLE')).toBe('计容')
    expect(floorAreaTypeLabel('NON_BUILDABLE')).toBe('不计容')
    expect(floorAreaTypeLabel('计容')).toBe('计容')
    expect(floorAreaTypeLabel('不计容')).toBe('不计容')
  })

  it('maps floor area type code to tag color type', () => {
    expect(floorAreaTypeTagType('BUILDABLE')).toBe('success')
    expect(floorAreaTypeTagType('NON_BUILDABLE')).toBe('warning')
    expect(floorAreaTypeTagType('计容')).toBe('success')
    expect(floorAreaTypeTagType('不计容')).toBe('warning')
  })

  it('normalizes Chinese label back to code', () => {
    expect(normalizeUsageCategoryCode('住宅')).toBe('RESIDENTIAL')
    expect(normalizeUsageCategoryCode('residential')).toBe('RESIDENTIAL')
  })
})
