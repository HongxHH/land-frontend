/** 与后端 SurveyReportUsageLabels.MISSING_USAGE_LABEL 保持一致 */
export const MISSING_USAGE_LABEL = '（用途缺失）'

/** 汇总/审核 policy 行展示名 */
export const MISSING_USAGE_ROW_LABEL = '用途缺失'

/** 打开审核后自动筛选用途缺失户室 */
export const FOCUS_MODE_MISSING_USAGE = 'missing-usage'

/** 户室表筛选用途缺失 preset */
export const FILTER_PRESET_MISSING_USAGE = 'missing-usage'

export function isMissingUsagePolicyRow(rule) {
  if (!rule) return false
  if (String(rule.usageKey || '').trim() === MISSING_USAGE_LABEL) return true
  return String(rule.usageName || '').trim() === MISSING_USAGE_ROW_LABEL
}

export function isBlankRoomUsage(roomUsage) {
  const text = String(roomUsage ?? '').trim()
  return !text || text === '-'
}

export function parsePendingUsageMap(unknownUsagesJson) {
  if (!unknownUsagesJson) return {}
  try {
    const raw =
      typeof unknownUsagesJson === 'string' ? JSON.parse(unknownUsagesJson) : unknownUsagesJson
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    return raw
  } catch {
    return {}
  }
}

export function countMissingUsageFromSummary(unknownUsagesJson) {
  const map = parsePendingUsageMap(unknownUsagesJson)
  return Object.values(map).filter((value) => String(value ?? '').trim() === MISSING_USAGE_LABEL)
    .length
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
    const label =
      String(usage ?? '').trim() === MISSING_USAGE_LABEL ? '用途缺失' : String(usage ?? '').trim()
    return `${room}：${label}`
  })
  return lines.length ? lines.join('\n') : formatPendingUsageDisplay(raw)
}

/** 从汇总 unknownUsages（Map 或历史数组）提取去重后的未知用途名，不含「用途缺失」占位 */
export function parseDistinctUnknownUsageNames(unknownUsagesJson) {
  if (!unknownUsagesJson) return []
  try {
    const raw =
      typeof unknownUsagesJson === 'string' ? JSON.parse(unknownUsagesJson) : unknownUsagesJson
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

/** 户号列表摘要：前 max 个 + 「…等 N 户」 */
export function formatRoomNumbersPreview(roomNumbers = [], max = 8) {
  const list = (roomNumbers || []).map((item) => String(item ?? '').trim()).filter(Boolean)
  if (!list.length) return ''
  if (list.length <= max) return list.join('、')
  return `${list.slice(0, max).join('、')}…等 ${list.length} 户`
}

/** 用途缺失 policy 行 meta 文案 */
export function formatMissingUsageMetaText(rule) {
  const count = Number(rule?.occurrenceCount ?? rule?.roomNumbers?.length ?? 0)
  const groups = Array.isArray(rule?.sourceGroups) ? rule.sourceGroups : []
  const rooms = rule?.roomNumbers || []

  if (groups.length > 1) {
    return `涉及 ${groups.length} 份报告`
  }
  if (groups.length === 1) {
    const fileName = String(groups[0]?.fileName || '').trim()
    return fileName || `文件记录 #${groups[0]?.fileRecordId || ''}`
  }
  const fileName = String(rule?.recentFileName || '').trim()
  if (fileName) return fileName
  const preview = formatRoomNumbersPreview(rooms)
  return preview || ''
}

/** 审核页：当前报告用途缺失来源（单文件） */
export function buildMissingUsageSourceGroupForAudit(
  fileRecordId,
  fileName,
  unknownUsagesJson
) {
  const fid = String(fileRecordId || '').trim()
  if (!fid) return []
  const rooms = groupRoomNumbersByUsageName(unknownUsagesJson).get(MISSING_USAGE_LABEL) || []
  if (!rooms.length) return []
  return [
    {
      fileRecordId: fid,
      fileName: String(fileName || '').trim() || `文件记录 #${fid}`,
      roomNumbers: rooms,
      occurrenceCount: rooms.length,
    },
  ]
}

/** 按来源报告分组统计用途缺失户室（汇总页跳转用） */
export function buildMissingUsageGroupsByFile(displayTableData = []) {
  const groupByFile = new Map()

  for (const row of displayTableData) {
    const fileRecordId = String(row?.fileRecordId || '').trim()
    if (!fileRecordId) continue

    const usageMap = parsePendingUsageMap(row?.unknownUsages)
    const missingRooms = []
    for (const [room, usage] of Object.entries(usageMap)) {
      if (String(usage ?? '').trim() !== MISSING_USAGE_LABEL) continue
      const roomLabel = String(room ?? '').trim()
      if (roomLabel) missingRooms.push(roomLabel)
    }
    if (!missingRooms.length) continue

    if (!groupByFile.has(fileRecordId)) {
      groupByFile.set(fileRecordId, {
        fileRecordId,
        fileName:
          String(row?.fileOriginalName || '').trim() ||
          String(row?.projectName || '').trim() ||
          `文件记录 #${fileRecordId}`,
        buildingName: String(row?.projectName || '').trim(),
        roomNumbers: [],
        occurrenceCount: 0,
      })
    }

    const group = groupByFile.get(fileRecordId)
    for (const room of missingRooms) {
      if (!group.roomNumbers.includes(room)) {
        group.roomNumbers.push(room)
      }
    }
    group.roomNumbers.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    group.occurrenceCount = group.roomNumbers.length
  }

  return [...groupByFile.values()].sort((a, b) => b.occurrenceCount - a.occurrenceCount)
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
  const fileRecordIdByUsage =
    options.fileRecordIdByUsage instanceof Map ? options.fileRecordIdByUsage : null
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
            selectedTarget: '',
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
  const missingSourceGroups = Array.isArray(options.missingUsageSourceGroups)
    ? options.missingUsageSourceGroups
    : []
  if (missingRooms.length && !byName.has(MISSING_USAGE_LABEL)) {
    const singleGroup = missingSourceGroups.length === 1 ? missingSourceGroups[0] : null
    byName.set(MISSING_USAGE_LABEL, {
      id: null,
      usageName: MISSING_USAGE_ROW_LABEL,
      usageKey: MISSING_USAGE_LABEL,
      occurrenceCount: missingRooms.length,
      roomNumbers: missingRooms,
      sourceGroups: missingSourceGroups,
      fileRecordId: singleGroup?.fileRecordId || '',
      recentFileName: singleGroup?.fileName || '',
      selectedTarget: '',
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
