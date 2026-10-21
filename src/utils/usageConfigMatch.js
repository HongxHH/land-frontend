/**
 * 与后端 UsageConfigServiceImpl 一致：priority 升序，null 排在最后，同优先级保持原顺序。
 * 非正则使用 includes；正则使用 RegExp，编译失败视为不命中。
 */

function priorityRank(config) {
  const value = config?.priority
  if (value == null || value === '') return Number.POSITIVE_INFINITY
  const num = Number(value)
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY
}

function matchesPattern(usageName, config) {
  const pattern = config?.usagePattern
  if (pattern == null || String(pattern).trim() === '') return false
  if (Number(config?.isRegex) === 1) {
    try {
      return new RegExp(String(pattern)).test(String(usageName))
    } catch {
      return false
    }
  }
  return String(usageName).includes(String(pattern))
}

/**
 * @param {unknown} usageName
 * @param {Array<Record<string, unknown>>} configs
 * @returns {Record<string, unknown> | null}
 */
export function matchUsageConfig(usageName, configs) {
  if (usageName == null || String(usageName).trim() === '') return null
  const list = Array.isArray(configs) ? configs : []
  const sorted = list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => priorityRank(a.item) - priorityRank(b.item) || a.index - b.index)

  for (const { item } of sorted) {
    if (matchesPattern(usageName, item)) return item
  }
  return null
}
