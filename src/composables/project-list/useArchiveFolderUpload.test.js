import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/services/file.service', () => ({
  uploadFile: vi.fn(),
}))

import { uploadFile } from '@/services/file.service'
import { useArchiveFolderUpload } from '@/composables/project-list/useArchiveFolderUpload.js'

describe('useArchiveFolderUpload', () => {
  beforeEach(() => {
    uploadFile.mockReset()
  })

  it('uses the batch-start upload params for queued concurrent files', async () => {
    const releaseFirstWave = createDeferred()
    const requests = []
    let callIndex = 0
    uploadFile.mockImplementation(async (_, options) => {
      const fileId = ++callIndex
      requests.push({ ...options.params })
      if (fileId <= 4) {
        await releaseFirstWave.promise
      }
      return {
        data: {
          code: 200,
          data: { fileId, fileName: `file-${fileId}.pdf` },
        },
      }
    })

    const projectId = ref(101)
    const selectedArchiveId = ref(202)
    const uploadedRows = []
    const archiveUpload = useArchiveFolderUpload({
      projectId,
      selectedArchiveId,
      uploadUserName: ref('tester'),
      syncUploadContextByArchive: vi.fn(),
      onFileUploaded: (row) => uploadedRows.push(row),
      onUploadSuccess: vi.fn(),
    })
    archiveUpload.uploadForm.fileContextType = 'SURVEY_REPORT'
    archiveUpload.uploadForm.phase = 1
    archiveUpload.uploadFiles.value = Array.from({ length: 6 }, (_, index) =>
      makeUploadItem(`file-${index + 1}.pdf`)
    )

    const uploadPromise = archiveUpload.handleBatchUpload()
    await waitFor(() => requests.length === 4)

    projectId.value = 999
    archiveUpload.uploadForm.fileContextType = 'OTHER'
    archiveUpload.uploadForm.phase = 2
    releaseFirstWave.resolve()
    await uploadPromise

    expect(requests).toHaveLength(6)
    expect(requests).toEqual(
      Array.from({ length: 6 }, () => ({
        projectId: 101,
        fileContextType: 'SURVEY_REPORT',
        phase: 1,
      }))
    )
    expect(uploadedRows.map((row) => row.fileContextType)).toEqual(
      Array.from({ length: 6 }, () => 'SURVEY_REPORT')
    )
  })
})

function makeUploadItem(name) {
  const raw = new Blob(['x'], { type: 'application/pdf' })
  Object.defineProperty(raw, 'name', { value: name })
  return { name, uid: name, raw, size: raw.size }
}

function createDeferred() {
  let resolve
  const promise = new Promise((res) => {
    resolve = res
  })
  return { promise, resolve }
}

async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) {
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('condition was not met before timeout')
}
