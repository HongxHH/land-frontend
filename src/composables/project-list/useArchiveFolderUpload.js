import { computed, reactive, ref, toValue } from 'vue'
import { ElMessage } from 'element-plus'
import {
  aggregateUploadBytes,
  isUploadAbortError,
  resolveUploadFileUid,
  runConcurrentUploads,
  UPLOAD_FILE_STATUS,
} from '@/composables/file-upload/useConcurrentFileUpload.js'
import { useArchiveUploadMeter } from '@/composables/project-list/useArchiveUploadMeter.js'
import {
  processUploadFileSelection,
  resolveUploadHttpError,
  validateUploadBatchSize,
} from '@/utils/fileUploadLimit.js'

/** 归档 Tab：批量上传弹窗状态与提交（并发单文件上传） */
export function useArchiveFolderUpload(deps) {
  const uploadDialogVisible = ref(false)
  const uploadLoading = ref(false)
  const uploadAbortController = ref(null)
  const uploadForm = reactive({
    fileContextType: 'OTHER',
    phase: 1,
    archiveId: null,
  })
  const uploadFiles = ref([])
  const fileUploadStates = reactive(new Map())
  const uploadUploadedBytes = ref(0)
  const uploadTotalBytes = ref(0)
  const uploadProgress = ref(0)

  const {
    selectedTotalBytes,
    topFileGroups,
    uploadSpeedText,
    uploadEtaText,
    startUploadSpeedMeter,
    stopUploadSpeedMeter,
  } = useArchiveUploadMeter(uploadFiles, uploadUploadedBytes, uploadTotalBytes)

  const hasActiveUpload = computed(
    () =>
      uploadLoading.value ||
      Array.from(fileUploadStates.values()).some(
        (s) =>
          s.status === UPLOAD_FILE_STATUS.UPLOADING || s.status === UPLOAD_FILE_STATUS.PROCESSING
      )
  )

  const uploadPhaseLabel = computed(() => {
    if (!uploadLoading.value) return ''
    return '并发上传中 · 逐文件入库'
  })

  const syncAggregateProgress = () => {
    const agg = aggregateUploadBytes(fileUploadStates, uploadFiles.value)
    uploadUploadedBytes.value = agg.loaded
    uploadTotalBytes.value = agg.total
    uploadProgress.value = agg.progress
  }

  const applyFileState = (uid, state) => {
    if (!uid || !state) return
    fileUploadStates.set(uid, { ...state })
    syncAggregateProgress()
  }

  const getFileUploadState = (fileItem) => {
    const uid = resolveUploadFileUid(fileItem)
    return fileUploadStates.get(uid) || null
  }

  const handleUploadDialogBeforeClose = (done) => {
    if (!hasActiveUpload.value) {
      done()
      return
    }
    ElMessage.warning('仍有文件正在上传或入库，请稍候完成后再关闭。')
  }

  const clearUploadFiles = () => {
    uploadFiles.value = []
    fileUploadStates.clear()
    uploadProgress.value = 0
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0
  }

  const resetUploadForm = () => {
    clearUploadFiles()
    uploadLoading.value = false
    uploadAbortController.value = null
    uploadForm.phase = 1
    deps.syncUploadContextByArchive?.()
    stopUploadSpeedMeter()
  }

  const openUploadDialog = () => {
    const projectId = toValue(deps.projectId)
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    if (!projectId || !selectedArchiveId) {
      ElMessage.warning('请先选择归档夹')
      return
    }
    resetUploadForm()
    uploadDialogVisible.value = true
  }

  const handleUploadFileChange = (_, list) => {
    const { accepted, errors, warnings } = processUploadFileSelection(list)
    for (const message of errors) {
      ElMessage.error(message)
    }
    for (const message of warnings) {
      ElMessage.warning(message)
    }
    uploadFiles.value = accepted
    for (const item of accepted) {
      const uid = resolveUploadFileUid(item)
      if (!fileUploadStates.has(uid)) {
        fileUploadStates.set(uid, {
          status: UPLOAD_FILE_STATUS.PENDING,
          progress: 0,
          loaded: 0,
          total: Number(item?.raw?.size ?? item?.size ?? 0),
          fileId: null,
          error: null,
        })
      }
    }
  }

  const handleUploadFileRemove = (_, list) => {
    uploadFiles.value = list
    const uids = new Set(list.map((f) => resolveUploadFileUid(f)))
    for (const uid of fileUploadStates.keys()) {
      if (!uids.has(uid)) fileUploadStates.delete(uid)
    }
  }

  const removeOneUploadFile = (file) => {
    const uid = resolveUploadFileUid(file)
    uploadFiles.value = uploadFiles.value.filter((f) => resolveUploadFileUid(f) !== uid)
    fileUploadStates.delete(uid)
  }

  const buildUploadParams = () => {
    const projectId = toValue(deps.projectId)
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    const params = {
      projectId: Number(projectId),
      fileContextType: uploadForm.fileContextType,
    }
    if (params.fileContextType === 'SURVEY_REPORT') {
      params.phase = uploadForm.phase
    }
    if (params.fileContextType === 'OTHER') {
      params.archiveId = Number(selectedArchiveId)
    }
    return params
  }

  const runUploadBatch = async (filesToUpload) => {
    uploadAbortController.value?.abort()
    const ac = new AbortController()
    uploadAbortController.value = ac

    uploadLoading.value = true
    uploadProgress.value = 0
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0
    startUploadSpeedMeter()

    const result = await runConcurrentUploads({
      files: filesToUpload,
      buildParams: buildUploadParams,
      concurrency: 4,
      signal: ac.signal,
      onFileState: applyFileState,
      onFileSuccess: ({ fileId, fileName }) => {
        if (!fileId) return
        deps.onFileUploaded?.({
          fileId,
          fileName,
          fileContextType: uploadForm.fileContextType,
          uploadUserName: toValue(deps.uploadUserName) || '—',
        })
      },
    })

    uploadLoading.value = false
    uploadAbortController.value = null
    stopUploadSpeedMeter()
    syncAggregateProgress()

    return result
  }

  const handleBatchUpload = async () => {
    const projectId = toValue(deps.projectId)
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    if (!projectId || !selectedArchiveId) {
      ElMessage.warning('请先选择归档夹')
      return
    }
    if (!uploadFiles.value.length) {
      ElMessage.warning('请先选择文件')
      return
    }

    const batchCheck = validateUploadBatchSize(uploadFiles.value)
    if (!batchCheck.ok) {
      ElMessage.error(batchCheck.message)
      return
    }
    if (batchCheck.warning) {
      ElMessage.warning(batchCheck.warning)
    }

    try {
      const result = await runUploadBatch([...uploadFiles.value])

      if (result.cancelled) {
        ElMessage.info('已取消上传')
        return
      }

      if (result.successCount > 0) {
        ElMessage.success(
          result.errorCount > 0
            ? `上传完成：成功 ${result.successCount} 个，失败 ${result.errorCount} 个`
            : `全部 ${result.successCount} 个文件已入库，后台将自动后处理与解析`
        )
        await deps.onUploadSuccess?.()
      } else {
        ElMessage.warning('没有文件上传成功，请查看各行错误说明')
      }

      if (result.errorCount === 0 && result.successCount > 0) {
        uploadDialogVisible.value = false
        resetUploadForm()
      }
    } catch (error) {
      if (!isUploadAbortError(error)) {
        console.error('文件上传失败:', error)
        ElMessage.error(resolveUploadHttpError(error, '文件上传失败'))
      }
    }
  }

  const retryUploadFile = async (fileItem) => {
    if (uploadLoading.value) return
    const result = await runUploadBatch([fileItem])
    if (result.successCount > 0) {
      ElMessage.success('重试上传成功')
      await deps.onUploadSuccess?.()
    } else if (!result.cancelled) {
      ElMessage.error('重试上传失败')
    }
  }

  const handleCancelUpload = () => {
    if (uploadLoading.value) {
      uploadAbortController.value?.abort()
    }
    uploadDialogVisible.value = false
    resetUploadForm()
  }

  return {
    uploadDialogVisible,
    uploadForm,
    uploadFiles,
    uploadLoading,
    uploadProgress,
    uploadUploadedBytes,
    uploadTotalBytes,
    getFileUploadState,
    selectedTotalBytes,
    topFileGroups,
    uploadSpeedText,
    uploadEtaText,
    hasActiveUpload,
    uploadPhaseLabel,
    handleUploadDialogBeforeClose,
    clearUploadFiles,
    resetUploadForm,
    openUploadDialog,
    handleUploadFileChange,
    handleUploadFileRemove,
    removeOneUploadFile,
    handleBatchUpload,
    retryUploadFile,
    handleCancelUpload,
    stopUploadSpeedMeter,
    syncUploadFormArchiveId: (archiveId) => {
      uploadForm.archiveId = archiveId ? Number(archiveId) : null
    },
  }
}
