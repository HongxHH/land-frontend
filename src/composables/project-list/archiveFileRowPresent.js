/** 归档文件列表：状态文案与行内操作按钮可见性 */

import {
  FILE_STATE_LABELS,
  getFileStateLabel as getSharedFileStateLabel
} from '@/utils/fileStatePresent.js'

export const ARCHIVE_FILE_STATE_LABELS = FILE_STATE_LABELS

export const PARSE_SCENE_TO_STATE = {
  PARSE_PENDING: 'PENDING',
  PARSE_START: 'PARSING',
  PARSE_SUCCESS: 'PARSE_COMPLETE',
  PARSE_FAILED: 'PARSE_FAIL',
  PARSE_FAIL: 'PARSE_FAIL'
}

export function getArchiveFileStateLabel(state) {
  return getSharedFileStateLabel(state)
}

export function showArchiveParseButton(row) {
  return ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row?.fileState)
}

export function showArchiveCancelParseButton(row) {
  return ['PENDING', 'PARSING'].includes(row?.fileState)
}

export function showArchiveAuditButton(row, _selectedArchiveKind = '') {
  return ['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL', 'AUDIT_PASS'].includes(row?.fileState)
}

export function archiveParseButtonText(row) {
  if (row?.fileState === 'PARSE_FAIL') return '重试解析'
  if (row?.fileState === 'PARSE_COMPLETE') return '重新解析'
  return '开始解析'
}

/** 上传、解析排队/进行中、审核中等过程态不可删除 */
export const ARCHIVE_FILE_NON_DELETABLE_STATES = [
  'UPLOADING',
  'WAITING_POST_PROCESS',
  'PENDING',
  'PARSING',
  'AUDITING'
]

export function canDeleteArchiveFile(row) {
  const state = row?.fileState
  if (!state) return false
  return !ARCHIVE_FILE_NON_DELETABLE_STATES.includes(state)
}

export function getArchiveFileDeleteDisabledReason(row) {
  const state = row?.fileState
  if (!state) return '缺少文件状态，暂不可删除'
  if (!ARCHIVE_FILE_NON_DELETABLE_STATES.includes(state)) return ''
  const label = getArchiveFileStateLabel(state)
  return `文件${label}，请稍后再删除`
}
