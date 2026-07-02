import { describe, expect, it } from 'vitest'
import {
  MISSING_USAGE_LABEL,
  aggregateProjectUnknownUsagesJson,
  buildPendingUsageDetailLines,
  countDistinctUnknownUsageClasses,
  countUnknownUsageOccurrences,
  formatRoomNumbersInline,
  groupRoomNumbersByUsageName,
  isEmptyUnknownUsagesJson,
  isPlaceholderVerificationReason,
  mergeUnknownUsagePolicyRows,
  parseDistinctUnknownUsageNames,
  projectHasPendingUnknownUsageRows,
  reportHasPendingUnknownUsage,
  rowHasUnknownUsagesDetail
} from '@/composables/file-upload/surveyUsagePending'

describe('surveyUsagePending unknown usage helpers', () => {
  const sampleMap = JSON.stringify({
    '101': '酒店式公寓',
    '102': '酒店式公寓',
    '103': MISSING_USAGE_LABEL
  })

  it('parseDistinctUnknownUsageNames extracts unique names from map', () => {
    expect(parseDistinctUnknownUsageNames(sampleMap)).toEqual(['酒店式公寓'])
  })

  it('parseDistinctUnknownUsageNames supports legacy array format', () => {
    expect(parseDistinctUnknownUsageNames(JSON.stringify(['会所', '会所']))).toEqual(['会所'])
  })

  it('countDistinctUnknownUsageClasses counts classes', () => {
    expect(countDistinctUnknownUsageClasses(sampleMap)).toBe(1)
  })

  it('countUnknownUsageOccurrences counts per usage name', () => {
    const counts = countUnknownUsageOccurrences(sampleMap)
    expect(counts.get('酒店式公寓')).toBe(2)
  })

  it('buildPendingUsageDetailLines formats room lines', () => {
    expect(buildPendingUsageDetailLines(sampleMap)).toEqual([
      '101：酒店式公寓',
      '102：酒店式公寓',
      '103：用途缺失'
    ])
  })

  it('reportHasPendingUnknownUsage detects pending state', () => {
    expect(
      reportHasPendingUnknownUsage({
        hasUnknownUsage: 1,
        unknownUsages: sampleMap
      })
    ).toBe(true)
    expect(
      reportHasPendingUnknownUsage({
        hasUnknownUsage: 0,
        unknownUsages: '{}'
      })
    ).toBe(false)
  })

  it('groupRoomNumbersByUsageName groups rooms by usage', () => {
    const grouped = groupRoomNumbersByUsageName(sampleMap)
    expect(grouped.get('酒店式公寓')).toEqual(['101', '102'])
    expect(grouped.get(MISSING_USAGE_LABEL)).toEqual(['103'])
  })

  it('formatRoomNumbersInline joins room labels', () => {
    expect(formatRoomNumbersInline(['-184', '-185'])).toBe('-184、-185')
  })

  it('isEmptyUnknownUsagesJson treats placeholder json as empty', () => {
    expect(isEmptyUnknownUsagesJson(null)).toBe(true)
    expect(isEmptyUnknownUsagesJson('[]')).toBe(true)
    expect(isEmptyUnknownUsagesJson('{}')).toBe(true)
    expect(isEmptyUnknownUsagesJson(sampleMap)).toBe(false)
  })

  it('rowHasUnknownUsagesDetail respects hasUnknownUsage flag and map content', () => {
    expect(rowHasUnknownUsagesDetail({ hasUnknownUsage: 1, unknownUsages: '[]' })).toBe(true)
    expect(rowHasUnknownUsagesDetail({ hasUnknownUsage: 0, unknownUsages: '[]' })).toBe(false)
    expect(rowHasUnknownUsagesDetail({ hasUnknownUsage: 0, unknownUsages: sampleMap })).toBe(true)
  })

  it('mergeUnknownUsagePolicyRows builds synthetic rows from report json', () => {
    const rows = mergeUnknownUsagePolicyRows(sampleMap, [])
    expect(rows).toHaveLength(2)
    const hotel = rows.find((row) => row.usageName === '酒店式公寓')
    expect(hotel?.occurrenceCount).toBe(2)
    expect(hotel?.roomNumbers).toEqual(['101', '102'])
    const missing = rows.find((row) => row.usageName === '用途缺失')
    expect(missing?.occurrenceCount).toBe(1)
    expect(missing?.readOnly).toBe(true)
  })

  it('aggregateProjectUnknownUsagesJson merges rows from summary table', () => {
    const json = aggregateProjectUnknownUsagesJson([
      { unknownUsages: JSON.stringify({ '201': '会所' }) },
      { unknownUsages: sampleMap }
    ])
    const names = parseDistinctUnknownUsageNames(json)
    expect(names).toEqual(expect.arrayContaining(['酒店式公寓', '会所']))
  })

  it('projectHasPendingUnknownUsageRows detects pending rows from table data', () => {
    expect(projectHasPendingUnknownUsageRows([{ hasUnknownUsage: 1, unknownUsages: '[]' }])).toBe(true)
    expect(projectHasPendingUnknownUsageRows([{ hasUnknownUsage: 0, unknownUsages: sampleMap }])).toBe(true)
    expect(projectHasPendingUnknownUsageRows([{ hasUnknownUsage: 0, unknownUsages: '{}' }])).toBe(false)
  })

  it('isPlaceholderVerificationReason treats dash as empty', () => {
    expect(isPlaceholderVerificationReason('-')).toBe(true)
    expect(isPlaceholderVerificationReason('')).toBe(true)
    expect(isPlaceholderVerificationReason('建筑面积不一致')).toBe(false)
  })
})
