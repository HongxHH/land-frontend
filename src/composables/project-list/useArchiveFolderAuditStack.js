import { computed, ref, toValue, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useCalibrationState } from '@/composables/file-upload/useCalibrationState'
import { useCalibrationViewer } from '@/composables/file-upload/useCalibrationViewer'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow'
import {
  useFileUploadConstants,
  useAuditSummaryDisplay,
} from '@/composables/file-upload/useFileUploadConstants'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import {
  getArchiveFileRecordId,
  normalizeArchiveQueryResult,
} from '@/composables/project-list/archiveFolderQuery.js'
import { queryPlanningReviewForms, queryCapacityIndicatorForms } from '@/services/project.service'
import { queryFiles } from '@/services/file.service'
import { getAuditStrategy, normalizeFileContextType } from '@/utils/fileContextTypeRegistry.js'

/**
 * 归档 Tab：实测校准工作区 + 规划复核/项目方汇总表审核弹窗编排
 */
export function useArchiveFolderAuditStack(deps) {
  const planningReviewAuditVisible = ref(false)
  const planningReviewAuditForm = ref(null)
  const partySummaryAuditVisible = ref(false)
  const partySummaryAuditFileRecordId = ref('')
  const partySummaryAuditInitialFile = ref(null)
  const capacityIndicatorAuditVisible = ref(false)
  const capacityIndicatorAuditFileRecordId = ref('')
  const capacityIndicatorAuditInitialFile = ref(null)
  const auditFocusUsageName = ref('')
  const auditFocusMode = ref('')
  const auditProjectId = ref('')

  const currentProject = computed(() => String(toValue(deps.projectId) || ''))

  const { usageCategoryMap, usageCategoryReverseMap } = useFileUploadConstants()
  const {
    roomInfoLoading,
    roomInfoData,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    roomSumInfo,
    showCalibration,
    calibrationLoading,
    currentFile,
    auditSummaryData,
  } = useCalibrationState()
  const { auditSummaryDisplay } = useAuditSummaryDisplay(auditSummaryData)
  const batchUpdateLoading = ref(false)

  const refreshArchiveFiles = (options) => {
    const fn = deps.refreshArchiveFiles
    if (typeof fn === 'function') return fn(options)
    return Promise.resolve()
  }

  const {
    currentViewType,
    isPreprocessAvailable,
    recognitionMdContent,
    recognitionMdLoading,
    calibrationPdfUrl,
    pdfLoading,
    realSurveyReportId,
    switchView,
    resetCalibrationState,
    openCalibration,
    pdfLoaded,
    pdfLoadError,
  } = useCalibrationViewer({
    currentProject,
    showCalibration,
    currentFile,
    calibrationLoading,
    roomInfoLoading,
    roomInfoData,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    roomSumInfo,
    auditSummaryData,
    usageCategoryMap,
  })

  const { recognitionHtml } = useRecognitionMarkdown({ recognitionMdContent })

  const {
    dirtyRowCount,
    isCellActive,
    isRowDirty,
    startCellEdit,
    commitActiveCell,
    notifyRowTouched,
    prepareRowForEdit,
    discardAllChanges,
    confirmDiscardUnsavedChanges,
    handleSaveDirtyRows,
    syncRoomRow,
    getRoomRowById,
    handleRefreshSurveyReport,
    handleSaveOcrSum,
    handleCreateRoom,
    handleDeleteRoom,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading,
    searchRoomInfosByPages,
    searchMissingUsageByPages,
    loadMoreRoomInfo,
    roomInfoHasMore,
    roomInfoLoadingMore,
    clearDirtyState,
  } = useRoomEditWorkflow({
    currentProject,
    realSurveyReportId,
    currentFile,
    roomInfoData,
    roomInfoLoading,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    batchUpdateLoading,
    usageCategoryMap,
    usageCategoryReverseMap,
    auditSummaryData,
    auditProjectId,
  })

  const resetAuditSurfaces = () => {
    showCalibration.value = false
    clearDirtyState()
    auditFocusUsageName.value = ''
    auditFocusMode.value = ''
    auditProjectId.value = ''
    currentFile.value = null
    resetCalibrationState()
    planningReviewAuditVisible.value = false
    planningReviewAuditForm.value = null
    partySummaryAuditVisible.value = false
    partySummaryAuditFileRecordId.value = ''
    partySummaryAuditInitialFile.value = null
    capacityIndicatorAuditVisible.value = false
    capacityIndicatorAuditFileRecordId.value = ''
    capacityIndicatorAuditInitialFile.value = null
  }

  const hasOpenAuditSurface = () =>
    showCalibration.value ||
    planningReviewAuditVisible.value ||
    partySummaryAuditVisible.value ||
    capacityIndicatorAuditVisible.value

  const openCalibrationForCurrentProject = async (row) => {
    auditProjectId.value = currentProject.value
    await openCalibration(row)
  }

  watch(currentProject, (nextProjectId, previousProjectId) => {
    if (!previousProjectId || nextProjectId === previousProjectId || !hasOpenAuditSurface()) return
    resetAuditSurfaces()
    ElMessage.warning('项目已切换，已关闭原项目的审核窗口')
  })

  watch(showCalibration, (visible) => {
    if (!visible) {
      auditProjectId.value = ''
    }
  })

  const openPlanningReviewAudit = async (row) => {
    const fileRecordId = getArchiveFileRecordId(row)
    if (!fileRecordId) {
      ElMessage.warning('缺少文件记录ID，无法打开规划复核审核')
      return
    }
    const projectId = toValue(deps.projectId)
    if (!projectId) {
      ElMessage.warning('缺少项目ID，无法打开规划复核审核')
      return
    }
    try {
      const res = await queryPlanningReviewForms({
        pageNum: 1,
        pageSize: 1,
        sortField: 'updateTime',
        sortDirection: 'desc',
        projectId: Number(projectId),
        fileRecordId: Number(fileRecordId),
      })
      if (res.data?.code !== 200) {
        ElMessage.warning(res.data?.msg || '查询规划复核表失败')
        return
      }
      const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
      const form = records[0]
      if (!form) {
        ElMessage.warning('当前文件暂无规划复核表数据，请稍后重试')
        return
      }
      planningReviewAuditForm.value = form
      planningReviewAuditVisible.value = true
    } catch (error) {
      console.error('打开规划复核审核失败:', error)
      ElMessage.error('打开规划复核审核失败，请稍后重试')
    }
  }

  const openProjectPartySummaryAudit = (row) => {
    const fileRecordId = getArchiveFileRecordId(row)
    if (!fileRecordId) {
      ElMessage.warning('缺少文件记录ID，无法打开项目方实测汇总表审核')
      return
    }
    partySummaryAuditFileRecordId.value = String(fileRecordId)
    partySummaryAuditInitialFile.value = { ...row, id: fileRecordId }
    partySummaryAuditVisible.value = true
  }

  const openCapacityIndicatorAudit = async (row) => {
    const fileRecordId = getArchiveFileRecordId(row)
    if (!fileRecordId) {
      ElMessage.warning('缺少文件记录ID，无法打开容量指标核查审核')
      return
    }
    const projectId = toValue(deps.projectId)
    if (!projectId) {
      ElMessage.warning('缺少项目ID，无法打开容量指标核查审核')
      return
    }
    try {
      const res = await queryCapacityIndicatorForms({
        pageNum: 1,
        pageSize: 1,
        sortField: 'updateTime',
        sortDirection: 'desc',
        projectId: Number(projectId),
        fileRecordId: Number(fileRecordId),
      })
      if (res.data?.code !== 200) {
        ElMessage.warning(res.data?.msg || '查询容量指标核查表失败')
        return
      }
      const records = Array.isArray(res.data?.data?.records) ? res.data.data.records : []
      if (!records[0]) {
        ElMessage.warning('当前文件暂无容量指标核查数据，请稍后重试')
        return
      }
      capacityIndicatorAuditFileRecordId.value = String(fileRecordId)
      capacityIndicatorAuditInitialFile.value = { ...row, id: fileRecordId }
      capacityIndicatorAuditVisible.value = true
    } catch (error) {
      console.error('打开容量指标核查审核失败:', error)
      ElMessage.error('打开容量指标核查审核失败，请稍后重试')
    }
  }

  const handleAudit = async (row, options = {}) => {
    const fileId = getArchiveFileRecordId(row)
    if (!fileId) {
      ElMessage.warning('缺少文件记录ID，无法审核')
      return
    }
    if (!options.preserveFocus) {
      auditFocusUsageName.value = ''
      auditFocusMode.value = ''
    }
    const selectedArchive = toValue(deps.selectedArchive)
    const contextType = normalizeFileContextType(row?.fileContextType || selectedArchive?.kind)
    const strategy = getAuditStrategy(contextType)

    if (strategy === 'contract') {
      const cb = deps.onContractArchiveAudit
      if (typeof cb === 'function') {
        await Promise.resolve(cb(row))
        return
      }
      ElMessage.warning('合同工作区未接入，请前往「合同及地块信息」页签处理')
      return
    }
    if (strategy === 'planning_review') {
      await openPlanningReviewAudit(row)
      return
    }
    if (strategy === 'party_summary') {
      openProjectPartySummaryAudit(row)
      return
    }
    if (strategy === 'capacity_indicator') {
      await openCapacityIndicatorAudit(row)
      return
    }

    const currentRow = {
      ...row,
      rawId: fileId,
      name: row?.originalName || row?.name || '-',
      fileId: row?.fileId || row?.gridfsId || row?.sourceGridfsId || '',
      preprocessGridfsId: row?.preprocessGridfsId || '',
      status: row?.fileState || row?.status || '',
    }
    if (!currentRow.fileId) {
      ElMessage.warning('该文件缺少可预览的源文件ID，无法进入审核')
      return
    }
    await openCalibrationForCurrentProject(currentRow)
  }

  const findFileByRecordIdDirect = async (targetFileRecordId) => {
    const targetId = String(targetFileRecordId || '')
    const projectId = toValue(deps.projectId)
    if (!targetId || !projectId) return null

    try {
      const directRes = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        sortField: 'uploadTime',
        sortDirection: 'desc',
        projectId: Number(projectId),
        fileId: targetId,
      })
      const directParsed = normalizeArchiveQueryResult(directRes.data?.data)
      const directRow = directParsed.records?.[0]
      if (!directRow) return null
      return { row: directRow }
    } catch (error) {
      console.error('按 fileId 直查文件失败:', error)
      return null
    }
  }

  const findFileAcrossArchives = async (targetFileRecordId) => {
    const targetId = String(targetFileRecordId || '')
    const projectId = toValue(deps.projectId)
    const archiveList = toValue(deps.archiveList) || []
    if (!targetId || !projectId || !archiveList.length) return null

    try {
      const directRes = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        sortField: 'uploadTime',
        sortDirection: 'desc',
        projectId: Number(projectId),
        fileId: targetId,
      })
      const directParsed = normalizeArchiveQueryResult(directRes.data?.data)
      const directRow = directParsed.records?.[0]
      if (directRow) {
        const archiveId = Number(directRow.archiveId || 0)
        const archive = archiveList.find((item) => Number(item.id) === archiveId)
        return {
          archiveId: archive?.id || archiveId || null,
          archiveName: archive?.name || '',
          row: directRow,
        }
      }
    } catch (error) {
      console.error('按 fileId 直查文件失败，回退遍历归档夹:', error)
    }

    for (const archive of archiveList) {
      try {
        const res = await queryFiles({
          pageNum: 1,
          pageSize: 200,
          sortField: 'uploadTime',
          sortDirection: 'desc',
          projectId: Number(projectId),
          archiveId: Number(archive.id),
        })
        const parsed = normalizeArchiveQueryResult(res.data?.data)
        const found = parsed.records.find(
          (item) => String(getArchiveFileRecordId(item)) === targetId
        )
        if (found) {
          return {
            archiveId: archive.id,
            archiveName: archive.name,
            row: found,
          }
        }
      } catch (error) {
        console.error('遍历归档夹定位文件失败:', error)
      }
    }

    return null
  }

  const openAuditByFileRecordId = async (targetFileRecordId, options = {}) => {
    const targetId = String(targetFileRecordId || '')
    const force = Boolean(options?.force)
    const skipArchiveNavigation = options?.skipArchiveNavigation !== false
    const focusUsageName = String(options?.focusUsageName || '').trim()
    const focusMode = String(options?.focusMode || '').trim()
    auditFocusUsageName.value = focusUsageName
    auditFocusMode.value = focusMode
    const projectId = toValue(deps.projectId)
    const active = toValue(deps.active)
    if (!targetId || !projectId) return
    if (!active && !force) return

    const archiveFiles = toValue(deps.archiveFiles) || []
    const localFound = archiveFiles.find(
      (item) => String(getArchiveFileRecordId(item)) === targetId
    )
    if (localFound) {
      await handleAudit(localFound, { preserveFocus: true })
      deps.onAuditConsumed?.()
      return
    }

    let located = null
    if (skipArchiveNavigation) {
      located = await findFileByRecordIdDirect(targetId)
    } else {
      const archiveList = toValue(deps.archiveList) || []
      if (!archiveList.length && typeof deps.fetchArchives === 'function') {
        await deps.fetchArchives()
      }
      located = await findFileAcrossArchives(targetId)
    }

    if (!located?.row) {
      ElMessage.warning('未在当前项目归档中找到对应文件，无法直接打开审核')
      deps.onAuditConsumed?.()
      return
    }

    if (!skipArchiveNavigation) {
      const currentArchiveId = toValue(deps.selectedArchiveId)
      if (located.archiveId && Number(currentArchiveId) !== Number(located.archiveId)) {
        if (typeof deps.selectArchiveForAudit === 'function') {
          await deps.selectArchiveForAudit(located.archiveId, located.archiveName)
        }
      }
    }

    await handleAudit(located.row, { preserveFocus: true })
    deps.onAuditConsumed?.()
  }

  const handleCalibrationBack = () => {
    showCalibration.value = false
  }

  const handleCalibrationClosed = async () => {
    resetAuditSurfaces()
    await refreshArchiveFiles()
    deps.onAuditReturnNavigate?.()
  }

  return {
    showCalibration,
    currentFile,
    dirtyRowCount,
    batchUpdateLoading,
    isCellActive,
    isRowDirty,
    startCellEdit,
    commitActiveCell,
    notifyRowTouched,
    prepareRowForEdit,
    discardAllChanges,
    confirmDiscardUnsavedChanges,
    handleSaveDirtyRows,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading,
    calibrationLoading,
    currentViewType,
    isPreprocessAvailable,
    switchView,
    pdfLoading,
    calibrationPdfUrl,
    pdfLoaded,
    pdfLoadError,
    recognitionMdLoading,
    recognitionHtml,
    auditSummaryData,
    auditSummaryDisplay,
    roomInfoData,
    roomInfoLoading,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    searchRoomInfosByPages,
    searchMissingUsageByPages,
    loadMoreRoomInfo,
    roomInfoHasMore,
    roomInfoLoadingMore,
    syncRoomRow,
    getRoomRowById,
    handleRefreshSurveyReport,
    handleSaveOcrSum,
    handleCreateRoom,
    handleDeleteRoom,
    handleCalibrationBack,
    handleCalibrationClosed,
    planningReviewAuditVisible,
    planningReviewAuditForm,
    partySummaryAuditVisible,
    partySummaryAuditFileRecordId,
    partySummaryAuditInitialFile,
    capacityIndicatorAuditVisible,
    capacityIndicatorAuditFileRecordId,
    capacityIndicatorAuditInitialFile,
    handleAudit,
    openAuditByFileRecordId,
    auditFocusUsageName,
    auditFocusMode,
  }
}
