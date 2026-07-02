import axios from 'axios'
import { uploadFile } from '@/services/file.service'

export const UPLOAD_FILE_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
  CANCELLED: 'cancelled'
}

export function isUploadAbortError(error) {
  return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError'
}

function resolveFileUid(fileItem) {
  return fileItem?.uid ?? fileItem?.raw?.uid ?? fileItem?.name
}

function resolveRawFile(fileItem) {
  return fileItem?.raw ?? fileItem
}

function extractErrorMessage(error) {
  return (
    error?.response?.data?.msg ||
    error?.response?.data?.message ||
    error?.message ||
    '文件上传失败'
  )
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
    error: null
  }
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
  uploadApi = uploadFile
}) {
  if (!files?.length) {
    return { successCount: 0, errorCount: 0, cancelled: false }
  }

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
    state.status = UPLOAD_FILE_STATUS.UPLOADING
    state.progress = 0
    state.loaded = 0
    notify(uid)

    const formData = new FormData()
    formData.append('file', raw)

    try {
      state.status = UPLOAD_FILE_STATUS.PROCESSING
      notify(uid)

      const res = await uploadApi(formData, {
        params: buildParams(),
        signal,
        onUploadProgress: (event) => {
          const total = Number(event.total || state.total || 0)
          const loaded = Number(event.loaded || 0)
          state.loaded = loaded
          if (total > 0) {
            state.total = total
            state.progress = Math.min(99, Math.round((loaded / total) * 100))
          }
          notify(uid)
        }
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
            response: res.data
          })
        }
      } else {
        state.status = UPLOAD_FILE_STATUS.ERROR
        state.error = res.data?.msg || '文件上传失败'
        errorCount += 1
      }
    } catch (error) {
      if (isUploadAbortError(error)) {
        state.status = UPLOAD_FILE_STATUS.CANCELLED
        cancelled = true
      } else {
        state.status = UPLOAD_FILE_STATUS.ERROR
        state.error = extractErrorMessage(error)
        errorCount += 1
      }
    }
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
        state.status === UPLOAD_FILE_STATUS.PENDING
        || state.status === UPLOAD_FILE_STATUS.UPLOADING
        || state.status === UPLOAD_FILE_STATUS.PROCESSING
      ) {
        state.status = UPLOAD_FILE_STATUS.CANCELLED
        notify(uid)
      }
    }
    cancelled = true
  }

  return { successCount, errorCount, cancelled }
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
