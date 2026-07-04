import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  aggregateUploadBytes,
  isUploadAbortError,
  resolveUploadFileUid,
  runConcurrentUploads,
  UPLOAD_FILE_STATUS,
} from '@/composables/file-upload/useConcurrentFileUpload.js'
import {
  collectFilesFromDataTransferAsync,
  collectFilesFromInput,
  extractRootFolderNameFromFiles,
} from '@/utils/localFolderCollector.js'
import {
  getSelectedUploadEntries,
  groupScannedEntries,
  scanLocalFolderFiles,
} from '@/utils/localFolderFileMatcher.js'
import { getFileContextLabel } from '@/utils/fileContextTypeRegistry.js'

/** 新建项目：智能文件夹扫描与批量上传 */
export function useSmartFolderImport() {
  const scannedEntries = ref([])
  const surveyPhase = ref(1)
  const uploadLoading = ref(false)
  const uploadAbortController = ref(null)
  const fileUploadStates = reactive(new Map())
  const uploadUploadedBytes = ref(0)
  const uploadTotalBytes = ref(0)
  const uploadProgress = ref(0)
  const scanLoading = ref(false)
  const importedRootFolderName = ref('')

  const groupedEntries = computed(() => groupScannedEntries(scannedEntries.value))

  const selectedCount = computed(() => getSelectedUploadEntries(scannedEntries.value).length)

  const hasScanResult = computed(() => scannedEntries.value.length > 0)

  const resetScan = () => {
    scannedEntries.value = []
    importedRootFolderName.value = ''
    surveyPhase.value = 1
    fileUploadStates.clear()
    uploadLoading.value = false
    uploadAbortController.value = null
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0
    uploadProgress.value = 0
  }

  const ingestFiles = (files) => {
    const list = Array.from(files || [])
    if (!list.length) {
      ElMessage.warning('未读取到任何文件，请选择包含业务文件的文件夹')
      importedRootFolderName.value = ''
      return ''
    }
    importedRootFolderName.value = extractRootFolderNameFromFiles(list)
    scannedEntries.value = scanLocalFolderFiles(list)
    fileUploadStates.clear()
    if (!scannedEntries.value.length) {
      ElMessage.warning('文件夹中未找到可识别的 PDF/Excel 业务文件')
    }
    return importedRootFolderName.value
  }

  const handleFolderInputChange = (event) => {
    const input = event?.target
    ingestFiles(collectFilesFromInput(input))
    if (input) input.value = ''
  }

  const handleFolderDrop = async (event) => {
    event?.preventDefault?.()
    scanLoading.value = true
    try {
      const files = await collectFilesFromDataTransferAsync(event?.dataTransfer)
      ingestFiles(files)
    } catch (error) {
      console.error('递归读取文件夹失败:', error)
      ElMessage.error('读取文件夹失败，请重试或点击「选择项目文件夹」')
    } finally {
      scanLoading.value = false
    }
  }

  const setEntrySelected = (entryId, selected) => {
    const entry = scannedEntries.value.find((item) => item.id === entryId)
    if (!entry) return
    entry.selected = selected
  }

  const setEntryContextType = (entryId, fileContextType) => {
    const entry = scannedEntries.value.find((item) => item.id === entryId)
    if (!entry) return
    entry.fileContextType = fileContextType || null
    entry.selected = Boolean(fileContextType)
  }

  const syncAggregateProgress = (uploadItems) => {
    const agg = aggregateUploadBytes(fileUploadStates, uploadItems)
    uploadUploadedBytes.value = agg.loaded
    uploadTotalBytes.value = agg.total
    uploadProgress.value = agg.progress
  }

  const applyFileState = (uid, state, uploadItems) => {
    if (!uid || !state) return
    fileUploadStates.set(uid, { ...state })
    syncAggregateProgress(uploadItems)
  }

  const getFileUploadState = (fileItem) => {
    const uid = resolveUploadFileUid(fileItem)
    return fileUploadStates.get(uid) || null
  }

  const buildUploadItems = () => {
    return getSelectedUploadEntries(scannedEntries.value).map((entry) => ({
      uid: entry.id,
      name: entry.displayName,
      raw: entry.file,
      fileContextType: entry.fileContextType,
      relativePath: entry.relativePath,
    }))
  }

  const uploadToProject = async (projectId) => {
    const numericProjectId = Number(projectId)
    if (!numericProjectId) {
      ElMessage.warning('缺少项目 ID，无法上传')
      return { success: false, successCount: 0, errorCount: 0 }
    }

    const uploadItems = buildUploadItems()
    if (!uploadItems.length) {
      ElMessage.warning('请至少选择一个要上传的文件')
      return { success: false, successCount: 0, errorCount: 0 }
    }

    uploadAbortController.value?.abort()
    const ac = new AbortController()
    uploadAbortController.value = ac
    uploadLoading.value = true
    uploadProgress.value = 0
    uploadUploadedBytes.value = 0
    uploadTotalBytes.value = 0

    for (const item of uploadItems) {
      const uid = resolveUploadFileUid(item)
      fileUploadStates.set(uid, {
        status: UPLOAD_FILE_STATUS.PENDING,
        progress: 0,
        loaded: 0,
        total: Number(item.raw?.size || 0),
        fileId: null,
        error: null,
      })
    }
    syncAggregateProgress(uploadItems)

    try {
      const result = await runConcurrentUploads({
        files: uploadItems,
        buildParams: (fileItem) => {
          const params = {
            projectId: numericProjectId,
            fileContextType: fileItem.fileContextType,
          }
          if (fileItem.fileContextType === 'SURVEY_REPORT') {
            params.phase = surveyPhase.value
          }
          return params
        },
        concurrency: 4,
        signal: ac.signal,
        onFileState: (uid, state) => applyFileState(uid, state, uploadItems),
      })

      if (result.cancelled) {
        ElMessage.info('已取消上传')
        return {
          success: false,
          successCount: result.successCount,
          errorCount: result.errorCount,
          cancelled: true,
        }
      }

      if (result.successCount > 0) {
        ElMessage.success(
          result.errorCount > 0
            ? `上传完成：成功 ${result.successCount} 个，失败 ${result.errorCount} 个`
            : `全部 ${result.successCount} 个文件已入库，后台将自动后处理与解析`
        )
      } else {
        ElMessage.warning('没有文件上传成功')
      }

      return {
        success: result.successCount > 0 && result.errorCount === 0,
        successCount: result.successCount,
        errorCount: result.errorCount,
      }
    } catch (error) {
      if (!isUploadAbortError(error)) {
        console.error('智能文件夹上传失败:', error)
        ElMessage.error(error?.message || '文件上传失败')
      }
      return { success: false, successCount: 0, errorCount: uploadItems.length }
    } finally {
      uploadLoading.value = false
      uploadAbortController.value = null
    }
  }

  const cancelUpload = () => {
    uploadAbortController.value?.abort()
  }

  const getGroupLabel = (typeKey) => {
    if (typeKey === 'UNMATCHED') return '未识别'
    return getFileContextLabel(typeKey)
  }

  return {
    scannedEntries,
    groupedEntries,
    surveyPhase,
    uploadLoading,
    uploadProgress,
    uploadUploadedBytes,
    uploadTotalBytes,
    scanLoading,
    importedRootFolderName,
    selectedCount,
    hasScanResult,
    resetScan,
    handleFolderInputChange,
    handleFolderDrop,
    setEntrySelected,
    setEntryContextType,
    getFileUploadState,
    uploadToProject,
    cancelUpload,
    getGroupLabel,
    buildUploadItems,
  }
}
