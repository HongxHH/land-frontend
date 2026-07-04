/** 归档 Tab：筛选选项、格式化与表格展示辅助 */

import {
  FILE_STATE_FILTER_OPTIONS,
  getFileStateTagType,
  isFileAttentionFirst,
  isFileParseFailed,
  isFileVerifyFailed,
  sortFilesAttentionFirst
} from '@/utils/fileStatePresent.js'

export const ARCHIVE_VERIFY_STATUS_OPTIONS = [
  { label: '已通过', value: 'PASSED' },
  { label: '未通过', value: 'FAILED' },
  { label: '未校验', value: 'UNVERIFIED' }
]

/** 与后端 FileStateEnum 对齐的文件状态筛选项 */
export const ARCHIVE_FILE_STATE_OPTIONS = FILE_STATE_FILTER_OPTIONS

export function formatArchiveFileSize(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '-'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function formatArchiveDateTime(value) {
  if (!value) return '-'
  const text = String(value)
  return text.includes('T') ? text.replace('T', ' ').slice(0, 19) : text
}

export function getArchiveStateTagType(state) {
  return getFileStateTagType(state)
}

export function isArchiveVerifyFailed(row) {
  return isFileVerifyFailed(row)
}

export function getArchiveVerifyStatus(row) {
  const value = row?.isVerified
  if (value === 1 || value === '1' || value === true) {
    return { label: '已通过', type: 'success' }
  }
  if (isArchiveVerifyFailed(row)) {
    return { label: '未通过', type: 'danger' }
  }
  return { label: '未校验', type: 'info' }
}

/** @deprecated 使用 sortFilesAttentionFirst；保留别名兼容旧引用 */
export const sortArchiveFilesVerifyFailedFirst = sortFilesAttentionFirst

export function archiveFileTableRowClassName({ row }) {
  if (isFileAttentionFirst(row)) {
    return isFileParseFailed(row) ? 'archive-file-row--parse-failed' : 'archive-file-row--verify-failed'
  }
  return ''
}

function shouldSkipArchiveThumbnail(row) {
  const contextType = String(row?.fileContextType || '').toUpperCase()
  if (contextType === 'PROJECT_PARTY_SURVEY_SUMMARY') return true
  const fileType = String(row?.fileType || '').toUpperCase()
  return fileType === 'XLS' || fileType === 'XLSX'
}

export function getArchiveThumbnailUrl(row) {
  if (shouldSkipArchiveThumbnail(row)) return ''
  if (row?.thumbGridfsId) return `/api/file/download/gridfs/${row.thumbGridfsId}`
  return ''
}

export function getArchiveThumbnailPreviewList(row) {
  const src = getArchiveThumbnailUrl(row)
  return src ? [src] : []
}

export function archiveUploadFileDisplayName(item) {
  return String(item?.raw?.name ?? item?.name ?? '未命名文件')
}

export function archiveUploadFileSize(item) {
  const raw = item?.raw ?? item
  return Number(raw?.size ?? item?.size ?? 0)
}
