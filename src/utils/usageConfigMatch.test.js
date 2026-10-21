import { describe, expect, it } from 'vitest'
import { matchUsageConfig } from '@/utils/usageConfigMatch.js'

const config = (overrides) => ({
  id: overrides.id,
  usagePattern: overrides.usagePattern,
  priority: Object.prototype.hasOwnProperty.call(overrides, 'priority') ? overrides.priority : 100,
  isRegex: overrides.isRegex ?? 0,
  usageCategoryText: overrides.usageCategoryText || '商业',
  floorAreaTypeText: overrides.floorAreaTypeText || '计容',
})

describe('matchUsageConfig', () => {
  it('包含匹配，并让更小的 priority 先命中', () => {
    const commercial = config({ id: 2, usagePattern: '商业', priority: 100 })
    const shorter = config({
      id: 1,
      usagePattern: '商',
      priority: 1,
      usageCategoryText: '其他计容',
    })
    expect(matchUsageConfig('商业', [commercial, shorter])?.id).toBe(1)
  })

  it('同优先级保持原顺序', () => {
    const first = config({ id: 'a', usagePattern: '商业', priority: 10 })
    const second = config({ id: 'b', usagePattern: '商', priority: 10 })
    expect(matchUsageConfig('商业', [first, second])?.id).toBe('a')
  })

  it('空用途不命中', () => {
    expect(matchUsageConfig('', [config({ id: 1, usagePattern: '商业' })])).toBeNull()
    expect(matchUsageConfig('   ', [config({ id: 1, usagePattern: '商业' })])).toBeNull()
  })

  it('非法正则跳过该配置，继续匹配后面的包含规则', () => {
    const broken = config({ id: 1, usagePattern: '(', priority: 1, isRegex: 1 })
    const fallback = config({ id: 2, usagePattern: '商业', priority: 50 })
    expect(matchUsageConfig('商业', [broken, fallback])?.id).toBe(2)
  })

  it('正则 find 命中子串', () => {
    const pattern = config({ id: 9, usagePattern: '商.*业', priority: 1, isRegex: 1 })
    expect(matchUsageConfig('临街商业', [pattern])?.id).toBe(9)
  })

  it('priority 为空时排在有优先级的配置之后', () => {
    const unranked = config({ id: 1, usagePattern: '商', priority: null })
    const ranked = config({ id: 2, usagePattern: '商业', priority: 200 })
    expect(matchUsageConfig('商业', [unranked, ranked])?.id).toBe(2)
  })
})
