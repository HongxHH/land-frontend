import { describe, expect, it } from 'vitest'
import {
  FILE_STATE_FILTER_OPTIONS,
  getFileStateLabel,
  getFileStateTagType
} from './fileStatePresent.js'

describe('fileStatePresent', () => {
  it('maps known backend codes to filter options', () => {
    const codes = FILE_STATE_FILTER_OPTIONS.map((item) => item.value)
    expect(codes).toContain('PARSING')
    expect(codes).toContain('PARSE_COMPLETE')
  })

  it('returns label for parse complete', () => {
    expect(getFileStateLabel('PARSE_COMPLETE')).toBe('解析完成')
  })

  it('returns tag type for failure states', () => {
    expect(getFileStateTagType('PARSE_FAIL')).toBe('danger')
  })
})
