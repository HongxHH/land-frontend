import { describe, expect, it } from 'vitest'
import { getArchiveVerifyStatus, isArchiveVerifyFailed } from '@/composables/project-list/archiveFolderPresent.js'

describe('getArchiveVerifyStatus', () => {
  it('delegates in-progress copy to fileStatePresent', () => {
    expect(getArchiveVerifyStatus({ fileState: 'PARSING', isVerified: 1 })).toEqual({
      label: '上一轮已通过',
      type: 'info',
    })
    expect(getArchiveVerifyStatus({ fileState: 'PARSE_COMPLETE', isVerified: 1 })).toEqual({
      label: '已通过',
      type: 'success',
    })
    expect(getArchiveVerifyStatus({ fileState: 'PARSE_FAIL', isVerified: 1 })).toEqual({
      label: '上一轮已通过',
      type: 'info',
    })
  })

  it('does not treat previous fail as current fail while parsing', () => {
    expect(isArchiveVerifyFailed({ fileState: 'PARSING', isVerified: 0 })).toBe(false)
    expect(isArchiveVerifyFailed({ fileState: 'PARSE_COMPLETE', isVerified: 0 })).toBe(true)
  })
})
