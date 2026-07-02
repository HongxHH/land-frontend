import { ref, reactive } from 'vue'
import { queryProjects } from '@/services/project.service'

const RECENT_LIST_PAGE_SIZE = 40
const SEARCH_PAGE_SIZE = 30

function mapProjectRecord(item) {
  const idStr = String(item.id ?? '')
  return {
    id: idStr,
    name: item.projectName || '',
    code: item.projectCode || `XM-${idStr.padStart(3, '0')}`,
    projectTime: item.projectTime || '',
    updateTime: item.updateTime || null
  }
}

function isAbortError(error) {
  return error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError'
}

function mergeProjectOptions(existing, incoming) {
  const map = new Map((existing || []).map((p) => [String(p.id), p]))
  for (const row of incoming || []) {
    map.set(String(row.id), row)
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.updateTime ? new Date(a.updateTime).getTime() : 0
    const tb = b.updateTime ? new Date(b.updateTime).getTime() : 0
    return tb - ta
  })
}

export function useProjectSelector() {
  const filterProject = ref('')
  const projectOptions = ref([])

  const currentProjectInfo = reactive({
    id: '',
    name: '请选择项目',
    code: '-',
    status: '-'
  })

  let listAbortController = null
  let searchAbortController = null

  const fetchProjects = async () => {
    listAbortController?.abort()
    listAbortController = new AbortController()
    try {
      const res = await queryProjects(
        {
          pageNum: 1,
          pageSize: RECENT_LIST_PAGE_SIZE,
          sortField: 'updateTime',
          sortDirection: 'desc'
        },
        { signal: listAbortController.signal }
      )
      if (res.data?.code === 200) {
        const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
        projectOptions.value = mergeProjectOptions(projectOptions.value, records.map(mapProjectRecord))
      }
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('获取项目列表失败:', error)
      }
    } finally {
      if (listAbortController?.signal.aborted) listAbortController = null
    }
  }

  /** 远程搜索（项目名称模糊匹配）；无关键词时返回近期列表 */
  const searchProjects = async (keyword) => {
    searchAbortController?.abort()
    searchAbortController = new AbortController()
    const trimmed = String(keyword || '').trim()
    try {
      const res = await queryProjects(
        {
          pageNum: 1,
          pageSize: SEARCH_PAGE_SIZE,
          sortField: 'updateTime',
          sortDirection: 'desc',
          ...(trimmed ? { projectName: trimmed } : {})
        },
        { signal: searchAbortController.signal }
      )
      if (res.data?.code !== 200) return projectOptions.value
      const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
      const mapped = records.map(mapProjectRecord)
      if (trimmed) {
        projectOptions.value = mergeProjectOptions(projectOptions.value, mapped)
        return mapped
      }
      projectOptions.value = mergeProjectOptions(projectOptions.value, mapped)
      return projectOptions.value.slice(0, SEARCH_PAGE_SIZE)
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('搜索项目失败:', error)
      }
      return []
    } finally {
      if (searchAbortController?.signal.aborted) searchAbortController = null
    }
  }

  /** 选中项不在缓存时按 ID 补拉一条 */
  const ensureProjectOption = async (projectId) => {
    const pid = String(projectId || '')
    if (!pid) return false
    if (projectOptions.value.some((p) => String(p.id) === pid)) return true
    try {
      const res = await queryProjects({
        projectId: Number(pid),
        pageNum: 1,
        pageSize: 1
      })
      if (res.data?.code !== 200) return false
      const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
      const row = records[0]
      if (!row) return false
      projectOptions.value = mergeProjectOptions(projectOptions.value, [mapProjectRecord(row)])
      return true
    } catch (error) {
      console.error('补拉项目信息失败:', error)
      return false
    }
  }

  const applyProjectMeta = (projectId) => {
    if (!projectId) return false
    const pid = String(projectId)
    const projectItem = projectOptions.value.find((p) => String(p.id) === pid)
    if (!projectItem) return false
    currentProjectInfo.id = pid
    currentProjectInfo.name = projectItem.name
    currentProjectInfo.code = projectItem.code || `XM-${pid.padStart(3, '0')}`
    currentProjectInfo.status = '已归档'
    return true
  }

  return {
    filterProject,
    projectOptions,
    currentProjectInfo,
    fetchProjects,
    searchProjects,
    ensureProjectOption,
    applyProjectMeta
  }
}
