import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useArchiveFolderExplorerData } from './useArchiveFolderExplorerData.js'
import { deleteFileById, getProjectArchives, queryFiles } from '@/services/file.service'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/services/file.service', () => ({
  cancelParseByFileId: vi.fn(),
  deleteFileById: vi.fn(() => Promise.resolve({ data: { code: 200 } })),
  deleteProjectArchive: vi.fn(),
  getProjectArchives: vi.fn(),
  parseFileById: vi.fn(),
  queryFiles: vi.fn(() =>
    Promise.resolve({
      data: {
        data: {
          records: [],
          total: 0,
        },
      },
    })
  ),
}))

function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createExplorer(projectId) {
  return useArchiveFolderExplorerData({
    projectId: () => projectId.value,
    projectName: () => '测试项目',
    initialArchiveId: () => '',
    syncUploadContextByArchive: vi.fn(),
  })
}

describe('useArchiveFolderExplorerData project switching safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears stale selected rows before batch delete can use previous project files', async () => {
    const projectId = ref(1)
    const explorer = createExplorer(projectId)

    explorer.handleSelectionChange([{ id: 101, fileState: 'PARSE_COMPLETE' }])
    expect(explorer.canBatchDelete.value).toBe(true)

    projectId.value = 2
    explorer.resetArchiveProjectState()

    expect(explorer.selectedRows.value).toEqual([])
    expect(explorer.archiveFiles.value).toEqual([])
    expect(explorer.canBatchDelete.value).toBe(false)

    await explorer.handleBatchDelete()

    expect(deleteFileById).not.toHaveBeenCalled()
  })

  it('ignores archive responses from a previous project after project state resets', async () => {
    const projectId = ref(1)
    const explorer = createExplorer(projectId)
    const firstProjectArchives = createDeferred()
    const secondProjectArchives = createDeferred()

    getProjectArchives.mockImplementation((requestedProjectId) =>
      Number(requestedProjectId) === 1
        ? firstProjectArchives.promise
        : secondProjectArchives.promise
    )
    queryFiles.mockResolvedValue({
      data: {
        data: {
          records: [{ id: 202, fileState: 'PARSE_COMPLETE' }],
          total: 1,
        },
      },
    })

    const firstFetch = explorer.fetchArchives()

    projectId.value = 2
    explorer.resetArchiveProjectState()
    const secondFetch = explorer.fetchArchives()

    secondProjectArchives.resolve({
      data: {
        code: 200,
        data: [{ id: 22, name: '项目B归档', kind: 'OTHER' }],
      },
    })
    await secondFetch

    firstProjectArchives.resolve({
      data: {
        code: 200,
        data: [{ id: 11, name: '项目A归档', kind: 'OTHER' }],
      },
    })
    await firstFetch

    expect(explorer.archiveList.value).toEqual([{ id: 22, name: '项目B归档', kind: 'OTHER' }])
    expect(explorer.selectedArchiveId.value).toBe(22)
    expect(queryFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 2,
        archiveId: 22,
      }),
      expect.any(Object)
    )
  })
})
