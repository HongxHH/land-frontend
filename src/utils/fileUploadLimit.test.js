import { describe, expect, it } from 'vitest'
import {
  BATCH_UPLOAD_WARN_RATIO,
  MAX_BATCH_UPLOAD_BYTES,
  MAX_SINGLE_FILE_UPLOAD_BYTES,
  filterAcceptedUploadFiles,
  formatBatchRejectedMessage,
  formatOversizedFilesRejectionMessage,
  getFileOverLimitMessage,
  isFileOverUploadLimit,
  processUploadFileSelection,
  resolveUploadHttpError,
  sumUploadFilesBytes,
  trimToBatchUploadLimit,
  validateUploadBatchSize,
} from '@/utils/fileUploadLimit.js'

const MB = 1024 * 1024

function makeFile(name, sizeBytes) {
  return { name, raw: { name, size: sizeBytes } }
}

describe('isFileOverUploadLimit', () => {
  it('treats exactly 100MB as allowed', () => {
    expect(isFileOverUploadLimit(100 * MB)).toBe(false)
  })

  it('rejects 100MB + 1 byte', () => {
    expect(isFileOverUploadLimit(100 * MB + 1)).toBe(true)
  })

  it('ignores invalid or empty sizes', () => {
    expect(isFileOverUploadLimit(0)).toBe(false)
    expect(isFileOverUploadLimit(-1)).toBe(false)
    expect(isFileOverUploadLimit(Number.NaN)).toBe(false)
  })
})

describe('filterAcceptedUploadFiles', () => {
  it('splits mixed file list by single-file limit', () => {
    const files = [makeFile('ok.pdf', 10 * MB), makeFile('big.pdf', 101 * MB)]
    const { accepted, rejected } = filterAcceptedUploadFiles(files)
    expect(accepted).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(accepted[0].name).toBe('ok.pdf')
  })
})

describe('validateUploadBatchSize', () => {
  it('warns when total size is near batch limit', () => {
    const files = [makeFile('a.pdf', 500 * MB), makeFile('b.pdf', 410 * MB)]
    const result = validateUploadBatchSize(files)
    expect(result.ok).toBe(true)
    expect(result.warning).toContain('接近')
    expect(result.totalBytes).toBe(910 * MB)
  })

  it('rejects totals above 1000MB', () => {
    const files = [makeFile('a.pdf', 600 * MB), makeFile('b.pdf', 500 * MB)]
    const result = validateUploadBatchSize(files)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('1000MB')
  })
})

describe('trimToBatchUploadLimit', () => {
  it('keeps files in order until batch cap is reached', () => {
    const files = [
      makeFile('first.pdf', 600 * MB),
      makeFile('second.pdf', 300 * MB),
      makeFile('third.pdf', 200 * MB),
    ]
    const { accepted, rejected, totalBytes } = trimToBatchUploadLimit(files)
    expect(accepted.map((f) => f.name)).toEqual(['first.pdf', 'second.pdf'])
    expect(rejected.map((f) => f.name)).toEqual(['third.pdf'])
    expect(totalBytes).toBe(900 * MB)
  })
})

describe('processUploadFileSelection', () => {
  it('returns size and batch rejection messages together', () => {
    const files = [
      makeFile('oversize.pdf', 120 * MB),
      ...Array.from({ length: 12 }, (_, index) => makeFile(`part-${index}.pdf`, 90 * MB)),
    ]
    const result = processUploadFileSelection(files)
    expect(result.accepted).toHaveLength(11)
    expect(result.errors.some((msg) => msg.includes('oversize.pdf'))).toBe(true)
    expect(result.errors.some((msg) => msg.includes('1000MB'))).toBe(true)
  })
})

describe('resolveUploadHttpError', () => {
  it('maps 413 to file-size message', () => {
    const message = resolveUploadHttpError({ response: { status: 413 } })
    expect(message).toContain('100MB')
  })

  it('uses generic network message for small files', () => {
    const message = resolveUploadHttpError(
      { code: 'ERR_NETWORK', message: 'Network Error' },
      '文件上传失败',
      { fileSize: 5 * MB }
    )
    expect(message).toBe('网络中断或服务器无响应，请检查网络后重试')
  })

  it('mentions file size for large-file network failures', () => {
    const message = resolveUploadHttpError(
      { code: 'ERR_NETWORK', message: 'Network Error' },
      '文件上传失败',
      { fileSize: 95 * MB }
    )
    expect(message).toContain('文件过大')
    expect(message).toContain('100MB')
  })

  it('mentions file size when batch total is near limit', () => {
    const message = resolveUploadHttpError(
      { message: 'Network Error' },
      '文件上传失败',
      { fileSize: 10 * MB, batchTotalBytes: MAX_BATCH_UPLOAD_BYTES * BATCH_UPLOAD_WARN_RATIO }
    )
    expect(message).toContain('文件过大')
  })

  it('falls back to backend msg when available', () => {
    const message = resolveUploadHttpError({
      response: { data: { msg: '项目不存在' } },
      message: 'Request failed',
    })
    expect(message).toBe('项目不存在')
  })
})

describe('message helpers', () => {
  it('formats single oversized rejection', () => {
    const message = formatOversizedFilesRejectionMessage([makeFile('big.pdf', 120 * MB)])
    expect(message).toBe(getFileOverLimitMessage('big.pdf', 120 * MB))
  })

  it('formats batch rejection with current total', () => {
    const message = formatBatchRejectedMessage([makeFile('extra.pdf', 50 * MB)], 980 * MB)
    expect(message).toContain('extra.pdf')
    expect(message).toContain('1000MB')
    expect(message).toContain('980.00 MB')
  })

  it('sums file bytes from upload items', () => {
    const total = sumUploadFilesBytes([makeFile('a.pdf', 3 * MB), makeFile('b.pdf', 7 * MB)])
    expect(total).toBe(10 * MB)
  })
})
