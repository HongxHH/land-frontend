import { describe, expect, it } from 'vitest'
import { isPlanningReviewEnabled } from '@/config/featureFlags.js'
import {
  getSmartImportRuleGuide,
  groupScannedEntries,
  matchFileContextType,
} from '@/utils/localFolderFileMatcher.js'

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

describe('matchFileContextType survey report', () => {
  it('recognizes survey reports by filename only for pdf', () => {
    expect(matchFileContextType('项目实测报告.pdf')).toBe('SURVEY_REPORT')
    expect(matchFileContextType('1栋.PDF')).toBe('SURVEY_REPORT')
    expect(matchFileContextType('项目实测报告.xlsx')).toBeNull()
    expect(matchFileContextType('1栋.xls')).toBeNull()
    expect(matchFileContextType('地下室.xlsx')).toBeNull()
  })

  it('recognizes pdfs in a survey directory and leaves spreadsheets unmatched', () => {
    expect(matchFileContextType('实测成果/说明.pdf')).toBe('SURVEY_REPORT')
    expect(matchFileContextType('实测成果/说明.xlsx')).toBeNull()
  })
})

describe('getSmartImportRuleGuide', () => {
  it('lists categories in match order and keeps each example classifiable', () => {
    const { categories } = getSmartImportRuleGuide()
    const types = categories.map((item) => item.type)
    const expected = [
      'PROJECT_PARTY_SURVEY_SUMMARY',
      'CAPACITY_INDICATOR',
      ...(isPlanningReviewEnabled() ? ['PLANNING_REVIEW'] : []),
      'CONTRACT',
      'SURVEY_REPORT',
    ]

    expect(types).toEqual(expected)
    for (const item of categories) {
      expect(item.examples.length).toBeGreaterThan(0)
      for (const example of item.examples) {
        expect(matchFileContextType(example)).toBe(item.type)
      }
    }
  })
})
