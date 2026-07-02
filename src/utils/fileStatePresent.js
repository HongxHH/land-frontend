/** 文件处理状态：列表展示文案、标签类型与轮询判定 */

export const FILE_STATE_LABELS = {
  UPLOADING: '上传中',
  WAITING_POST_PROCESS: '后处理中',
  WAITING_PARSE: '待解析',
  PENDING: '排队中',
  PARSING: '解析中',
  PARSE_FAIL: '解析失败',
  PARSE_COMPLETE: '解析完成',
  UNPARSEABLE: '不可解析',
  AUDITING: '审核中',
  AUDIT_PASS: '审核通过',
  AUDIT_FAIL: '审核失败'
}

/** 上传后处理、解析排队/进行中：需要轮询刷新 */
export const ACTIVE_FILE_PROCESS_STATES = [
  'UPLOADING',
  'WAITING_POST_PROCESS',
  'WAITING_PARSE',
  'PENDING',
  'PARSING'
]

export function getFileStateLabel(state) {
  return FILE_STATE_LABELS[state] || state || '-'
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
    uploadTime: new Date().toISOString(),
    uploadUserName,
    _optimistic: true
  }
}
