import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useUploadDialog } from '@/composables/file-upload/useUploadDialog.js'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

function makeUploadFile(uid) {
  const raw = {
    name: `${uid}.txt`,
    size: 8,
  }
  return {
    uid,
    name: raw.name,
    raw,
  }
}

function uploadSuccess(fileId) {
  return {
    data: {
      code: 200,
      data: {
        fileId,
        fileName: `${fileId}.txt`,
      },
    },
  }
}

describe('useUploadDialog', () => {
  const originalFormData = globalThis.FormData

  beforeEach(() => {
    vi.clearAllMocks()
    ElMessageBox.confirm.mockResolvedValue()
    globalThis.FormData = class {
      append = vi.fn()
    }
  })

  afterEach(() => {
    globalThis.FormData = originalFormData
  })

  it('uses the confirmed upload context for every file in a batch', async () => {
    const pendingUploads = []
    const uploadApi = vi.fn(() => {
      const pending = deferred()
      pendingUploads.push(pending)
      return pending.promise
    })
    const prependedFiles = []
    const currentProject = ref('project-a')
    const dialog = useUploadDialog({
      currentProject,
      projectOptions: ref([{ id: 'project-a', name: '项目A' }]),
      startPolling: vi.fn(),
      refreshData: vi.fn(),
      prependUploadedFiles: (files) => prependedFiles.push(...files),
      uploadApi,
    })

    dialog.tempUploadType.value = 'SURVEY_REPORT'
    dialog.uploadPhase.value = 1
    dialog.tempFiles.value = Array.from({ length: 5 }, (_, index) => makeUploadFile(`f-${index}`))

    dialog.confirmUpload()
    await flushPromises()

    expect(uploadApi).toHaveBeenCalledTimes(4)
    currentProject.value = 'project-b'
    dialog.tempUploadType.value = 'CONTRACT'
    dialog.uploadPhase.value = 2

    pendingUploads.slice(0, 4).forEach((pending, index) => pending.resolve(uploadSuccess(index + 1)))
    await flushPromises()

    expect(uploadApi).toHaveBeenCalledTimes(5)
    pendingUploads[4].resolve(uploadSuccess(5))
    await flushPromises()
    await flushPromises()

    expect(uploadApi).toHaveBeenCalledTimes(5)
    for (const call of uploadApi.mock.calls) {
      expect(call[1].params).toEqual({
        projectId: 'project-a',
        fileContextType: 'SURVEY_REPORT',
        phase: 1,
      })
    }
    expect(prependedFiles).toHaveLength(5)
    expect(prependedFiles.every((file) => file.fileContextType === 'SURVEY_REPORT')).toBe(true)
    expect(prependedFiles.every((file) => file.phase === 1)).toBe(true)
  })
})
