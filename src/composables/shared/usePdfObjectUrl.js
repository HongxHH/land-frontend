import { onScopeDispose, ref } from 'vue'
import { downloadGridFsFile } from '@/services/file.service'

/**
 * 代号过期则丢弃这次 blob，不替换当前预览地址。
 * @param {{
 *   requestGeneration: number,
 *   activeGeneration: number,
 *   nextUrl: string,
 *   currentUrl: string,
 *   revokeObjectURL: (url: string) => void,
 * }} input
 * @returns {{ discarded: boolean, url: string }}
 */
export function discardStalePdfBlob({
  requestGeneration,
  activeGeneration,
  nextUrl,
  currentUrl,
  revokeObjectURL,
}) {
  if (requestGeneration !== activeGeneration) {
    if (nextUrl) revokeObjectURL(nextUrl)
    return { discarded: true, url: currentUrl }
  }
  return { discarded: false, url: nextUrl }
}

/**
 * 按 GridFS 下载结果决定预览地址。download / createObjectURL / revoke 由调用方注入。
 */
export async function loadPdfBlobUrl({
  gridfsId,
  requestGeneration,
  getActiveGeneration,
  getCurrentUrl,
  download,
  createObjectURL,
  revokeObjectURL,
}) {
  if (!gridfsId) {
    if (requestGeneration !== getActiveGeneration()) {
      return { ok: false, reason: 'stale', url: getCurrentUrl() }
    }
    const currentUrl = getCurrentUrl()
    if (currentUrl) revokeObjectURL(currentUrl)
    return { ok: false, reason: 'missing', url: '' }
  }

  try {
    const payload = await download(gridfsId)
    const nextUrl = createObjectURL(payload)
    const settled = discardStalePdfBlob({
      requestGeneration,
      activeGeneration: getActiveGeneration(),
      nextUrl,
      currentUrl: getCurrentUrl(),
      revokeObjectURL,
    })
    if (settled.discarded) {
      return { ok: false, reason: 'stale', url: settled.url }
    }
    const previousUrl = getCurrentUrl()
    if (previousUrl && previousUrl !== nextUrl) revokeObjectURL(previousUrl)
    return { ok: true, reason: 'ok', url: nextUrl }
  } catch (error) {
    if (requestGeneration !== getActiveGeneration()) {
      return { ok: false, reason: 'stale', url: getCurrentUrl(), error }
    }
    const currentUrl = getCurrentUrl()
    if (currentUrl) revokeObjectURL(currentUrl)
    return { ok: false, reason: 'error', url: '', error }
  }
}

async function downloadPdfBlob(gridfsId) {
  const res = await downloadGridFsFile(gridfsId, { responseType: 'blob' })
  return new Blob([res.data], { type: 'application/pdf' })
}

export function usePdfObjectUrl() {
  const pdfUrl = ref('')
  const pdfLoading = ref(false)
  let generation = 0

  const revokeObjectURL = (url) => {
    if (url) URL.revokeObjectURL(url)
  }

  const loadPdf = async (gridfsId) => {
    const requestGeneration = ++generation
    pdfLoading.value = Boolean(gridfsId)
    try {
      const result = await loadPdfBlobUrl({
        gridfsId,
        requestGeneration,
        getActiveGeneration: () => generation,
        getCurrentUrl: () => pdfUrl.value,
        download: downloadPdfBlob,
        createObjectURL: (blob) => URL.createObjectURL(blob),
        revokeObjectURL,
      })
      if (requestGeneration === generation) {
        pdfUrl.value = result.url
        pdfLoading.value = false
      }
      return result
    } catch (error) {
      if (requestGeneration === generation) {
        revokeObjectURL(pdfUrl.value)
        pdfUrl.value = ''
        pdfLoading.value = false
      }
      return { ok: false, reason: 'error', error }
    }
  }

  const clearPdf = () => {
    generation += 1
    revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
    pdfLoading.value = false
  }

  onScopeDispose(clearPdf)

  return { pdfUrl, pdfLoading, loadPdf, clearPdf }
}
