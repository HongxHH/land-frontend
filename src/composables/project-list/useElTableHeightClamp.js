/** Element Plus 表头 + 行高经验值（与 project-tab-el-table 的 padding 15px/16px 对齐） */
const EL_TABLE_HEADER_H = 74
const EL_TABLE_ROW_H = 56
const EL_TABLE_EMPTY_MIN = 120

/** 合同列表、规划复核主表、项目方汇总主表等「主表」统一默认可视数据行数（多出行表内滚动） */
const MAIN_LIST_TABLE_VISIBLE_ROWS = 5

/** 主表「自然高度」额外余量（px），抵消 EP 边框/固定列与经验值的偏差 */
const MAIN_LIST_TABLE_NATURAL_SLACK_PX = 20

function mainListTableMaxHeightPx(visibleRows = MAIN_LIST_TABLE_VISIBLE_ROWS) {
  return EL_TABLE_HEADER_H + visibleRows * EL_TABLE_ROW_H + 4
}

/**
 * 合同/规划/项目方主表专用：在 mainListTableMaxHeightPx 上限内按行数取高，并带 MAIN_LIST_TABLE_NATURAL_SLACK_PX。
 */
export function clampMainListTableHeight(rowCount) {
  const cap = mainListTableMaxHeightPx()
  if (!cap || cap < 40) return 200
  if (rowCount <= 0) return Math.min(cap, EL_TABLE_EMPTY_MIN)
  const natural =
    EL_TABLE_HEADER_H + rowCount * EL_TABLE_ROW_H + 4 + MAIN_LIST_TABLE_NATURAL_SLACK_PX
  return Math.min(cap, natural)
}

/**
 * @param {number} capPx 表格外层可用高度（像素）
 * @param {number} rowCount 数据行数
 */
export function clampTableBodyHeight(capPx, rowCount) {
  if (!capPx || capPx < 40) return 200
  if (rowCount <= 0) return Math.min(capPx, EL_TABLE_EMPTY_MIN)
  const natural = EL_TABLE_HEADER_H + rowCount * EL_TABLE_ROW_H + 4
  return Math.min(capPx, natural)
}
