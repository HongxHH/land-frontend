import { describe, expect, it } from 'vitest'
import { groupScannedEntries } from '@/utils/localFolderFileMatcher.js'

describe('groupScannedEntries', () => {
  it('keeps manually classified originally unmatched files in the unmatched group', () => {
    const groups = groupScannedEntries([
      { id: 'unmatched', fileContextType: null, unmatchedOrigin: true },
      { id: 'classified-unmatched', fileContextType: 'SURVEY_REPORT', unmatchedOrigin: true },
      { id: 'auto-matched', fileContextType: 'CONTRACT', unmatchedOrigin: false },
      { id: 'cleared-auto-match', fileContextType: null, unmatchedOrigin: false },
    ])

    expect(groups.UNMATCHED.map((entry) => entry.id)).toEqual([
      'unmatched',
      'classified-unmatched',
      'cleared-auto-match',
    ])
    expect(groups.CONTRACT.map((entry) => entry.id)).toEqual(['auto-matched'])
    expect(groups.SURVEY_REPORT).toEqual([])
  })
})
