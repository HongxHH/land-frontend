import { describe, expect, it } from 'vitest'
import {
  filterAndRankRoomRows,
  filterAndRankUsageOptions,
  textMatchScore
} from '@/utils/textMatchRank.js'

describe('textMatchRank', () => {
  it('textMatchScore prefers exact over prefix over contains', () => {
    expect(textMatchScore('公寓式酒', '公寓式酒')).toBe(100)
    expect(textMatchScore('公寓式酒店', '公寓式酒')).toBe(80)
    expect(textMatchScore('精品公寓式酒店', '公寓式酒')).toBe(60)
    expect(textMatchScore('住宅', '公寓式酒')).toBe(0)
  })

  it('filterAndRankUsageOptions ranks exact usage pattern first', () => {
    const options = [
      { usagePattern: '公寓式酒店', usageCategoryText: '商业', floorAreaTypeText: '计容' },
      { usagePattern: '公寓式酒', usageCategoryText: '商业', floorAreaTypeText: '计容' },
      { usagePattern: '住宅', usageCategoryText: '住宅', floorAreaTypeText: '计容' }
    ]
    const ranked = filterAndRankUsageOptions(options, '公寓式酒')
    expect(ranked.map((item) => item.usagePattern)).toEqual(['公寓式酒', '公寓式酒店'])
  })

  it('filterAndRankRoomRows ranks exact roomUsage first', () => {
    const rows = [
      { roomNumber: '606', roomUsage: '公寓式酒店' },
      { roomNumber: '2901', roomUsage: '公寓式酒' }
    ]
    const ranked = filterAndRankRoomRows(rows, '公寓式酒', ['roomUsage', 'roomNumber'])
    expect(ranked.map((row) => row.roomNumber)).toEqual(['2901', '606'])
  })
})
