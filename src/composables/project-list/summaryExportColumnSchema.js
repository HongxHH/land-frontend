/**
 * 房产实测汇总表：打印 / 导出共用列定义
 * 计容、不计容类列在打印/导出中使用双层表头（首行：计容｜不计容，次行：商业(办公)面积、住宅面积…）
 */

export const SUMMARY_LAYOUT_STORAGE_KEY = 'land.summary.printExportLayout.v1'

/** @typedef {'index' | 'text' | 'area'} SummaryCellKind */

/** @type {Array<{ id: string, prop: string | null, subLabel: string, headerGroup: 'calc' | 'nonCalc' | null, groupLabel?: string, kind: SummaryCellKind }>} */
export const SUMMARY_COLUMN_SCHEMA = [
  { id: 'index', prop: null, subLabel: '序号', headerGroup: null, kind: 'index' },
  { id: 'projectName', prop: 'projectName', subLabel: '工程名称', headerGroup: null, kind: 'text' },
  { id: 'certNo', prop: 'certNo', subLabel: '不动产权证编号', headerGroup: null, kind: 'text' },
  { id: 'contractNo', prop: 'contractNo', subLabel: '合同/批文编号', headerGroup: null, kind: 'text' },
  { id: 'phase', prop: 'phase', subLabel: '期数', headerGroup: null, kind: 'text' },
  { id: 'totalArea', prop: 'totalArea', subLabel: '实测报告总建筑面积', headerGroup: null, kind: 'area' },
  {
    id: 'calcCommercial',
    prop: 'calcCommercial',
    subLabel: '商业(办公)面积',
    headerGroup: 'calc',
    groupLabel: '计容',
    kind: 'area'
  },
  {
    id: 'calcResidential',
    prop: 'calcResidential',
    subLabel: '住宅面积',
    headerGroup: 'calc',
    groupLabel: '计容',
    kind: 'area'
  },
  {
    id: 'calcPropMgmt',
    prop: 'calcPropMgmt',
    subLabel: '物管用房',
    headerGroup: 'calc',
    groupLabel: '计容',
    kind: 'area'
  },
  {
    id: 'calcOther',
    prop: 'calcOther',
    subLabel: '其他计容',
    headerGroup: 'calc',
    groupLabel: '计容',
    kind: 'area'
  },
  {
    id: 'nonCalcCommunity',
    prop: 'nonCalcCommunity',
    subLabel: '社区用房面积',
    headerGroup: 'nonCalc',
    groupLabel: '不计容',
    kind: 'area'
  },
  {
    id: 'nonCalcOther',
    prop: 'nonCalcOther',
    subLabel: '其他公用面积',
    headerGroup: 'nonCalc',
    groupLabel: '不计容',
    kind: 'area'
  },
  {
    id: 'areaConfirmationNoticeNo',
    prop: 'areaConfirmationNoticeNo',
    subLabel: '房产面积确认告知书编号',
    headerGroup: null,
    kind: 'text'
  },
  { id: 'reportNo', prop: 'reportNo', subLabel: '房地产勘测报告书编号', headerGroup: null, kind: 'text' },
  { id: 'remarks', prop: 'remarks', subLabel: '备注', headerGroup: null, kind: 'text' }
]

const schemaById = Object.fromEntries(SUMMARY_COLUMN_SCHEMA.map((c) => [c.id, c]))

export function getSummaryColumnDef(id) {
  return schemaById[id]
}

/** 设置弹窗「列名」列展示（与双层表头语义一致） */
export function getColumnConfigLabel(col) {
  if (!col.headerGroup) return col.subLabel
  return `${col.groupLabel} / ${col.subLabel}`
}

/**
 * 将可见列切成连续段：普通列单格 rowspan=2；分组列一段共用首行父标题
 * @returns {{ topCells: Array<{ text: string, rowspan: number, colspan: number }>, bottomCells: Array<{ text: string }> }}
 */
export function buildTwoRowHeaderModel(visibleDefs) {
  const segments = buildHeaderSegments(visibleDefs)
  const topCells = []
  const bottomCells = []
  for (const seg of segments) {
    if (seg.type === 'leaf') {
      topCells.push({ text: seg.col.subLabel, rowspan: 2, colspan: 1 })
    } else {
      const parentTitle = seg.cols[0]?.groupLabel || ''
      topCells.push({ text: parentTitle, rowspan: 1, colspan: seg.cols.length })
      for (const c of seg.cols) {
        bottomCells.push({ text: c.subLabel })
      }
    }
  }
  return { topCells, bottomCells }
}

/**
 * Excel 前两行表头（0-based 列索引由 defs 顺序决定）
 * @returns {{ rowTop: string[], rowBot: string[], merges: Array<{ t: number, l: number, b: number, r: number }> }}
 * merges 为 1-based 行列，与 Excel 一致
 */
export function buildExcelHeaderPlan(defs) {
  const segments = buildHeaderSegments(defs)
  const n = defs.length
  const rowTop = Array(n).fill('')
  const rowBot = Array(n).fill('')
  const merges = []
  let c = 0
  for (const seg of segments) {
    if (seg.type === 'leaf') {
      rowTop[c] = seg.col.subLabel
      merges.push({ t: 1, l: c + 1, b: 2, r: c + 1 })
      c += 1
      continue
    }
    const span = seg.cols.length
    rowTop[c] = seg.cols[0]?.groupLabel || ''
    for (let k = 1; k < span; k++) {
      rowTop[c + k] = ''
    }
    for (let k = 0; k < span; k++) {
      rowBot[c + k] = seg.cols[k].subLabel
    }
    if (span > 1) {
      merges.push({ t: 1, l: c + 1, b: 1, r: c + span })
    }
    c += span
  }
  return { rowTop, rowBot, merges }
}

/** @param {typeof SUMMARY_COLUMN_SCHEMA} visibleDefs */
function buildHeaderSegments(visibleDefs) {
  const segments = []
  let i = 0
  while (i < visibleDefs.length) {
    const col = visibleDefs[i]
    if (!col.headerGroup) {
      segments.push({ type: 'leaf', col })
      i += 1
      continue
    }
    const g = col.headerGroup
    let j = i
    while (j < visibleDefs.length && visibleDefs[j].headerGroup === g) {
      j += 1
    }
    segments.push({ type: 'group', group: g, cols: visibleDefs.slice(i, j) })
    i = j
  }
  return segments
}

/**
 * 面积类单元格展示：按两位小数规则，恰好为 0 时显示 "0"（不显示 0.00）；无效返回 invalid（主表 ''、对比表 '-'）
 * @param {unknown} value
 * @param {string} invalid
 */
export function formatAreaDigits(value, invalid = '') {
  const n = Number(value)
  if (!Number.isFinite(n)) return invalid
  const fixed = n.toFixed(2)
  if (Number(fixed) === 0) return '0'
  return fixed
}

export function formatSummaryCellValue(col, row, rowIndex) {
  if (col.kind === 'index') return String(rowIndex + 1)
  const v = col.prop ? row?.[col.prop] : ''
  if (col.kind === 'text') return v === null || v === undefined ? '' : String(v)
  if (col.kind === 'area') {
    return formatAreaDigits(v, '')
  }
  return ''
}

/** 默认布局：打印/导出可用列全部显示（不含仅页面展示的列） */
export function getDefaultSummaryLayoutRows() {
  return SUMMARY_COLUMN_SCHEMA.map((c) => ({ id: c.id, visible: true }))
}

/**
 * @param {Array<{ id: string, visible: boolean }>} rows
 * @returns {typeof SUMMARY_COLUMN_SCHEMA}
 */
export function resolveVisibleColumnDefs(rows) {
  const ordered = []
  for (const r of rows) {
    const def = schemaById[r.id]
    if (def && r.visible) ordered.push(def)
  }
  return ordered
}
