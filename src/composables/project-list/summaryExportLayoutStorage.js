import { SUMMARY_LAYOUT_STORAGE_KEY, SUMMARY_COLUMN_SCHEMA, getDefaultSummaryLayoutRows } from './summaryExportColumnSchema.js'

function schemaIds() {
  return new Set(SUMMARY_COLUMN_SCHEMA.map((c) => c.id))
}

/**
 * 合并本地存储与当前 schema（新版本增列时自动补上）
 * @param {string | null} raw
 * @returns {Array<{ id: string, visible: boolean }>}
 */
function parseStoredSummaryLayout(raw) {
  const defaults = getDefaultSummaryLayoutRows()
  if (!raw) return defaults

  try {
    const parsed = JSON.parse(raw)
    const rows = parsed?.rows
    if (!Array.isArray(rows)) return defaults

    const valid = schemaIds()
    const vis = new Map()
    const order = []
    const schemaOrder = SUMMARY_COLUMN_SCHEMA.map((c) => c.id)
    const schemaIndex = (id) => {
      const i = schemaOrder.indexOf(id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }

    for (const r of rows) {
      if (!r || typeof r.id !== 'string' || !valid.has(r.id) || order.includes(r.id)) continue
      order.push(r.id)
      vis.set(r.id, r.visible !== false)
    }

    /** 新版本增列：按 schema 顺序插入到相邻列之间，避免一直堆在末尾与主表不一致 */
    for (const c of SUMMARY_COLUMN_SCHEMA) {
      if (order.includes(c.id)) continue
      const p = schemaIndex(c.id)
      let insertAt = order.length
      for (let i = 0; i < order.length; i++) {
        if (schemaIndex(order[i]) > p) {
          insertAt = i
          break
        }
      }
      order.splice(insertAt, 0, c.id)
    }

    return order.map((id) => ({
      id,
      visible: vis.has(id) ? vis.get(id) : true
    }))
  } catch {
    return defaults
  }
}

export function loadSummaryLayoutFromStorage() {
  if (typeof localStorage === 'undefined') return getDefaultSummaryLayoutRows()
  return parseStoredSummaryLayout(localStorage.getItem(SUMMARY_LAYOUT_STORAGE_KEY))
}

/**
 * @param {Array<{ id: string, visible: boolean }>} rows
 */
export function saveSummaryLayoutToStorage(rows) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(SUMMARY_LAYOUT_STORAGE_KEY, JSON.stringify({ rows }))
  } catch {
    /* ignore quota */
  }
}
