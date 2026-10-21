import { describe, expect, it, vi } from 'vitest'
import {
  isRetryableUploadNetworkError,
  runConcurrentUploads,
  UPLOAD_FILE_STATUS,
} from './useConcurrentFileUpload.js'

function makeFileItem(name, size = 1024) {
  const raw = new File([new Uint8Array(size)], name, { type: 'application/pdf' })
  return { name, uid: name, raw, size }
}

describe('isRetryableUploadNetworkError', () => {
  it('识别 ERR_NETWORK / Network Error', () => {
    expect(isRetryableUploadNetworkError({ code: 'ERR_NETWORK', message: 'Network Error' })).toBe(
      true,
    )
    expect(isRetryableUploadNetworkError({ message: 'Network Error' })).toBe(true)
  })

  it('有 HTTP 响应或取消时不重试', () => {
    expect(isRetryableUploadNetworkError({ response: { status: 500 }, code: 'ERR_BAD_RESPONSE' })).toBe(
      false,
    )
    expect(isRetryableUploadNetworkError({ code: 'ERR_CANCELED', name: 'CanceledError' })).toBe(
      false,
    )
  })
})

describe('runConcurrentUploads network retry', () => {
  it('网络失败自动重试后成功', async () => {
    const file = makeFileItem('a.pdf')
    const uploadApi = vi
      .fn()
      .mockRejectedValueOnce({ code: 'ERR_NETWORK', message: 'Network Error' })
      .mockResolvedValueOnce({
        data: { code: 200, data: { fileId: '1', fileName: 'a.pdf' } },
      })

    const result = await runConcurrentUploads({
      files: [file],
      concurrency: 1,
      networkRetries: 2,
      retryBaseDelayMs: 1,
      uploadApi,
      buildParams: () => ({ projectId: 1 }),
    })

    expect(uploadApi).toHaveBeenCalledTimes(2)
    expect(result.successCount).toBe(1)
    expect(result.errorCount).toBe(0)
    expect(result.failedFiles).toHaveLength(0)
  })

  it('重试用尽后记为失败', async () => {
    const file = makeFileItem('b.pdf')
    const uploadApi = vi.fn().mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' })

    const result = await runConcurrentUploads({
      files: [file],
      concurrency: 1,
      networkRetries: 2,
      retryBaseDelayMs: 1,
      uploadApi,
      buildParams: () => ({ projectId: 1 }),
    })

    expect(uploadApi).toHaveBeenCalledTimes(3)
    expect(result.successCount).toBe(0)
    expect(result.errorCount).toBe(1)
    expect(result.failedFiles[0].fileName).toBe('b.pdf')
  })

  it('业务错误不重试', async () => {
    const file = makeFileItem('c.pdf')
    const uploadApi = vi.fn().mockResolvedValue({
      data: { code: 400, msg: '格式不支持' },
    })

    const result = await runConcurrentUploads({
      files: [file],
      concurrency: 1,
      networkRetries: 2,
      retryBaseDelayMs: 1,
      uploadApi,
      buildParams: () => ({ projectId: 1 }),
    })

    expect(uploadApi).toHaveBeenCalledTimes(1)
    expect(result.errorCount).toBe(1)
    expect(result.failedFiles[0].error).toBe('格式不支持')
  })

  it('取消后不再重试', async () => {
    const file = makeFileItem('d.pdf')
    const ac = new AbortController()
    const uploadApi = vi.fn().mockImplementation(() => {
      ac.abort()
      const err = new Error('canceled')
      err.code = 'ERR_CANCELED'
      err.name = 'CanceledError'
      return Promise.reject(err)
    })

    const states = []
    const result = await runConcurrentUploads({
      files: [file],
      concurrency: 1,
      signal: ac.signal,
      networkRetries: 2,
      retryBaseDelayMs: 1,
      uploadApi,
      buildParams: () => ({ projectId: 1 }),
      onFileState: (_uid, state) => states.push(state.status),
    })

    expect(uploadApi).toHaveBeenCalledTimes(1)
    expect(result.cancelled).toBe(true)
    expect(result.errorCount).toBe(0)
    expect(states.at(-1)).toBe(UPLOAD_FILE_STATUS.CANCELLED)
  })

  it('请求体已发完后的网络错误不自动重试，避免重复入库', async () => {
    const file = makeFileItem('e.pdf', 2048)
    const uploadApi = vi.fn().mockImplementation((_formData, config) => {
      config?.onUploadProgress?.({ loaded: 2048, total: 2048 })
      return Promise.reject({ code: 'ERR_NETWORK', message: 'Network Error' })
    })

    const result = await runConcurrentUploads({
      files: [file],
      concurrency: 1,
      networkRetries: 2,
      retryBaseDelayMs: 1,
      uploadApi,
      buildParams: () => ({ projectId: 1 }),
    })

    expect(uploadApi).toHaveBeenCalledTimes(1)
    expect(result.errorCount).toBe(1)
    expect(result.failedFiles).toHaveLength(1)
  })
})
