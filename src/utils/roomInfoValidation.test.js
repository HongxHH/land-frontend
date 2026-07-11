import { describe, expect, it } from 'vitest'
import {
  ROOM_AREA_MAX_DECIMALS,
  clampRoomAreaInput,
  formatRoomAreaDisplay,
  formatRoomAreaFromApi,
  getChangedRoomAreaFields,
  getRoomAreaFieldError,
  getRoomAreaNumericError,
  normalizeRoomAreaForCommit,
  sanitizeRoomAreaInputText,
  validateChangedRoomAreaFields,
  validateRoomAreaFields,
} from '@/utils/roomInfoValidation.js'

describe('formatRoomAreaFromApi', () => {
  it('preserves backend precision as string', () => {
    expect(formatRoomAreaFromApi('12.34567')).toBe('12.34567')
    expect(formatRoomAreaFromApi(12.3)).toBe('12.3')
  })

  it('returns empty for nullish values', () => {
    expect(formatRoomAreaFromApi(null)).toBe('')
    expect(formatRoomAreaFromApi('')).toBe('')
  })
})

describe('formatRoomAreaDisplay', () => {
  it('shows dash for empty values', () => {
    expect(formatRoomAreaDisplay('')).toBe('-')
    expect(formatRoomAreaDisplay(null)).toBe('-')
  })

  it('shows raw value for non-empty', () => {
    expect(formatRoomAreaDisplay('12.34567')).toBe('12.34567')
  })
})

describe('sanitizeRoomAreaInputText', () => {
  it('strips negative sign and letters', () => {
    expect(sanitizeRoomAreaInputText('-12.5')).toBe('12.5')
    expect(sanitizeRoomAreaInputText('abc12.3x')).toBe('12.3')
  })

  it('keeps only the first decimal point', () => {
    expect(sanitizeRoomAreaInputText('1.2.3')).toBe('1.23')
  })
})

describe('clampRoomAreaInput', () => {
  it('limits decimal places while typing', () => {
    expect(clampRoomAreaInput('12.3456789', 5)).toBe('12.34567')
    expect(clampRoomAreaInput('12.', 5)).toBe('12.')
  })

  it('removes pasted negative values', () => {
    expect(clampRoomAreaInput('-1.23', 5)).toBe('1.23')
  })
})

describe('getRoomAreaNumericError', () => {
  it('distinguishes invalid number from negative', () => {
    expect(getRoomAreaNumericError('buildingArea', 'abc')).toContain('有效数字')
    expect(getRoomAreaNumericError('buildingArea', '-1')).toContain('不能为负数')
    expect(getRoomAreaNumericError('buildingArea', '12.3')).toBeNull()
  })
})

describe('normalizeRoomAreaForCommit', () => {
  it('rounds to max decimals and trims trailing zeros', () => {
    expect(normalizeRoomAreaForCommit('12.345678')).toBe('12.34568')
    expect(normalizeRoomAreaForCommit('12.34000')).toBe('12.34')
    expect(normalizeRoomAreaForCommit('12')).toBe('12')
  })

  it('returns null for invalid values', () => {
    expect(normalizeRoomAreaForCommit('abc')).toBeNull()
    expect(normalizeRoomAreaForCommit('-1')).toBeNull()
  })
})

describe('validateChangedRoomAreaFields', () => {
  const snapshot = {
    buildingArea: '12.345678',
    innerArea: '1',
    balconyArea: '',
    sharedArea: '',
  }

  it('skips unchanged area fields with legacy precision', () => {
    const row = { ...snapshot, roomLevel: '2层' }
    expect(validateChangedRoomAreaFields(row, snapshot).ok).toBe(true)
  })

  it('validates only changed area fields', () => {
    const row = { ...snapshot, buildingArea: '-1' }
    const result = validateChangedRoomAreaFields(row, snapshot)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('不能为负数')
  })

  it('rejects invalid changed values', () => {
    const row = { ...snapshot, innerArea: 'abc' }
    const result = validateChangedRoomAreaFields(row, snapshot)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('有效数字')
  })
})

describe('getChangedRoomAreaFields', () => {
  it('returns only modified area keys', () => {
    const snapshot = { buildingArea: '1', innerArea: '2', balconyArea: '', sharedArea: '' }
    const row = { buildingArea: '1', innerArea: '3', balconyArea: '', sharedArea: '' }
    expect(getChangedRoomAreaFields(row, snapshot)).toEqual(['innerArea'])
  })
})

describe('validateRoomAreaFields', () => {
  it('reports decimal limit for create flow', () => {
    const tooManyDecimals = '0.' + '1'.repeat(ROOM_AREA_MAX_DECIMALS + 1)
    const result = validateRoomAreaFields({ buildingArea: tooManyDecimals })
    expect(result.ok).toBe(false)
    expect(result.message).toContain(`${ROOM_AREA_MAX_DECIMALS}位小数`)
  })
})

describe('getRoomAreaFieldError', () => {
  it('returns specific messages', () => {
    expect(getRoomAreaFieldError('buildingArea', '1.2.3')).toContain('有效数字')
    expect(getRoomAreaFieldError('buildingArea', '1.2345678')).toContain('5位小数')
  })
})
