/**
 * 文本与关键词的匹配得分：精确 > 前缀 > 包含。
 * @param {unknown} text
 * @param {unknown} keyword
 * @returns {number}
 */
export function textMatchScore(text, keyword) {
  const t = String(text ?? '').trim().toLowerCase()
  const k = String(keyword ?? '').trim().toLowerCase()
  if (!k || !t) return 0
  if (t === k) return 100
  if (t.startsWith(k)) return 80
  if (t.includes(k)) return 60
  return 0
}

/**
 * 在多个字段中取最高匹配分；fieldBoosts 可按字段名加权（如 roomUsage 优先）。
 * @param {unknown} keyword
 * @param {Array<{ text: unknown, boost?: number }>} fields
 * @returns {number}
 */
export function bestTextMatchScore(keyword, fields = []) {
  let best = 0
  for (const field of fields) {
    const boost = Number(field?.boost ?? 1) || 1
    const score = textMatchScore(field?.text, keyword) * boost
    if (score > best) best = score
  }
  return best
}

/**
 * 按关键词过滤并按匹配度降序排序（同分保持原序）。
 * @template T
 * @param {T[]} items
 * @param {unknown} keyword
 * @param {(item: T) => Array<{ text: unknown, boost?: number }>} getMatchFields
 * @returns {T[]}
 */
export function filterAndRankByKeyword(items, keyword, getMatchFields) {
  const list = Array.isArray(items) ? items : []
  const kw = String(keyword ?? '').trim().toLowerCase()
  if (!kw) return list

  return list
    .map((item, index) => ({
      item,
      index,
      score: bestTextMatchScore(kw, getMatchFields(item))
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item)
}

/** 户室行搜索字段权重：用途名优先于其它列 */
export const ROOM_TABLE_SEARCH_FIELD_BOOSTS = {
  roomUsage: 1.25,
  usageCategory: 1,
  floorAreaType: 1,
  remark: 1,
  roomLevel: 1,
  roomNumber: 1
}

/**
 * @param {Record<string, unknown>} row
 * @param {unknown} keyword
 * @param {string[]} fields
 * @returns {number}
 */
export function roomRowSearchMatchScore(row, keyword, fields) {
  const matchFields = (fields || []).map((field) => ({
    text: row?.[field],
    boost: ROOM_TABLE_SEARCH_FIELD_BOOSTS[field] ?? 1
  }))
  return bestTextMatchScore(keyword, matchFields)
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {unknown} keyword
 * @param {string[]} fields
 * @returns {Record<string, unknown>[]}
 */
export function filterAndRankRoomRows(rows, keyword, fields) {
  const kw = String(keyword ?? '').trim().toLowerCase()
  if (!kw) return rows

  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      row,
      index,
      score: roomRowSearchMatchScore(row, kw, fields)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ row }) => row)
}

/**
 * @param {Array<{ usagePattern?: string, usageCategoryText?: string, floorAreaTypeText?: string }>} options
 * @param {unknown} keyword
 * @returns {typeof options}
 */
export function filterAndRankUsageOptions(options, keyword) {
  return filterAndRankByKeyword(options, keyword, (item) => [
    { text: item?.usagePattern, boost: 1.25 },
    { text: item?.usageCategoryText },
    { text: item?.floorAreaTypeText }
  ])
}
