import { canAccessOperationAudit } from '@/utils/auth-session.js'

/**
 * 文件内容类型（FileContextType）前端统一注册表。
 * 新增后端类型时在此补充，避免上传归类/审核跳转/标签页遗漏。
 */

/** @typedef {'contract'|'calibration'|'planning_review'|'capacity_indicator'|'party_summary'|null} AuditStrategy */

/** 上传弹窗可识别的归档 kind（与后端 FileContextType 一致） */
export const UPLOAD_FILE_CONTEXT_KINDS = new Set([
  'CONTRACT',
  'SURVEY_REPORT',
  'PLANNING_REVIEW',
  'CAPACITY_INDICATOR',
  'PROJECT_PARTY_SURVEY_SUMMARY',
  'OTHER',
])

/** 上传弹窗 / 列表展示用中文名 */
export const FILE_CONTEXT_TYPE_LABELS = {
  CONTRACT: '合同文件',
  SURVEY_REPORT: '实测报告',
  PLANNING_REVIEW: '规划复核文件',
  CAPACITY_INDICATOR: '容量指标核查表',
  PROJECT_PARTY_SURVEY_SUMMARY: '项目方实测汇总表',
  OTHER: '其他文件',
}

/** 归档「审核」按钮路由策略 */
export const FILE_CONTEXT_AUDIT_STRATEGY = {
  CONTRACT: 'contract',
  SURVEY_REPORT: 'calibration',
  PLANNING_REVIEW: 'planning_review',
  CAPACITY_INDICATOR: 'capacity_indicator',
  PROJECT_PARTY_SURVEY_SUMMARY: 'party_summary',
  OTHER: 'calibration',
}

export function normalizeFileContextType(value) {
  return String(value || '').toUpperCase()
}

export function resolveUploadFileContextType(kind) {
  const normalized = normalizeFileContextType(kind)
  return UPLOAD_FILE_CONTEXT_KINDS.has(normalized) ? normalized : 'OTHER'
}

export function getFileContextLabel(fileContextType) {
  const key = normalizeFileContextType(fileContextType)
  return FILE_CONTEXT_TYPE_LABELS[key] || key || '—'
}

/** @returns {AuditStrategy} */
export function getAuditStrategy(fileContextType) {
  const key = normalizeFileContextType(fileContextType)
  return FILE_CONTEXT_AUDIT_STRATEGY[key] ?? 'calibration'
}

/** 项目工作区 el-tab-pane name 白名单（路由 tab / 审核返回跳转） */
export const PROJECT_WORKSPACE_TAB_NAMES = [
  'summary',
  'contractLandEdit',
  'projectEdit',
  'archives',
  'planningReview',
  'capacityIndicator',
  'projectPartySummary',
  'operationAudit',
]

export function isProjectWorkspaceTab(tabName) {
  return PROJECT_WORKSPACE_TAB_NAMES.includes(String(tabName || ''))
}

/** 路由 / 审核返回跳转：校验 tab 合法且当前用户有权访问 */
export function resolveProjectWorkspaceTab(tabName) {
  const name = String(tabName || '')
  if (!isProjectWorkspaceTab(name)) return 'archives'
  if (name === 'operationAudit' && !canAccessOperationAudit()) return 'archives'
  return name
}
