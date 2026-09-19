import { nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectOptions } from '@/composables/file-upload/useProjectOptions'
import { useFileTableQuery } from '@/composables/file-upload/useFileTableQuery'
import {
  useFileUploadConstants,
  useAuditSummaryDisplay,
} from '@/composables/file-upload/useFileUploadConstants'
import { useFileUploadOperations } from '@/composables/file-upload/useFileUploadOperations'
import { useCalibrationState } from '@/composables/file-upload/useCalibrationState'
import { useCalibrationViewer } from '@/composables/file-upload/useCalibrationViewer'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import { useCurrentProjectSession } from '@/composables/file-upload/useCurrentProjectSession'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow'

export function useFileUploadPage() {
  const route = useRoute()
  const router = useRouter()
  const pendingAuditFileId = ref('')
  const { statusMap, usageCategoryMap, usageCategoryReverseMap } = useFileUploadConstants()
  const tableRowClassName = () => 'no-hover-highlight'

  const {
    projectOptions,
    currentProject,
    showCreateProject,
    newProjectForm,
    fetchProjectList,
    handleCreateProject,
  } = useProjectOptions()

  const {
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
  } = useFileTableQuery(currentProject)

  const {
    deleteFile,
    stopPolling,
    selectedRows,
    batchLoading,
    canBatchParse,
    handleSelectionChange,
    clearBatchSelection,
    batchDelete,
    batchParse,
    uploadDialogVisible,
    tempUploadType,
    uploadPhase,
    tempFiles,
    uploadLoading,
    getFileUploadState,
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload,
    retryUploadFile,
    startProcessing,
    cancelProcessing,
  } = useFileUploadOperations({
    currentProject,
    projectOptions,
    refreshData,
    prependUploadedFiles,
  })

  const batchUpdateLoading = ref(false)

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

  const {
    currentViewType,
    preprocessGridfsId: _preprocessGridfsId,
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

  useCurrentProjectSession({
    currentProject,
    fetchProjectList,
    refreshData,
    resetFilter,
    fileTableData,
    stopPolling,
    calibrationPdfUrl,
    clearUploadSelection,
    clearBatchSelection,
  })

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
    clearDirtyState,
    searchRoomInfosByPages,
    searchMissingUsageByPages,
    loadMoreRoomInfo,
    roomInfoHasMore,
    roomInfoLoadingMore,
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
  })

  // 从归档页跳转到审核页时，自动带入项目ID
  watch(
    () => route.query.projectId,
    (projectId) => {
      if (projectId) {
        currentProject.value = String(projectId)
      }
    },
    { immediate: true }
  )

  watch(
    () => route.query.fileRecordId,
    (fileRecordId) => {
      pendingAuditFileId.value = fileRecordId ? String(fileRecordId) : ''
    },
    { immediate: true }
  )

  watch([fileTableData, pendingAuditFileId], async ([rows, fileId]) => {
    if (!fileId || !Array.isArray(rows) || rows.length === 0) return
    const targetRow = rows.find((item) => String(item.rawId) === String(fileId))
    if (!targetRow) return

    await nextTick()
    openCalibration(targetRow)
    pendingAuditFileId.value = ''

    const nextQuery = { ...route.query }
    delete nextQuery.fileRecordId
    delete nextQuery.openAudit
    router.replace({ query: nextQuery })
  })

  return {
    statusMap,
    tableRowClassName,
    projectOptions,
    currentProject,
    showCreateProject,
    newProjectForm,
    handleCreateProject,
    fileTableData,
    tableLoading,
    filterStatus,
    filterFileName,
    filterFileType,
    currentPage,
    pageSize,
    total,
    refreshData,
    resetFilter,
    handleSizeChange,
    handleCurrentChange,
    handleRefresh,
    selectedRows,
    batchLoading,
    canBatchParse,
    handleSelectionChange,
    batchDelete,
    batchParse,
    uploadDialogVisible,
    tempUploadType,
    uploadPhase,
    tempFiles,
    uploadLoading,
    getFileUploadState,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload,
    retryUploadFile,
    openCalibration,
    startProcessing,
    cancelProcessing,
    deleteFile,
    showCalibration,
    resetCalibrationState,
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
    syncRoomRow,
    getRoomRowById,
    handleRefreshSurveyReport,
    handleSaveOcrSum,
    handleCreateRoom,
    handleDeleteRoom,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading,
    clearDirtyState,
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
  }
}
