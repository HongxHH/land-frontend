import { describe, expect, it } from 'vitest'
import {
  formatPendingRoomLabel,
  resolveRoomUsageForUpdate,
} from '@/composables/file-upload/surveyUsagePending.js'

describe('resolveRoomUsageForUpdate', () => {
  it('空白用途传空字符串，不补默认词', () => {
    expect(resolveRoomUsageForUpdate('')).toBe('')
    expect(resolveRoomUsageForUpdate('   ')).toBe('')
    expect(resolveRoomUsageForUpdate('-')).toBe('')
    expect(resolveRoomUsageForUpdate(null)).toBe('')
  })

  it('已填写的用途去掉首尾空白', () => {
    expect(resolveRoomUsageForUpdate('商业')).toBe('商业')
    expect(resolveRoomUsageForUpdate(' 公寓式酒 ')).toBe('公寓式酒')
  })
})

describe('formatPendingRoomLabel', () => {
  it('楼层和房号分开显示，旧的纯房号保持原样', () => {
    expect(formatPendingRoomLabel('1|01')).toBe('1 / 01')
    expect(formatPendingRoomLabel('01')).toBe('01')
    expect(formatPendingRoomLabel('|01')).toBe('|01')
  })
})
