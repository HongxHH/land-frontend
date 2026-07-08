import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { queryFiles } from '@/services/file.service'
import {
  buildOptimisticUploadTableRow,
  formatUploadTimeForDisplay,
  sortFilesAttentionFirst,
} from '@/utils/fileStatePresent.js'

function mapApiFileToTableRow(item) {
  let fileType = 'survey'
  if (item.fileContextType === 'CONTRACT') fileType = 'contract'
  if (item.fileContextType === 'SURVEY_REPORT') fileType = 'survey'

  return {
    id: item.id,
    rawId: item.id,
    fileId: item.gridfsId,
    preprocessGridfsId: item.preprocessGridfsId || '',
    name: item.originalName || '未命名文件',
    uploadTime: item.uploadTime ? formatUploadTimeForDisplay(item.uploadTime) : '未知时间',
    type: fileType,
    phase: item.phase ?? null,
    fileContextType: item.fileContextType || null,
    autoParseQueuedAt: item.autoParseQueuedAt ?? null,
    status: item.fileState || 'WAITING_PARSE',
    isVerified: item.isVerified,
    errorMessage: item.parseMessage,
    thumbnailUrl: item.thumbGridfsId
      ? `/api/file/download/gridfs/${item.thumbGridfsId}`
      : 'https://placehold.co/150/e0e0e0/808080?text=NoThumb',
  }
}

export function useFileTableQuery(currentProject) {
  const fileTableData = ref([])
  const tableLoading = ref(false)
  const fileQuerySeq = ref(0)
  let currentFileQueryController = null
  let lastProjectId = null

  const filterStatus = ref('')
  const filterFileName = ref('')
  const filterFileType = ref('')

  const currentPage = ref(1)
  const pageSize = ref(20)
  const total = ref(0)

  const prependUploadedFiles = (entries = []) => {
    if (!entries.length) return
    const existingIds = new Set(fileTableData.value.map((row) => String(row.rawId)))
    const toPrepend = []
    for (const entry of entries) {
      const fileId = entry?.fileId
      if (fileId == null || existingIds.has(String(fileId))) continue
      existingIds.add(String(fileId))
      toPrepend.push(
        buildOptimisticUploadTableRow({
          fileId,
          fileName: entry.fileName,
          fileContextType: entry.fileContextType,
          phase: entry.phase ?? null,
        })
      )
    }
    if (!toPrepend.length) return
    fileTableData.value = sortFilesAttentionFirst([...toPrepend, ...fileTableData.value])
    total.value += toPrepend.length
  }

  const abortCurrentFileQuery = () => {
    if (!currentFileQueryController) return
    currentFileQueryController.abort()
    currentFileQueryController = null
  }

  const isCanceledQuery = (error) =>
    error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED'

  const refreshData = async () => {
    const projectId = currentProject.value
    if (!projectId) {
      fileQuerySeq.value += 1
      abortCurrentFileQuery()
      lastProjectId = null
      fileTableData.value = []
      total.value = 0
      tableLoading.value = false
      return
    }

    const projectKey = String(projectId)
    if (projectKey !== lastProjectId) {
      lastProjectId = projectKey
      fileTableData.value = []
      total.value = 0
    }

    abortCurrentFileQuery()
    const queryController = new AbortController()
    currentFileQueryController = queryController
    const currentSeq = ++fileQuerySeq.value
    tableLoading.value = true
    try {
      const queryParams = {
        projectId,
        originalName: filterFileName.value || null,
        fileContextType: filterFileType.value || null,
        fileState: filterStatus.value || null,
        pageNum: currentPage.value,
        pageSize: pageSize.value,
      }
      const res = await queryFiles(queryParams, { signal: queryController.signal })
      if (currentSeq !== fileQuerySeq.value) return

      const list = []
      let pageTotal = 0
      let rawList = []

      if (Array.isArray(res.data.data)) {
        rawList = res.data.data
      } else if (res.data.data && Array.isArray(res.data.data.records)) {
        rawList = res.data.data.records
        pageTotal = res.data.data.total || 0
      } else if (res.data.data && Array.isArray(res.data.data.rows)) {
        rawList = res.data.data.rows
        pageTotal = res.data.data.total || 0
      } else if (res.data.data && Array.isArray(res.data.data.list)) {
        rawList = res.data.data.list
        pageTotal = res.data.data.total || 0
      }

      total.value = pageTotal

      if (res.data.code === 200) {
        rawList.forEach((item) => {
          list.push(mapApiFileToTableRow(item))
        })
      }

      fileTableData.value = sortFilesAttentionFirst(list)
    } catch (error) {
      if (currentSeq !== fileQuerySeq.value || isCanceledQuery(error)) return
      console.error(error)
    } finally {
      if (currentFileQueryController === queryController) {
        currentFileQueryController = null
      }
      if (currentSeq === fileQuerySeq.value) {
        tableLoading.value = false
      }
    }
  }

  const resetFilter = () => {
    filterFileName.value = ''
    filterFileType.value = ''
    filterStatus.value = ''
    refreshData()
  }

  const handleSizeChange = (val) => {
    pageSize.value = val
    currentPage.value = 1
    refreshData()
  }

  const handleCurrentChange = (val) => {
    currentPage.value = val
    refreshData()
  }

  const handleRefresh = () => {
    refreshData()
    ElMessage.info('正在刷新数据...')
  }

  return {
    fileTableData,
    tableLoading,
    filterStatus,
    filterFileName,
    filterFileType,
    currentPage,
    pageSize,
    total,
    refreshData,
    prependUploadedFiles,
    resetFilter,
    handleSizeChange,
    handleCurrentChange,
    handleRefresh,
  }
}
