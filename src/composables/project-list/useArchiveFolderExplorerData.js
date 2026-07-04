import { computed, reactive, ref, toValue } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { canDeleteArchiveFile } from '@/composables/project-list/archiveFileRowPresent.js'
import { getArchiveFileRecordId, normalizeArchiveQueryResult } from '@/composables/project-list/archiveFolderQuery.js'
import { sortArchiveFilesVerifyFailedFirst } from '@/composables/project-list/archiveFolderPresent.js'
import {
  buildOptimisticArchiveFileRow,
  isActiveFileProcessState
} from '@/utils/fileStatePresent.js'
import {
  cancelParseByFileId,
  deleteFileById,
  deleteProjectArchive,
  getProjectArchives,
  parseFileById,
  queryFiles
} from '@/services/file.service'

const ARCHIVE_CACHE_TTL = 12000

/** 归档 Tab：目录树、文件列表查询与 CRUD */
export function useArchiveFolderExplorerData(deps) {
  const archiveLoading = ref(false)
  const fileLoading = ref(false)
  const batchDeleteLoading = ref(false)
  const batchParseLoading = ref(false)

  const archiveList = ref([])
  const archiveFiles = ref([])
  const selectedRows = ref([])
  const fileTotal = ref(0)
  const selectedArchiveId = ref(null)
  const selectedArchiveName = ref('')
  const fileQuerySeq = ref(0)
  const archiveQueryCache = new Map()
  let currentFileQueryController = null
  let autoQuerySuppressed = false
  let keywordAutoQueryTimer = null
  let fileStatePollTimer = null

  const queryForm = reactive({
    keyword: '',
    verifyStatus: '',
    fileState: '',
    pageNum: 1,
    pageSize: 20
  })

  const treeProps = {
    label: 'name',
    children: 'children'
  }

  const projectNameText = computed(() => toValue(deps.projectName) || '未选择项目')
  const selectedArchive = computed(() => archiveList.value.find((item) => item.id === selectedArchiveId.value))
  const canDeleteSelectedArchive = computed(() => Boolean(toValue(deps.projectId) && selectedArchiveId.value))
  const showThumbnailColumn = computed(
    () => String(selectedArchive.value?.kind || '').toUpperCase() !== 'PROJECT_PARTY_SURVEY_SUMMARY'
  )
  const canBatchParse = computed(() =>
    selectedRows.value.some((row) => ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.fileState))
  )
  const canBatchDelete = computed(() => selectedRows.value.some((row) => canDeleteArchiveFile(row)))

  const treeData = computed(() => {
    const projectId = toValue(deps.projectId)
    if (!projectId || archiveList.value.length === 0) return []
    return [
      {
        id: `project-${projectId}`,
        name: projectNameText.value,
        nodeType: 'project',
        children: archiveList.value.map((item) => ({
          id: `archive-${item.id}`,
          archiveId: item.id,
          name: item.name,
          nodeType: 'archive'
        }))
      }
    ]
  })

  const getFileRecordId = getArchiveFileRecordId

  const applyArchiveFileRecords = (records) => sortArchiveFilesVerifyFailedFirst(records)

  const stopFileStatePolling = () => {
    if (fileStatePollTimer) {
      clearTimeout(fileStatePollTimer)
      fileStatePollTimer = null
    }
  }

  const startFileStatePolling = () => {
    stopFileStatePolling()
    const hasPending = archiveFiles.value.some((row) => isActiveFileProcessState(row.fileState))
    if (!hasPending) return
    const tick = async () => {
      if (!selectedArchiveId.value) return
      await fetchArchiveFiles({ force: true })
      const stillPending = archiveFiles.value.some((row) => isActiveFileProcessState(row.fileState))
      if (stillPending) {
        fileStatePollTimer = setTimeout(tick, 3000)
      }
    }
    fileStatePollTimer = setTimeout(tick, 3000)
  }

  const prependUploadedArchiveFiles = (entries = []) => {
    if (!entries.length) return
    const existingIds = new Set(archiveFiles.value.map((row) => String(getArchiveFileRecordId(row) || '')))
    const rows = []
    for (const entry of entries) {
      const fileId = entry?.fileId
      if (fileId == null || existingIds.has(String(fileId))) continue
      existingIds.add(String(fileId))
      rows.push(
        buildOptimisticArchiveFileRow({
          fileId,
          fileName: entry.fileName,
          fileContextType: entry.fileContextType,
          uploadUserName: entry.uploadUserName
        })
      )
    }
    if (!rows.length) return
    archiveFiles.value = applyArchiveFileRecords([...rows, ...archiveFiles.value])
    fileTotal.value += rows.length
  }

  const clearArchiveQueryCache = () => {
    archiveQueryCache.clear()
  }

  const resetFileQuery = () => {
    queryForm.keyword = ''
    queryForm.verifyStatus = ''
    queryForm.fileState = ''
    queryForm.pageNum = 1
    queryForm.pageSize = 20
  }

  const clearFiles = () => {
    selectedArchiveId.value = null
    selectedArchiveName.value = ''
    archiveFiles.value = []
    selectedRows.value = []
    fileTotal.value = 0
    resetFileQuery()
  }

  const abortCurrentFileQuery = () => {
    if (currentFileQueryController) {
      currentFileQueryController.abort()
      currentFileQueryController = null
    }
  }

  async function fetchArchiveFiles(options = {}) {
    const force = Boolean(options?.force)
    const projectId = toValue(deps.projectId)
    if (!projectId || !selectedArchiveId.value) {
      archiveFiles.value = []
      selectedRows.value = []
      fileTotal.value = 0
      return
    }

    const queryKey = JSON.stringify({
      projectId: Number(projectId),
      archiveId: Number(selectedArchiveId.value),
      pageNum: queryForm.pageNum,
      pageSize: queryForm.pageSize,
      keyword: queryForm.keyword || '',
      verifyStatus: queryForm.verifyStatus || '',
      fileState: queryForm.fileState || ''
    })

    if (!force && archiveQueryCache.has(queryKey)) {
      const cached = archiveQueryCache.get(queryKey)
      const isFresh = Date.now() - Number(cached?.cachedAt || 0) <= ARCHIVE_CACHE_TTL
      if (isFresh) {
        archiveFiles.value = applyArchiveFileRecords(cached.records)
        selectedRows.value = []
        fileTotal.value = cached.total
        return
      }
    }

    abortCurrentFileQuery()
    const queryController = new AbortController()
    currentFileQueryController = queryController

    fileLoading.value = true
    const currentSeq = ++fileQuerySeq.value
    try {
      const payload = {
        pageNum: queryForm.pageNum,
        pageSize: queryForm.pageSize,
        sortField: 'uploadTime',
        sortDirection: 'desc',
        projectId: Number(projectId),
        archiveId: Number(selectedArchiveId.value)
      }
      if (queryForm.keyword) payload.originalName = queryForm.keyword
      if (queryForm.verifyStatus) payload.verifyStatus = queryForm.verifyStatus
      if (queryForm.fileState) payload.fileState = queryForm.fileState

      const res = await queryFiles(payload, { signal: queryController.signal })
      if (currentSeq !== fileQuerySeq.value) return
      const parsed = normalizeArchiveQueryResult(res.data?.data)
      const records = applyArchiveFileRecords(parsed.records)
      archiveFiles.value = records
      selectedRows.value = []
      fileTotal.value = parsed.total
      archiveQueryCache.set(queryKey, {
        records,
        total: parsed.total,
        cachedAt: Date.now()
      })
    } catch (error) {
      if (currentSeq !== fileQuerySeq.value) return
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return
      console.error('查询归档文件失败:', error)
      archiveFiles.value = []
      selectedRows.value = []
      fileTotal.value = 0
      ElMessage.error('查询归档文件失败，请稍后重试')
    } finally {
      if (currentFileQueryController === queryController) {
        currentFileQueryController = null
      }
      if (currentSeq === fileQuerySeq.value) {
        fileLoading.value = false
      }
    }
  }

  const fetchArchives = async () => {
    const projectId = toValue(deps.projectId)
    if (!projectId) {
      archiveList.value = []
      clearFiles()
      return
    }

    archiveLoading.value = true
    try {
      const res = await getProjectArchives(projectId)
      if (res.data?.code === 200 && Array.isArray(res.data.data)) {
        const oldSelected = selectedArchiveId.value
        archiveList.value = res.data.data

        if (!archiveList.value.length) {
          clearFiles()
          return
        }

        const initialArchiveIdNum = Number(toValue(deps.initialArchiveId) || 0)
        const targetArchive =
          archiveList.value.find((item) => item.id === oldSelected) ||
          archiveList.value.find((item) => item.id === initialArchiveIdNum) ||
          archiveList.value[0]
        selectedArchiveId.value = targetArchive.id
        selectedArchiveName.value = targetArchive.name
        queryForm.pageNum = 1
        deps.syncUploadContextByArchive?.()
        fetchArchiveFiles()
        return
      }

      archiveList.value = []
      clearFiles()
      ElMessage.warning(res.data?.msg || '归档夹列表返回异常')
    } catch (error) {
      console.error('获取归档夹列表失败:', error)
      archiveList.value = []
      clearFiles()
      ElMessage.error('获取归档夹列表失败，请稍后重试')
    } finally {
      archiveLoading.value = false
    }
  }

  const selectArchiveForAudit = async (archiveId, archiveName) => {
    selectedArchiveId.value = archiveId
    selectedArchiveName.value = archiveName || ''
    queryForm.pageNum = 1
    deps.syncUploadContextByArchive?.()
    await fetchArchiveFiles({ force: true })
  }

  const confirmDeleteSelectedArchive = async () => {
    const projectId = toValue(deps.projectId)
    if (!projectId || !selectedArchiveId.value) return
    const name = selectedArchiveName.value || '该归档夹'
    try {
      await ElMessageBox.confirm(
        `确定删除归档夹「${name}」吗？删除后不可恢复。`,
        '删除归档夹',
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          confirmButtonClass: 'el-button--danger'
        }
      )
    } catch {
      return
    }
    await handleDeleteArchive({ archiveId: selectedArchiveId.value })
  }

  const handleDeleteArchive = async (nodeData) => {
    const projectId = toValue(deps.projectId)
    if (!projectId || !nodeData?.archiveId) return

    try {
      const res = await deleteProjectArchive(Number(projectId), Number(nodeData.archiveId))
      if (res.data?.code === 200) {
        ElMessage.success(res.data?.msg || '归档夹删除成功')
        if (selectedArchiveId.value === nodeData.archiveId) {
          selectedArchiveId.value = null
          selectedArchiveName.value = ''
        }
        fetchArchives()
      } else {
        ElMessage.warning(res.data?.msg || '归档夹删除失败')
      }
    } catch (error) {
      console.error('删除归档夹失败:', error)
      ElMessage.error(error?.response?.data?.msg || '删除归档夹失败')
    }
  }

  const handleNodeClick = (data) => {
    if (!data?.archiveId) return
    selectedArchiveId.value = data.archiveId
    selectedArchiveName.value = data.name
    selectedRows.value = []
    queryForm.pageNum = 1
    deps.syncUploadContextByArchive?.()
    fetchArchiveFiles()
  }

  const handleSelectionChange = (rows) => {
    selectedRows.value = rows
  }

  const triggerAutoQuery = () => {
    if (!selectedArchiveId.value) return
    queryForm.pageNum = 1
    fetchArchiveFiles()
  }

  const handleAutoQuery = (source) => {
    if (!selectedArchiveId.value || autoQuerySuppressed) return
    if (source === 'keyword') {
      if (keywordAutoQueryTimer) window.clearTimeout(keywordAutoQueryTimer)
      keywordAutoQueryTimer = window.setTimeout(() => {
        keywordAutoQueryTimer = null
        triggerAutoQuery()
      }, 350)
      return
    }
    triggerAutoQuery()
  }

  const handleSearch = () => {
    if (!selectedArchiveId.value) return
    queryForm.pageNum = 1
    fetchArchiveFiles()
  }

  const handleReset = () => {
    if (!selectedArchiveId.value) return
    autoQuerySuppressed = true
    resetFileQuery()
    autoQuerySuppressed = false
    fetchArchiveFiles()
  }

  const refreshFiles = () => {
    if (!selectedArchiveId.value) return
    fetchArchiveFiles({ force: true })
  }

  const handlePageChange = (page) => {
    queryForm.pageNum = page
    fetchArchiveFiles()
  }

  const handlePageSizeChange = (size) => {
    queryForm.pageSize = size
    queryForm.pageNum = 1
    fetchArchiveFiles()
  }

  const handleParse = async (row) => {
    const fileId = getFileRecordId(row)
    if (!fileId) {
      ElMessage.warning('缺少文件记录ID，无法解析')
      return
    }

    try {
      const res = await parseFileById(fileId)
      if (res.data?.code === 200) {
        ElMessage.success(res.data?.msg || '解析任务已提交')
        fetchArchiveFiles({ force: true })
      } else {
        ElMessage.warning(res.data?.msg || '解析请求被拒绝')
      }
    } catch (error) {
      console.error('启动解析失败:', error)
      ElMessage.error(error?.response?.data?.msg || '启动解析失败')
    }
  }

  const handleCancelParse = async (row) => {
    const fileId = getFileRecordId(row)
    if (!fileId) {
      ElMessage.warning('缺少文件记录ID，无法取消解析')
      return
    }

    try {
      const res = await cancelParseByFileId(fileId, 'user_cancel')
      if (res.data?.code === 200) {
        ElMessage.success(res.data?.msg || '已取消解析')
        fetchArchiveFiles({ force: true })
      } else {
        ElMessage.warning(res.data?.msg || '取消解析失败')
      }
    } catch (error) {
      console.error('取消解析失败:', error)
      ElMessage.error(error?.response?.data?.msg || '取消解析失败')
    }
  }

  const handleDeleteFile = async (row) => {
    if (!canDeleteArchiveFile(row)) {
      ElMessage.warning('文件处于上传、解析或审核中，暂不可删除')
      return
    }
    const fileId = getFileRecordId(row)
    if (!fileId) {
      ElMessage.warning('缺少文件记录ID，无法删除')
      return
    }

    try {
      const res = await deleteFileById(fileId)
      if (res.data?.code === 200) {
        ElMessage.success(res.data?.msg || '文件删除成功')
        fetchArchiveFiles({ force: true })
      } else {
        ElMessage.warning(res.data?.msg || '文件删除失败')
      }
    } catch (error) {
      console.error('删除文件失败:', error)
      ElMessage.error(error?.response?.data?.msg || '删除文件失败')
    }
  }

  const handleBatchDelete = async () => {
    if (!canBatchDelete.value) return
    const deletableRows = selectedRows.value.filter((row) => canDeleteArchiveFile(row))
    const skippedCount = selectedRows.value.length - deletableRows.length
    const ids = deletableRows.map((row) => getFileRecordId(row)).filter(Boolean)
    if (!ids.length) {
      ElMessage.warning('所选文件均处于上传、解析或审核中，暂不可删除')
      return
    }

    const confirmText =
      skippedCount > 0
        ? `确认删除选中的 ${ids.length} 个文件吗？另有 ${skippedCount} 个处于处理中的文件将跳过。删除后不可恢复。`
        : `确认删除选中的 ${ids.length} 个文件吗？删除后不可恢复。`

    try {
      await ElMessageBox.confirm(confirmText, '批量删除', {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }

    batchDeleteLoading.value = true
    try {
      await Promise.all(ids.map((id) => deleteFileById(id)))
      ElMessage.success('批量删除完成')
      await fetchArchiveFiles({ force: true })
    } catch (error) {
      console.error('批量删除失败:', error)
      ElMessage.error(error?.response?.data?.msg || '批量删除失败')
    } finally {
      batchDeleteLoading.value = false
    }
  }

  const handleBatchParse = async () => {
    if (!canBatchParse.value) return
    const parseRows = selectedRows.value.filter((row) =>
      ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.fileState)
    )
    const ids = parseRows.map((row) => getFileRecordId(row)).filter(Boolean)
    if (!ids.length) {
      ElMessage.warning('未找到可解析的文件记录ID')
      return
    }

    try {
      await ElMessageBox.confirm(`确认解析选中的 ${ids.length} 个可解析文件吗？`, '批量解析', {
        type: 'info',
        confirmButtonText: '立即解析',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }

    batchParseLoading.value = true
    try {
      await Promise.all(ids.map((id) => parseFileById(id)))
      ElMessage.success('批量解析任务已提交')
      await fetchArchiveFiles({ force: true })
    } catch (error) {
      console.error('批量解析失败:', error)
      ElMessage.error(error?.response?.data?.msg || '批量解析失败')
    } finally {
      batchParseLoading.value = false
    }
  }

  const applyInitialArchiveId = (archiveId) => {
    const targetId = Number(archiveId || 0)
    if (!targetId || !Array.isArray(archiveList.value) || archiveList.value.length === 0) return
    const target = archiveList.value.find((item) => Number(item.id) === targetId)
    if (!target || Number(selectedArchiveId.value) === targetId) return
    selectedArchiveId.value = target.id
    selectedArchiveName.value = target.name
    queryForm.pageNum = 1
    deps.syncUploadContextByArchive?.()
    fetchArchiveFiles()
  }

  const cleanupExplorer = () => {
    abortCurrentFileQuery()
    stopFileStatePolling()
    if (keywordAutoQueryTimer) {
      clearTimeout(keywordAutoQueryTimer)
      keywordAutoQueryTimer = null
    }
  }

  return {
    archiveLoading,
    fileLoading,
    batchDeleteLoading,
    batchParseLoading,
    archiveList,
    archiveFiles,
    selectedRows,
    fileTotal,
    selectedArchiveId,
    selectedArchiveName,
    selectedArchive,
    queryForm,
    treeProps,
    treeData,
    canDeleteSelectedArchive,
    showThumbnailColumn,
    canBatchParse,
    canBatchDelete,
    clearArchiveQueryCache,
    clearFiles,
    fetchArchiveFiles,
    prependUploadedArchiveFiles,
    startFileStatePolling,
    stopFileStatePolling,
    fetchArchives,
    selectArchiveForAudit,
    confirmDeleteSelectedArchive,
    handleDeleteArchive,
    handleNodeClick,
    handleSelectionChange,
    handleAutoQuery,
    handleSearch,
    handleReset,
    refreshFiles,
    handlePageChange,
    handlePageSizeChange,
    handleParse,
    handleCancelParse,
    handleDeleteFile,
    handleBatchDelete,
    handleBatchParse,
    applyInitialArchiveId,
    cleanupExplorer
  }
}
