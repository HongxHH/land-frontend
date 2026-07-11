import { getApiErrorMessage } from '@/utils/apiErrorMessage.js'

/** 与后端 spring.servlet.multipart.max-file-size 保持一致 */
export const MAX_SINGLE_FILE_UPLOAD_BYTES = 100 * 1024 * 1024
export const MAX_SINGLE_FILE_UPLOAD_LABEL = '100MB'

/** 与后端 spring.servlet.multipart.max-request-size 保持一致 */
export const MAX_BATCH_UPLOAD_BYTES = 1000 * 1024 * 1024
export const MAX_BATCH_UPLOAD_LABEL = '1000MB'
export const BATCH_UPLOAD_WARN_RATIO = 0.9

/** 较大文件在网络中断时更可能由网关/代理限制引起 */
const LARGE_UPLOAD_HINT_THRESHOLD = 80 * 1024 * 1024

export function getUploadFileItemBytes(item) {
  const raw = item?.raw ?? item
  const size = Number(raw?.size ?? item?.size ?? 0)
  return Number.isFinite(size) && size > 0 ? size : 0
}

export function isFileOverUploadLimit(sizeBytes) {
  const size = Number(sizeBytes)
  if (!Number.isFinite(size) || size <= 0) return false
  return size > MAX_SINGLE_FILE_UPLOAD_BYTES
}

export function sumUploadFilesBytes(fileList) {
  let total = 0
  for (const item of fileList || []) {
    total += getUploadFileItemBytes(item)
  }
  return total
}

export function formatUploadLimitHintSize(bytes) {
  const value = Number(bytes || 0)
  if (!value) return '未知'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

export function getFileOverLimitMessage(fileName, sizeBytes) {
  const name = fileName ? `「${fileName}」` : '该文件'
  const sizeText = formatUploadLimitHintSize(sizeBytes)
  return `${name}大小为 ${sizeText}，超过单文件 ${MAX_SINGLE_FILE_UPLOAD_LABEL} 限制`
}

export function filterAcceptedUploadFiles(fileList) {
  const accepted = []
  const rejected = []
  for (const item of fileList || []) {
    const size = getUploadFileItemBytes(item)
    if (isFileOverUploadLimit(size)) {
      rejected.push(item)
    } else {
      accepted.push(item)
    }
  }
  return { accepted, rejected }
}

export function trimToBatchUploadLimit(fileList) {
  const accepted = []
  const rejected = []
  let totalBytes = 0
  for (const item of fileList || []) {
    const size = getUploadFileItemBytes(item)
    if (totalBytes + size > MAX_BATCH_UPLOAD_BYTES) {
      rejected.push(item)
      continue
    }
    totalBytes += size
    accepted.push(item)
  }
  return { accepted, rejected, totalBytes }
}

export function formatOversizedFilesRejectionMessage(rejectedFiles) {
  if (!rejectedFiles?.length) return null
  const first = rejectedFiles[0]
  const name = first?.name ?? first?.raw?.name ?? '文件'
  const size = getUploadFileItemBytes(first)
  if (rejectedFiles.length === 1) {
    return getFileOverLimitMessage(name, size)
  }
  return `${rejectedFiles.length} 个文件超过单文件 ${MAX_SINGLE_FILE_UPLOAD_LABEL} 限制，已自动排除`
}

export function formatBatchRejectedMessage(rejectedFiles, totalBytes) {
  if (!rejectedFiles?.length) return null
  const sizeText = formatUploadLimitHintSize(totalBytes)
  if (rejectedFiles.length === 1) {
    const name = rejectedFiles[0]?.name ?? rejectedFiles[0]?.raw?.name ?? '文件'
    return `「${name}」加入后将超过单次上传上限 ${MAX_BATCH_UPLOAD_LABEL}（当前合计约 ${sizeText}），已自动排除`
  }
  return `${rejectedFiles.length} 个文件加入后将超过单次上传上限 ${MAX_BATCH_UPLOAD_LABEL}（当前合计约 ${sizeText}），已自动排除`
}

export function validateUploadBatchSize(fileList) {
  const totalBytes = sumUploadFilesBytes(fileList)
  if (totalBytes > MAX_BATCH_UPLOAD_BYTES) {
    return {
      ok: false,
      totalBytes,
      message: `本次所选文件合计 ${formatUploadLimitHintSize(totalBytes)}，超过单次上传上限 ${MAX_BATCH_UPLOAD_LABEL}`,
    }
  }
  const warnThreshold = MAX_BATCH_UPLOAD_BYTES * BATCH_UPLOAD_WARN_RATIO
  if (totalBytes >= warnThreshold) {
    return {
      ok: true,
      totalBytes,
      warning: `本次所选文件合计 ${formatUploadLimitHintSize(totalBytes)}，已接近单次上传上限 ${MAX_BATCH_UPLOAD_LABEL}`,
    }
  }
  return { ok: true, totalBytes }
}

export function processUploadFileSelection(fileList) {
  const errors = []
  const warnings = []

  const { accepted: singleAccepted, rejected: singleRejected } = filterAcceptedUploadFiles(fileList)
  const sizeMsg = formatOversizedFilesRejectionMessage(singleRejected)
  if (sizeMsg) errors.push(sizeMsg)

  const { accepted, rejected: batchRejected, totalBytes } = trimToBatchUploadLimit(singleAccepted)
  const batchMsg = formatBatchRejectedMessage(batchRejected, totalBytes)
  if (batchMsg) errors.push(batchMsg)

  const batchCheck = validateUploadBatchSize(accepted)
  if (batchCheck.warning) warnings.push(batchCheck.warning)

  return { accepted, errors, warnings }
}

function isLikelySizeRelatedNetworkFailure(context = {}) {
  const fileSize = Number(context.fileSize ?? context.totalBytes ?? 0)
  if (Number.isFinite(fileSize) && fileSize > 0) {
    if (isFileOverUploadLimit(fileSize)) return true
    if (fileSize >= LARGE_UPLOAD_HINT_THRESHOLD) return true
  }
  const batchTotal = Number(context.batchTotalBytes ?? 0)
  if (Number.isFinite(batchTotal) && batchTotal >= MAX_BATCH_UPLOAD_BYTES * BATCH_UPLOAD_WARN_RATIO) {
    return true
  }
  return false
}

export function resolveUploadHttpError(error, fallback = '文件上传失败', context = {}) {
  const status = error?.response?.status
  if (status === 413) {
    return `文件超过单文件 ${MAX_SINGLE_FILE_UPLOAD_LABEL} 大小限制`
  }
  const code = error?.code
  const msg = String(error?.message || '')
  if (code === 'ERR_NETWORK' || msg === 'Network Error') {
    if (isLikelySizeRelatedNetworkFailure(context)) {
      return `上传失败，可能是文件过大（单文件上限 ${MAX_SINGLE_FILE_UPLOAD_LABEL}）或网络中断，请检查后重试`
    }
    return '网络中断或服务器无响应，请检查网络后重试'
  }
  return getApiErrorMessage(error, msg || fallback)
}
