import { useBatchActions } from '@/composables/file-upload/useBatchActions'
import { useUploadDialog } from '@/composables/file-upload/useUploadDialog'
import { useParseActions } from '@/composables/file-upload/useParseActions'
import { useFileListActions } from '@/composables/file-upload/useFileListActions'
import { useBatchPoller } from '@/composables/file-upload/useBatchPoller'

export function useFileUploadOperations({ currentProject, projectOptions, refreshData, prependUploadedFiles }) {
  const { deleteFile, checkBatchStatus } = useFileListActions({
    currentProject,
    refreshData
  })

  const { startPolling, stopPolling, isPolling } = useBatchPoller(
    checkBatchStatus,
    refreshData,
    { onPollTick: () => refreshData(), pollIntervalMs: 3000 }
  )

  const {
    selectedRows,
    batchLoading,
    canBatchParse,
    handleSelectionChange,
    batchDelete,
    batchParse
  } = useBatchActions({ refreshData, startPolling })

  const {
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
    retryUploadFile
  } = useUploadDialog({
    currentProject,
    projectOptions,
    startPolling,
    refreshData,
    prependUploadedFiles
  })

  const { startProcessing, cancelProcessing } = useParseActions({ startPolling })

  return {
    deleteFile,
    stopPolling,
    isPolling,
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
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload,
    retryUploadFile,
    startProcessing,
    cancelProcessing
  }
}
