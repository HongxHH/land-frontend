/** 归档文件列表：状态文案与行内操作按钮可见性 */

import {
  FILE_STATE_LABELS,
  getFileStateLabel as getSharedFileStateLabel,
  getParseButtonText as getSharedParseButtonText,
} from '@/utils/fileStatePresent.js'

export const ARCHIVE_FILE_STATE_LABELS = FILE_STATE_LABELS

export const PARSE_SCENE_TO_STATE = {
  PARSE_PENDING: 'PENDING',
  PARSE_START: 'PARSING',
  PARSE_SUCCESS: 'PARSE_COMPLETE',
  PARSE_FAILED: 'PARSE_FAIL',
  PARSE_FAIL: 'PARSE_FAIL',
}

export function getArchiveFileStateLabel(state, row) {
  const context = row
    ? { fileContextType: row.fileContextType, autoParseSuppressed: row.autoParseSuppressed }
    : undefined
  return getSharedFileStateLabel(state, context)
}

export function showArchiveParseButton(row) {
  return ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row?.fileState)
}

export function showArchiveCancelParseButton(row) {
  return ['PENDING', 'PARSING'].includes(row?.fileState)
}

export function showArchiveAuditButton(row, _selectedArchiveKind = '') {
  return ['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL', 'AUDIT_PASS'].includes(
    row?.fileState
  )
}

export function archiveParseButtonText(row) {
  return getSharedParseButtonText(row)
}

/** 上传、后处理、审核中等过程态不可删除 */
export const ARCHIVE_FILE_NON_DELETABLE_STATES = ['UPLOADING', 'WAITING_POST_PROCESS', 'AUDITING']

export function canDeleteArchiveFile(row) {
  const state = row?.fileState
  if (!state) return false
  return !ARCHIVE_FILE_NON_DELETABLE_STATES.includes(state)
}

export function getArchiveFileDeleteDisabledReason(row) {
  const state = row?.fileState
  if (!state) return '缺少文件状态，暂不可删除'
  if (!ARCHIVE_FILE_NON_DELETABLE_STATES.includes(state)) return ''
  const label = getArchiveFileStateLabel(state, row)
  return `文件${label}，请稍后再删除`
}

function getArchiveParseSlotDisabledReason(row) {
  const state = row?.fileState
  if (!state) return '缺少文件状态，暂不可解析'
  if (state === 'UPLOADING' || state === 'WAITING_POST_PROCESS') {
    return `文件${getArchiveFileStateLabel(state, row)}，请稍后再试`
  }
  if (state === 'UNPARSEABLE') return '该文件不可自动解析'
  if (state === 'AUDITING') return '文件审核中，暂不可重新解析'
  if (state === 'AUDIT_FAIL') return '请先处理审核结果'
  if (state === 'AUDIT_PASS') return '审核已通过，暂不支持重新解析'
  return '当前状态不支持解析'
}

function getArchiveAuditSlotDisabledReason(row) {
  const state = row?.fileState
  if (!state) return '缺少文件状态，暂不可审核'
  if (state === 'UPLOADING' || state === 'WAITING_POST_PROCESS') {
    return `文件${getArchiveFileStateLabel(state, row)}，请稍后再试`
  }
  if (state === 'PARSE_FAIL') return '解析失败，请先重试解析'
  if (state === 'WAITING_PARSE' || state === 'PENDING' || state === 'PARSING') {
    return '请先完成解析'
  }
  return '请先完成解析'
}

/**
 * 归档列表操作列：固定三槽位（解析 / 审核 / 删除），不可用时不隐藏而 disabled + tooltip。
 * @returns {{ parse: ArchiveActionSlot, audit: ArchiveActionSlot, delete: ArchiveActionSlot }}
 */
export function resolveArchiveRowActions(row, selectedArchiveKind = '') {
  const state = row?.fileState

  /** @type {ArchiveActionSlot} */
  let parse
  if (showArchiveCancelParseButton(row)) {
    parse = {
      label: '取消解析',
      enabled: true,
      tooltip: '',
      action: 'cancel-parse',
      buttonType: 'warning',
      plain: true,
    }
  } else if (showArchiveParseButton(row)) {
    parse = {
      label: archiveParseButtonText(row),
      enabled: true,
      tooltip: '',
      action: 'parse',
      buttonType: 'primary',
      plain: false,
    }
  } else {
    parse = {
      label: '解析',
      enabled: false,
      tooltip: getArchiveParseSlotDisabledReason(row),
      action: 'none',
      buttonType: 'primary',
      plain: false,
    }
  }

  /** @type {ArchiveActionSlot} */
  let audit
  if (showArchiveAuditButton(row, selectedArchiveKind)) {
    audit = {
      label: state === 'AUDIT_PASS' ? '查看' : '审核',
      enabled: true,
      tooltip: '',
      action: 'audit',
      buttonType: 'primary',
      plain: true,
    }
  } else {
    audit = {
      label: '审核',
      enabled: false,
      tooltip: getArchiveAuditSlotDisabledReason(row),
      action: 'none',
      buttonType: 'info',
      plain: true,
    }
  }

  const deleteEnabled = canDeleteArchiveFile(row)
  /** @type {ArchiveActionSlot} */
  const deleteAction = {
    label: '删除',
    enabled: deleteEnabled,
    tooltip: deleteEnabled ? '' : getArchiveFileDeleteDisabledReason(row),
    action: 'delete',
    buttonType: 'danger',
    plain: true,
  }

  return { parse, audit, delete: deleteAction }
}

/**
 * @typedef {'parse'|'cancel-parse'|'audit'|'delete'|'none'} ArchiveRowActionKind
 * @typedef {{
 *   label: string
 *   enabled: boolean
 *   tooltip: string
 *   action: ArchiveRowActionKind
 *   buttonType: 'primary'|'warning'|'danger'|'info'
 *   plain: boolean
 * }} ArchiveActionSlot
 */
