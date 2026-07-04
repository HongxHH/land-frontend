/** 文件处理状态：列表展示文案、标签类型与轮询判定 */

import { isAutoParseFileContext } from '@/utils/autoParseContext.js'

export const FILE_STATE_LABELS = {
  UPLOADING: '上传中',
  WAITING_POST_PROCESS: '后处理中',
  WAITING_PARSE: '待解析',
  PENDING: '排队中',
  PARSING: '解析中',
  UPLOAD_FAIL: '上传失败',
  PARSE_FAIL: '解析失败',
  PARSE_COMPLETE: '解析完成',
  UNPARSEABLE: '不可解析',
  AUDITING: '审核中',
  AUDIT_PASS: '审核通过',
  AUDIT_FAIL: '审核失败'
}

/**
 * 与后端 FileStateEnum 完全一致（筛选、查询参数用）。
 * 列表行展示仍可用 getFileStateLabel 做 WAITING_PARSE 细分文案。
 */
export const BACKEND_FILE_STATE_CODES = [
  'UPLOADING',
  'WAITING_POST_PROCESS',
  'WAITING_PARSE',
  'PENDING',
  'PARSING',
  'UPLOAD_FAIL',
  'PARSE_FAIL',
  'PARSE_COMPLETE',
  'UNPARSEABLE',
  'AUDITING',
  'AUDIT_PASS',
  'AUDIT_FAIL'
]

/** 筛选下拉文案（固定枚举含义，不做自动解析上下文细分） */
const FILE_STATE_FILTER_LABELS = {
  WAITING_POST_PROCESS: '后处理中',
  WAITING_PARSE: '等待解析',
  PENDING: '解析排队中',
  UNPARSEABLE: '不可解析',
  AUDITING: '待审核',
  AUDIT_FAIL: '审核不通过'
}

export const FILE_STATE_FILTER_OPTIONS = BACKEND_FILE_STATE_CODES.map((value) => ({
  value,
  label: FILE_STATE_FILTER_LABELS[value] ?? FILE_STATE_LABELS[value] ?? value
}))

/** @typedef {{ fileContextType?: string, autoParseQueuedAt?: string|null }} FileStateLabelContext */

function resolveWaitingParseLabel(context) {
  if (!isAutoParseFileContext(context?.fileContextType)) {
    return FILE_STATE_LABELS.WAITING_PARSE
  }
  if (context?.autoParseQueuedAt) {
    return '自动解析排队中'
  }
  return '等待自动解析'
}

/** 上传后处理、解析排队/进行中：需要轮询刷新 */
export const ACTIVE_FILE_PROCESS_STATES = [
  'UPLOADING',
  'WAITING_POST_PROCESS',
  'WAITING_PARSE',
  'PENDING',
  'PARSING'
]

/**
 * @param {string} state
 * @param {FileStateLabelContext} [context]
 */
export function getFileStateLabel(state, context) {
  if (state === 'WAITING_PARSE') {
    return resolveWaitingParseLabel(context)
  }
  return FILE_STATE_LABELS[state] || state || '-'
}

/**
 * @param {{ fileState?: string, status?: string, fileContextType?: string }} row
 */
export function getParseButtonText(row) {
  const state = row?.fileState ?? row?.status
  if (state === 'PARSE_FAIL') return '重试解析'
  if (state === 'PARSE_COMPLETE') return '重新解析'
  if (state === 'WAITING_PARSE' && isAutoParseFileContext(row?.fileContextType)) {
    return '提前解析'
  }
  return '开始解析'
}

export function getFileStateTagType(state) {
  if (state === 'PARSE_COMPLETE' || state === 'AUDIT_PASS') return 'success'
  if (state === 'PARSE_FAIL' || state === 'AUDIT_FAIL' || state === 'UNPARSEABLE') return 'danger'
  if (state === 'PARSING' || state === 'AUDITING') return 'warning'
  if (state === 'WAITING_POST_PROCESS' || state === 'UPLOADING') return 'info'
  if (state === 'WAITING_PARSE' || state === 'PENDING') return ''
  return 'info'
}

export function getFileStateDotColor(state) {
  if (state === 'PARSE_FAIL' || state === 'AUDIT_FAIL') return '#F56C6C'
  if (state === 'PARSE_COMPLETE' || state === 'AUDIT_PASS') return '#67C23A'
  if (state === 'PARSING' || state === 'AUDITING') return '#E6A23C'
  if (state === 'WAITING_POST_PROCESS' || state === 'UPLOADING') return '#909399'
  if (state === 'WAITING_PARSE' || state === 'PENDING') return '#409EFF'
  if (state === 'UNPARSEABLE') return '#E6A23C'
  return '#909399'
}

export function isActiveFileProcessState(state) {
  return ACTIVE_FILE_PROCESS_STATES.includes(state)
}

/** @param {{ isVerified?: number|string|boolean }} row */
export function isFileVerifyFailed(row) {
  const value = row?.isVerified
  return value === 0 || value === '0' || value === false
}

/** @param {{ fileState?: string, status?: string }} row */
export function isFileParseFailed(row) {
  const state = row?.fileState ?? row?.status
  return state === 'PARSE_FAIL'
}

/** 解析失败或校验未通过：列表优先展示 */
export function isFileAttentionFirst(row) {
  return isFileParseFailed(row) || isFileVerifyFailed(row)
}

/** 当前页内将解析失败或校验未通过的文件排在前面，组内保持接口返回顺序 */
export function sortFilesAttentionFirst(records) {
  if (!Array.isArray(records) || records.length < 2) return records ?? []
  if (!records.some(isFileAttentionFirst)) return records
  const priority = []
  const rest = []
  for (const row of records) {
    if (isFileAttentionFirst(row)) priority.push(row)
    else rest.push(row)
  }
  return [...priority, ...rest]
}

export function mapFileContextTypeToTableType(fileContextType) {
  if (fileContextType === 'CONTRACT') return 'contract'
  if (fileContextType === 'SURVEY_REPORT') return 'survey'
  return 'survey'
}

const PLACEHOLDER_THUMB = 'https://placehold.co/150/e0e0e0/808080?text=NoThumb'

export function formatUploadTimeForDisplay(timeStr) {
  if (!timeStr) return '刚刚'
  return String(timeStr).replace('T', ' ').split('.')[0]
}

export function buildOptimisticUploadTableRow({
  fileId,
  fileName,
  fileContextType,
  phase = null,
  fileState = 'WAITING_POST_PROCESS'
}) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const uploadTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  return {
    id: fileId,
    rawId: fileId,
    fileId: null,
    preprocessGridfsId: '',
    name: fileName || '未命名文件',
    uploadTime,
    type: mapFileContextTypeToTableType(fileContextType),
    phase,
    fileContextType: fileContextType || null,
    autoParseQueuedAt: null,
    status: fileState,
    errorMessage: null,
    thumbnailUrl: PLACEHOLDER_THUMB,
    _optimistic: true
  }
}

export function buildOptimisticArchiveFileRow({
  fileId,
  fileName,
  fileContextType,
  uploadUserName = '—',
  fileState = 'WAITING_POST_PROCESS'
}) {
  return {
    id: Number(fileId) || fileId,
    originalName: fileName || '未命名文件',
    fileContextType,
    fileState,
    autoParseQueuedAt: null,
    uploadTime: new Date().toISOString(),
    uploadUserName,
    _optimistic: true
  }
}
