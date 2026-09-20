import { describe, expect, it } from 'vitest'
import {
  getFileVerifyStatus,
  isFileAttentionFirst,
  isFileVerifyFailed,
  normalizeVerifiedFlag,
} from '@/utils/fileStatePresent.js'

describe('normalizeVerifiedFlag', () => {
  it('maps 1/0/null', () => {
    expect(normalizeVerifiedFlag(1)).toBe(1)
    expect(normalizeVerifiedFlag('1')).toBe(1)
    expect(normalizeVerifiedFlag(true)).toBe(1)
    expect(normalizeVerifiedFlag(0)).toBe(0)
    expect(normalizeVerifiedFlag('0')).toBe(0)
    expect(normalizeVerifiedFlag(false)).toBe(0)
    expect(normalizeVerifiedFlag(null)).toBeNull()
    expect(normalizeVerifiedFlag(undefined)).toBeNull()
  })
})

describe('getFileVerifyStatus', () => {
  it('weakens previous pass during PENDING/PARSING', () => {
    expect(getFileVerifyStatus({ fileState: 'PENDING', isVerified: 1 })).toEqual({
      label: '上一轮已通过',
      type: 'info',
    })
    expect(getFileVerifyStatus({ status: 'PARSING', isVerified: 0 })).toEqual({
      label: '上一轮未通过',
      type: 'info',
    })
    expect(getFileVerifyStatus({ fileState: 'PARSING', isVerified: null })).toEqual({
      label: '未校验',
      type: 'info',
    })
  })

  it('weakens previous pass during PARSE_FAIL', () => {
    expect(getFileVerifyStatus({ fileState: 'PARSE_FAIL', isVerified: 1 })).toEqual({
      label: '上一轮已通过',
      type: 'info',
    })
    expect(getFileVerifyStatus({ fileState: 'PARSE_FAIL', isVerified: 0 })).toEqual({
      label: '上一轮未通过',
      type: 'info',
    })
  })

  it('keeps terminal copy after PARSE_COMPLETE', () => {
    expect(getFileVerifyStatus({ fileState: 'PARSE_COMPLETE', isVerified: 1 })).toEqual({
      label: '已通过',
      type: 'success',
    })
    expect(getFileVerifyStatus({ fileState: 'PARSE_COMPLETE', isVerified: 0 })).toEqual({
      label: '未通过',
      type: 'danger',
    })
    expect(getFileVerifyStatus({ fileState: 'PARSE_COMPLETE', isVerified: null })).toEqual({
      label: '未校验',
      type: 'info',
    })
  })

  it('treats missing fileState as terminal three-state', () => {
    expect(getFileVerifyStatus({ isVerified: 1 }).label).toBe('已通过')
    expect(getFileVerifyStatus({ isVerified: 0 }).label).toBe('未通过')
    expect(getFileVerifyStatus({ isVerified: null }).label).toBe('未校验')
  })
})

describe('isFileVerifyFailed', () => {
  it('ignores previous fail while parse is in progress', () => {
    expect(isFileVerifyFailed({ fileState: 'PARSING', isVerified: 0 })).toBe(false)
    expect(isFileVerifyFailed({ fileState: 'PENDING', isVerified: 0 })).toBe(false)
    expect(isFileVerifyFailed({ fileState: 'PARSE_COMPLETE', isVerified: 0 })).toBe(true)
    expect(isFileVerifyFailed({ fileState: 'PARSE_FAIL', isVerified: 0 })).toBe(false)
    expect(isFileAttentionFirst({ fileState: 'PARSING', isVerified: 0 })).toBe(false)
    expect(isFileAttentionFirst({ fileState: 'PARSE_FAIL', isVerified: 1 })).toBe(true)
  })
})
