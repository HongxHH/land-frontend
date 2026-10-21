import axios from 'axios'
import { uploadFile } from '@/services/file.service'
import {
  getFileOverLimitMessage,
  isFileOverUploadLimit,
  resolveUploadHttpError,
} from '@/utils/fileUploadLimit.js'

export const UPLOAD_FILE_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
  CANCELLED: 'cancelled',
}

/** 网络类失败时，在首次失败后再自动重试的次数 */
export const DEFAULT_UPLOAD_NETWORK_RETRIES = 2

/** 首次重试前等待；后续按 attempt 递增 */
export const UPLOAD_NETWORK_RETRY_BASE_DELAY_MS = 500

export function isUploadAbortError(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'
}

/**
 * 仅重试「无 HTTP 响应」的传输层失败（与业务 4xx/5xx、取消区分）。
 */
export function isRetryableUploadNetworkError(error) {
  if (!error || isUploadAbortError(error)) return false
  if (error.response != null) return false
  const code = error.code
  if (code === 'ERR_NETWORK' || code === 'ERR_INTERNET_DISCONNECTED' || code === 'ECONNRESET') {
    return true
  }
  const msg = String(error.message || '')
  return msg === 'Network Error' || /network error/i.test(msg)
}

function resolveFileUid(fileItem) {
  return fileItem?.uid ?? fileItem?.raw?.uid ?? fileItem?.name
}

function resolveRawFile(fileItem) {
  return fileItem?.raw ?? fileItem
}

function extractErrorMessage(error, context) {
  return resolveUploadHttpError(error, '文件上传失败', context)
}

function createInitialState(fileItem) {
  const raw = resolveRawFile(fileItem)
  const total = Number(raw?.size || 0)
  return {
    status: UPLOAD_FILE_STATUS.PENDING,
    progress: 0,
    loaded: 0,
    total: Number.isFinite(total) ? total : 0,
    fileId: null,
    error: null,
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', name: 'CanceledError' }))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED', name: 'CanceledError' }))
    }
    signal?.addEventListener?.('abort', onAbort, { once: true })
  })
}

/**
 * 并发单文件上传编排。
 */
export async function runConcurrentUploads({
  files,
  buildParams,
  concurrency = 4,
  signal,
  onFileState,
  onFileSuccess,
  uploadApi = uploadFile,
  networkRetries = DEFAULT_UPLOAD_NETWORK_RETRIES,
  retryBaseDelayMs = UPLOAD_NETWORK_RETRY_BASE_DELAY_MS,
}) {
  if (!files?.length) {
    return { successCount: 0, errorCount: 0, cancelled: false, failedFiles: [] }
  }

  const maxAttempts = Math.max(1, 1 + Number(networkRetries || 0))
  const baseDelay = Math.max(0, Number(retryBaseDelayMs) || 0)

  const states = new Map()
  for (const fileItem of files) {
    const uid = resolveFileUid(fileItem)
    states.set(uid, createInitialState(fileItem))
    onFileState?.(uid, { ...states.get(uid) })
  }

  let successCount = 0
  let errorCount = 0
  let cancelled = false
  let nextIndex = 0

  const notify = (uid) => {
    const state = states.get(uid)
    if (state) onFileState?.(uid, { ...state })
  }

  const uploadOne = async (fileItem) => {
    const uid = resolveFileUid(fileItem)
    const raw = resolveRawFile(fileItem)
    if (!raw) {
      const state = states.get(uid)
      state.status = UPLOAD_FILE_STATUS.ERROR
      state.error = '无效文件'
      errorCount += 1
      notify(uid)
      return
    }

    if (signal?.aborted) {
      const state = states.get(uid)
      state.status = UPLOAD_FILE_STATUS.CANCELLED
      notify(uid)
      cancelled = true
      return
    }

    const state = states.get(uid)
    if (isFileOverUploadLimit(raw.size)) {
      state.status = UPLOAD_FILE_STATUS.ERROR
      state.error = getFileOverLimitMessage(raw.name, raw.size)
      errorCount += 1
      notify(uid)
      return
    }

    const params = typeof buildParams === 'function' ? buildParams(fileItem) : buildParams?.()
    let lastError = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (signal?.aborted) {
        state.status = UPLOAD_FILE_STATUS.CANCELLED
        cancelled = true
        notify(uid)
        return
      }

      state.status = UPLOAD_FILE_STATUS.UPLOADING
      state.progress = 0
      state.loaded = 0
      state.error = null
      notify(uid)

      // 每次尝试新建 FormData，避免失败后 body 不可复用
      const formData = new FormData()
      formData.append('file', raw)

      // 请求体一旦发完，服务端可能已开始/完成入库；此时网络失败不再自动重试，避免重复文件
      let bodyFullySent = !Number(raw.size)

      // 0 字节或无法汇报进度时：直接进入「入库中」，避免一直停在传输中
      if (bodyFullySent) {
        state.status = UPLOAD_FILE_STATUS.PROCESSING
        notify(uid)
      }

      try {
        const res = await uploadApi(formData, {
          params,
          signal,
          onUploadProgress: (event) => {
            const total = Number(event.total || state.total || 0)
            const loaded = Number(event.loaded || 0)
            state.loaded = loaded
            if (total > 0) {
              state.total = total
              const pct = Math.min(99, Math.round((loaded / total) * 100))
              state.progress = pct
              // 请求体发完后切到「入库中」，等待服务端写 GridFS 并返回
              if (loaded >= total) {
                bodyFullySent = true
                if (state.status === UPLOAD_FILE_STATUS.UPLOADING) {
                  state.status = UPLOAD_FILE_STATUS.PROCESSING
                  state.progress = 99
                }
              }
            }
            notify(uid)
          },
        })

        if (res.data?.code === 200) {
          if (signal?.aborted) {
            state.status = UPLOAD_FILE_STATUS.CANCELLED
            cancelled = true
          } else {
            state.status = UPLOAD_FILE_STATUS.DONE
            state.progress = 100
            state.loaded = state.total > 0 ? state.total : state.loaded
            state.fileId = res.data?.data?.fileId ?? null
            state.error = null
            successCount += 1
            onFileSuccess?.({
              uid,
              fileId: state.fileId,
              fileName: res.data?.data?.fileName ?? raw?.name ?? '',
              response: res.data,
            })
          }
          notify(uid)
          return
        }

        // 业务失败不重试
        state.status = UPLOAD_FILE_STATUS.ERROR
        state.error = res.data?.msg || '文件上传失败'
        errorCount += 1
        notify(uid)
        return
      } catch (error) {
        if (isUploadAbortError(error)) {
          state.status = UPLOAD_FILE_STATUS.CANCELLED
          cancelled = true
          notify(uid)
          return
        }

        lastError = error
        const canRetry =
          attempt < maxAttempts &&
          isRetryableUploadNetworkError(error) &&
          !bodyFullySent &&
          !signal?.aborted
        if (!canRetry) {
          state.status = UPLOAD_FILE_STATUS.ERROR
          state.error = extractErrorMessage(error, {
            fileSize: raw.size,
            loadedBytes: state.loaded,
            batchTotalBytes: state.total,
          })
          errorCount += 1
          notify(uid)
          return
        }

        try {
          await sleep(baseDelay * attempt, signal)
        } catch (sleepError) {
          if (isUploadAbortError(sleepError)) {
            state.status = UPLOAD_FILE_STATUS.CANCELLED
            cancelled = true
            notify(uid)
            return
          }
          throw sleepError
        }
      }
    }

    // 理论上不会走到这里；兜底按最后一次错误计失败
    state.status = UPLOAD_FILE_STATUS.ERROR
    state.error = extractErrorMessage(lastError, {
      fileSize: raw.size,
      loadedBytes: state.loaded,
      batchTotalBytes: state.total,
    })
    errorCount += 1
    notify(uid)
  }

  const workers = Array.from({ length: Math.min(concurrency, files.length) }, async () => {
    while (nextIndex < files.length) {
      if (signal?.aborted) {
        cancelled = true
        break
      }
      const current = files[nextIndex]
      nextIndex += 1
      await uploadOne(current)
    }
  })

  await Promise.all(workers)

  if (signal?.aborted) {
    for (const [uid, state] of states) {
      if (
        state.status === UPLOAD_FILE_STATUS.PENDING ||
        state.status === UPLOAD_FILE_STATUS.UPLOADING ||
        state.status === UPLOAD_FILE_STATUS.PROCESSING
      ) {
        state.status = UPLOAD_FILE_STATUS.CANCELLED
        notify(uid)
      }
    }
    cancelled = true
  }

  const failedFiles = []
  for (const fileItem of files) {
    const uid = resolveFileUid(fileItem)
    const state = states.get(uid)
    if (state?.status !== UPLOAD_FILE_STATUS.ERROR) continue
    const raw = resolveRawFile(fileItem)
    failedFiles.push({
      uid,
      fileName: fileItem?.name || raw?.name || String(uid),
      error: state.error || '文件上传失败',
      fileItem,
    })
  }

  return { successCount, errorCount, cancelled, failedFiles }
}

export function aggregateUploadBytes(fileStatesMap, files) {
  let loaded = 0
  let total = 0
  for (const fileItem of files || []) {
    const uid = resolveFileUid(fileItem)
    const state = fileStatesMap?.get?.(uid) ?? fileStatesMap?.[uid]
    const raw = resolveRawFile(fileItem)
    const fileTotal = Number(state?.total || raw?.size || 0)
    const fileLoaded = Number(state?.loaded || 0)
    if (Number.isFinite(fileTotal)) total += fileTotal
    if (Number.isFinite(fileLoaded)) loaded += fileLoaded
  }
  const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0
  return { loaded, total, progress }
}

export function resolveUploadFileUid(fileItem) {
  return resolveFileUid(fileItem)
}
