import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { queryFiles } from '@/services/file.service'
import { useFileTableQuery } from '@/composables/file-upload/useFileTableQuery'

vi.mock('@/services/file.service', () => ({
  queryFiles: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    info: vi.fn(),
  },
}))

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const fileResponse = (id, originalName, projectId) => ({
  data: {
    code: 200,
    data: {
      records: [
        {
          id,
          gridfsId: `grid-${id}`,
          originalName,
          projectId,
          fileContextType: 'SURVEY_REPORT',
          fileState: 'WAITING_PARSE',
        },
      ],
      total: 1,
    },
  },
})

describe('useFileTableQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ignores stale project responses and keeps the newest project rows', async () => {
    const currentProject = ref('project-a')
    const first = deferred()
    const second = deferred()

    queryFiles
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const query = useFileTableQuery(currentProject)
    const firstRefresh = query.refreshData()
    query.fileTableData.value = [{ rawId: 101, name: 'project-a-old.xlsx' }]
    query.total.value = 1

    currentProject.value = 'project-b'
    const secondRefresh = query.refreshData()

    expect(queryFiles).toHaveBeenCalledTimes(2)
    expect(queryFiles.mock.calls[0][0].projectId).toBe('project-a')
    expect(queryFiles.mock.calls[1][0].projectId).toBe('project-b')
    expect(queryFiles.mock.calls[0][1].signal.aborted).toBe(true)
    expect(query.fileTableData.value).toEqual([])
    expect(query.total.value).toBe(0)

    second.resolve(fileResponse(202, 'project-b.xlsx', 'project-b'))
    await secondRefresh

    expect(query.fileTableData.value).toHaveLength(1)
    expect(query.fileTableData.value[0].rawId).toBe(202)
    expect(query.fileTableData.value[0].name).toBe('project-b.xlsx')
    expect(query.total.value).toBe(1)
    expect(query.tableLoading.value).toBe(false)

    first.resolve(fileResponse(101, 'project-a.xlsx', 'project-a'))
    await firstRefresh

    expect(query.fileTableData.value).toHaveLength(1)
    expect(query.fileTableData.value[0].rawId).toBe(202)
    expect(query.fileTableData.value[0].name).toBe('project-b.xlsx')
    expect(query.tableLoading.value).toBe(false)
  })

  it('aborts an in-flight query and clears rows when project is cleared', async () => {
    const currentProject = ref('project-a')
    const pending = deferred()
    queryFiles.mockImplementationOnce(() => pending.promise)

    const query = useFileTableQuery(currentProject)
    query.fileTableData.value = [{ rawId: 101, name: 'project-a.xlsx' }]
    query.total.value = 1

    const refresh = query.refreshData()
    currentProject.value = ''
    await query.refreshData()

    expect(queryFiles.mock.calls[0][1].signal.aborted).toBe(true)
    expect(query.fileTableData.value).toEqual([])
    expect(query.total.value).toBe(0)
    expect(query.tableLoading.value).toBe(false)

    pending.resolve(fileResponse(101, 'project-a.xlsx', 'project-a'))
    await refresh

    expect(query.fileTableData.value).toEqual([])
    expect(query.total.value).toBe(0)
    expect(query.tableLoading.value).toBe(false)
  })
})
