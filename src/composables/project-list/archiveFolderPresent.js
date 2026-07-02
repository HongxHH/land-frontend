/** 归档 Tab：筛选选项、格式化与表格展示辅助 */

import { getFileStateTagType } from '@/utils/fileStatePresent.js'

export const ARCHIVE_VERIFY_STATUS_OPTIONS = [
  { label: '已通过', value: 'PASSED' },
  { label: '未通过', value: 'FAILED' },
  { label: '未校验', value: 'UNVERIFIED' }
]

export const ARCHIVE_FILE_STATE_OPTIONS = [
  { label: '后处理中', value: 'WAITING_POST_PROCESS' },
  { label: '上传中', value: 'UPLOADING' },
  { label: '待解析', value: 'WAITING_PARSE' },
  { label: '排队中', value: 'PENDING' },
  { label: '解析中', value: 'PARSING' },
  { label: '解析失败', value: 'PARSE_FAIL' },
  { label: '解析完成', value: 'PARSE_COMPLETE' },
  { label: '不可解析', value: 'UNPARSEABLE' },
  { label: '审核中', value: 'AUDITING' },
  { label: '审核通过', value: 'AUDIT_PASS' },
  { label: '审核失败', value: 'AUDIT_FAIL' }
]

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
  const value = row?.isVerified
  return value === 0 || value === '0' || value === false
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

/** 当前页内将校验未通过的文件排在前面，组内保持接口返回顺序 */
export function sortArchiveFilesVerifyFailedFirst(records) {
  if (!Array.isArray(records) || records.length < 2) return records ?? []
  if (!records.some(isArchiveVerifyFailed)) return records
  const failed = []
  const rest = []
  for (const row of records) {
    if (isArchiveVerifyFailed(row)) failed.push(row)
    else rest.push(row)
  }
  return [...failed, ...rest]
}

export function archiveFileTableRowClassName({ row }) {
  return isArchiveVerifyFailed(row) ? 'archive-file-row--verify-failed' : ''
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
