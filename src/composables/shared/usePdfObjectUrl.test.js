import { describe, expect, it } from 'vitest'
import { loadPdfBlobUrl } from './usePdfObjectUrl.js'

function deferred() {
  /** @type {(value: string) => void} */
  let resolve
  /** @type {(error: Error) => void} */
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createPreviewHarness(downloads) {
  let generation = 0
  let url = ''
  const revoked = []

  const start = (gridfsId) => {
    const requestGeneration = ++generation
    return loadPdfBlobUrl({
      gridfsId,
      requestGeneration,
      getActiveGeneration: () => generation,
      getCurrentUrl: () => url,
      download: (id) => downloads[id].promise,
      createObjectURL: (payload) => `blob:${payload}`,
      revokeObjectURL: (objectUrl) => {
        revoked.push(objectUrl)
      },
    }).then((result) => {
      if (requestGeneration === generation) url = result.url
      return result
    })
  }

  return {
    start,
    revoked,
    currentUrl: () => url,
  }
}

describe('loadPdfBlobUrl', () => {
  it('先发起预览 A 再发起预览 B，A 后返回时地址仍是 B，并释放 A 的 blob', async () => {
    const downloads = {
      a: deferred(),
      b: deferred(),
    }
    const preview = createPreviewHarness(downloads)

    const pendingA = preview.start('a')
    const pendingB = preview.start('b')

    downloads.b.resolve('file-b')
    const resultB = await pendingB
    downloads.a.resolve('file-a')
    const resultA = await pendingA

    expect(resultB.ok).toBe(true)
    expect(resultA).toMatchObject({ ok: false, reason: 'stale' })
    expect(preview.currentUrl()).toBe('blob:file-b')
    expect(preview.revoked).toEqual(['blob:file-a'])
  })

  it('当前请求下载失败时清掉旧地址，过期失败不释放正在看的地址', async () => {
    let generation = 1
    let url = 'blob:old'
    const revoked = []
    const revokeObjectURL = (objectUrl) => {
      revoked.push(objectUrl)
    }
    const failed = await loadPdfBlobUrl({
      gridfsId: 'current',
      requestGeneration: 1,
      getActiveGeneration: () => generation,
      getCurrentUrl: () => url,
      download: async () => {
        throw new Error('network')
      },
      createObjectURL: (payload) => `blob:${payload}`,
      revokeObjectURL,
    })
    url = failed.url

    expect(failed).toMatchObject({ ok: false, reason: 'error', url: '' })
    expect(url).toBe('')
    expect(revoked).toEqual(['blob:old'])

    const stale = await loadPdfBlobUrl({
      gridfsId: 'late',
      requestGeneration: 1,
      getActiveGeneration: () => 2,
      getCurrentUrl: () => 'blob:current',
      download: async () => {
        throw new Error('late')
      },
      createObjectURL: (payload) => `blob:${payload}`,
      revokeObjectURL,
    })
    expect(stale).toMatchObject({ ok: false, reason: 'stale', url: 'blob:current' })
    expect(revoked).toEqual(['blob:old'])
  })
})
