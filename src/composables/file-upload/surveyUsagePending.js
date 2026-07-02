/** 与后端 SurveyReportUsageLabels.MISSING_USAGE_LABEL 保持一致 */
export const MISSING_USAGE_LABEL = '（用途缺失）'

export function isBlankRoomUsage(roomUsage) {
  const text = String(roomUsage ?? '').trim()
  return !text || text === '-'
}

export function parsePendingUsageMap(unknownUsagesJson) {
  if (!unknownUsagesJson) return {}
  try {
    const raw = typeof unknownUsagesJson === 'string' ? JSON.parse(unknownUsagesJson) : unknownUsagesJson
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return raw
  } catch {
    return {}
  }
}

export function countMissingUsageFromSummary(unknownUsagesJson) {
  const map = parsePendingUsageMap(unknownUsagesJson)
  return Object.values(map).filter((value) => String(value ?? '').trim() === MISSING_USAGE_LABEL).length
}

export function countMissingUsageInRoomRows(roomRows = []) {
  return roomRows.filter((row) => isBlankRoomUsage(row?.roomUsage)).length
}

export function summaryHasMissingUsage(unknownUsagesJson) {
  return countMissingUsageFromSummary(unknownUsagesJson) > 0
}

/** 汇总表 unknownUsages 是否为占位空值（'[]' / '{}' / 空 Map） */
export function isEmptyUnknownUsagesJson(raw) {
  if (raw === null || raw === undefined) return true
  const text = String(raw).trim()
  if (!text || text === '[]' || text === '{}') return true
  return Object.keys(parsePendingUsageMap(raw)).length === 0
}

/** 汇总行是否应展示「待确认用途详情」列内容 */
export function rowHasUnknownUsagesDetail(row) {
  if (Number(row?.hasUnknownUsage) === 1) return true
  return !isEmptyUnknownUsagesJson(row?.unknownUsages)
}

/** 验证失败原因是否为占位符（与详情弹窗、审核页一致） */
export function isPlaceholderVerificationReason(value) {
  const text = String(value ?? '').trim()
  return !text || text === '-'
}

export function projectHasMissingUsage(displayTableData = []) {
  const rows = Array.isArray(displayTableData) ? displayTableData : []
  return rows.some(
    (row) => Number(row?.hasUnknownUsage) === 1 && summaryHasMissingUsage(row?.unknownUsages)
  )
}

export function formatPendingUsageDisplay(raw) {
  if (!raw) return '—'
  const map = parsePendingUsageMap(raw)
  const entries = Object.entries(map)
  if (!entries.length) return '—'

  const missing = entries.filter(([, value]) => String(value ?? '').trim() === MISSING_USAGE_LABEL)
  const others = entries.filter(([, value]) => String(value ?? '').trim() !== MISSING_USAGE_LABEL)

  const parts = []
  if (missing.length) {
    parts.push(`用途缺失 ${missing.length} 户`)
  }
  for (const [, value] of others) {
    const text = String(value ?? '').trim()
    if (text) parts.push(text)
  }
  const unique = [...new Set(parts)]
  const joined = unique.join('、')
  return joined.length > 80 ? `${joined.slice(0, 80)}…` : joined
}

export function pendingUsageTooltip(raw) {
  if (!raw) return ''
  const map = parsePendingUsageMap(raw)
  const lines = Object.entries(map).map(([room, usage]) => {
    const label = String(usage ?? '').trim() === MISSING_USAGE_LABEL ? '用途缺失' : String(usage ?? '').trim()
    return `${room}：${label}`
  })
  return lines.length ? lines.join('\n') : formatPendingUsageDisplay(raw)
}

/** 从汇总 unknownUsages（Map 或历史数组）提取去重后的未知用途名，不含「用途缺失」占位 */
export function parseDistinctUnknownUsageNames(unknownUsagesJson) {
  if (!unknownUsagesJson) return []
  try {
    const raw = typeof unknownUsagesJson === 'string' ? JSON.parse(unknownUsagesJson) : unknownUsagesJson
    if (Array.isArray(raw)) {
      const set = new Set()
      for (const item of raw) {
        const name = String(item ?? '').trim()
        if (name && name !== MISSING_USAGE_LABEL) set.add(name)
      }
      return [...set]
    }
    const map = parsePendingUsageMap(raw)
    const set = new Set()
    for (const value of Object.values(map)) {
      const name = String(value ?? '').trim()
      if (name && name !== MISSING_USAGE_LABEL) set.add(name)
    }
    return [...set]
  } catch {
    return []
  }
}

export function countDistinctUnknownUsageClasses(unknownUsagesJson) {
  return parseDistinctUnknownUsageNames(unknownUsagesJson).length
}

/** 按用途名统计出现次数（不含用途缺失占位） */
export function countUnknownUsageOccurrences(unknownUsagesJson) {
  const counts = new Map()
  const map = parsePendingUsageMap(unknownUsagesJson)
  for (const value of Object.values(map)) {
    const name = String(value ?? '').trim()
    if (!name || name === MISSING_USAGE_LABEL) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return counts
}

export function buildPendingUsageDetailLines(unknownUsagesJson) {
  const map = parsePendingUsageMap(unknownUsagesJson)
  return Object.entries(map).map(([room, usage]) => {
    const text = String(usage ?? '').trim()
    const label = text === MISSING_USAGE_LABEL ? '用途缺失' : text || '—'
    return `${room}：${label}`
  })
}

/** 按用途名分组房号/户号（用途缺失单独一组，key 为 MISSING_USAGE_LABEL） */
export function groupRoomNumbersByUsageName(unknownUsagesJson) {
  const grouped = new Map()
  const map = parsePendingUsageMap(unknownUsagesJson)
  for (const [room, usage] of Object.entries(map)) {
    const roomLabel = String(room ?? '').trim()
    if (!roomLabel) continue
    const usageName = String(usage ?? '').trim() || MISSING_USAGE_LABEL
    if (!grouped.has(usageName)) grouped.set(usageName, [])
    grouped.get(usageName).push(roomLabel)
  }
  for (const [key, rooms] of grouped) {
    grouped.set(
      key,
      [...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    )
  }
  return grouped
}

export function formatRoomNumbersInline(roomNumbers = []) {
  const list = (roomNumbers || []).map((item) => String(item ?? '').trim()).filter(Boolean)
  return list.length ? list.join('、') : ''
}

export function reportHasPendingUnknownUsage(auditSummaryData) {
  if (!auditSummaryData) return false
  if (Number(auditSummaryData.hasUnknownUsage) === 1) return true
  if (parseDistinctUnknownUsageNames(auditSummaryData.unknownUsages).length > 0) return true
  return countMissingUsageFromSummary(auditSummaryData.unknownUsages) > 0
}

/** 汇总表多行 unknownUsages 合并为单份 Map JSON */
export function aggregateProjectUnknownUsagesJson(displayTableData = []) {
  const merged = {}
  for (const row of displayTableData) {
    const map = parsePendingUsageMap(row?.unknownUsages)
    for (const [room, usage] of Object.entries(map)) {
      merged[room] = usage
    }
  }
  return JSON.stringify(merged)
}

/** 按用途名记录首个来源 fileRecordId，供汇总页跳转审核 */
export function buildUsageNameFileRecordMap(displayTableData = []) {
  const map = new Map()
  for (const row of displayTableData) {
    const fileRecordId = row?.fileRecordId
    if (!fileRecordId) continue
    const usageMap = parsePendingUsageMap(row?.unknownUsages)
    for (const value of Object.values(usageMap)) {
      const name = String(value ?? '').trim()
      if (!name || name === MISSING_USAGE_LABEL || map.has(name)) continue
      map.set(name, fileRecordId)
    }
  }
  return map
}

export function projectHasPendingUnknownUsageRows(displayTableData = []) {
  const rows = Array.isArray(displayTableData) ? displayTableData : []
  if (rows.some((row) => Number(row?.hasUnknownUsage) === 1)) return true
  const json = aggregateProjectUnknownUsagesJson(rows)
  if (parseDistinctUnknownUsageNames(json).length > 0) return true
  return countMissingUsageFromSummary(json) > 0
}

/** 将报告内未知用途与项目 API 记录合并为策略列表行（汇总表 / 审核页共用） */
export function mergeUnknownUsagePolicyRows(unknownUsagesJson, apiRows = [], options = {}) {
  const fileRecordIdByUsage = options.fileRecordIdByUsage instanceof Map ? options.fileRecordIdByUsage : null
  const occurrenceMap = countUnknownUsageOccurrences(unknownUsagesJson)
  const roomsByUsageName = groupRoomNumbersByUsageName(unknownUsagesJson)
  const nameSet = new Set(parseDistinctUnknownUsageNames(unknownUsagesJson))

  const attachRoomNumbers = (row, usageKey) => {
    row.roomNumbers = roomsByUsageName.get(usageKey) || []
    return row
  }

  const byName = new Map(
    (apiRows || []).map((item) => {
      const name = String(item.usageName || '').trim()
      return [name, attachRoomNumbers({ ...item, selectedTarget: '' }, name)]
    })
  )

  for (const name of nameSet) {
    if (!byName.has(name)) {
      byName.set(
        name,
        attachRoomNumbers(
          {
            id: null,
            usageName: name,
            occurrenceCount: occurrenceMap.get(name) || 0,
            selectedTarget: ''
          },
          name
        )
      )
    } else {
      const row = byName.get(name)
      row.occurrenceCount = occurrenceMap.get(name) || row.occurrenceCount || 0
      attachRoomNumbers(row, name)
    }
  }

  const missingRooms = roomsByUsageName.get(MISSING_USAGE_LABEL) || []
  if (missingRooms.length && !byName.has(MISSING_USAGE_LABEL)) {
    byName.set(MISSING_USAGE_LABEL, {
      id: null,
      usageName: '用途缺失',
      usageKey: MISSING_USAGE_LABEL,
      occurrenceCount: missingRooms.length,
      roomNumbers: missingRooms,
      selectedTarget: '',
      readOnly: true
    })
  }

  if (fileRecordIdByUsage) {
    for (const row of byName.values()) {
      if (row.fileRecordId) continue
      const fileRecordId = fileRecordIdByUsage.get(String(row.usageName || '').trim())
      if (fileRecordId) row.fileRecordId = fileRecordId
    }
  }

  return [...byName.values()]
}
