import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  isUploadAbortError,
  resolveUploadFileUid,
  runConcurrentUploads,
  UPLOAD_FILE_STATUS,
} from '@/composables/file-upload/useConcurrentFileUpload.js'
import { uploadFile as defaultUploadApi } from '@/services/file.service'
import {
  processUploadFileSelection,
  resolveUploadHttpError,
  validateUploadBatchSize,
} from '@/utils/fileUploadLimit.js'

export function useUploadDialog({
  currentProject,
  projectOptions,
  startPolling,
  refreshData,
  prependUploadedFiles,
  uploadApi = defaultUploadApi,
}) {
  const uploadDialogVisible = ref(false)
  const tempUploadType = ref('SURVEY_REPORT')
  const uploadPhase = ref(1)
  const tempFiles = ref([])
  const uploadRef = ref(null)
  const uploadLoading = ref(false)
  const fileUploadStates = reactive(new Map())

  const clearUploadSelection = () => {
    tempFiles.value = []
    fileUploadStates.clear()
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
  }

  const openUploadDialog = () => {
    clearUploadSelection()
    uploadPhase.value = 1
    uploadDialogVisible.value = true
  }

  const handleFileChange = (_, fileList) => {
    const { accepted, errors, warnings } = processUploadFileSelection(fileList)
    for (const message of errors) {
      ElMessage.error(message)
    }
    for (const message of warnings) {
      ElMessage.warning(message)
    }
    tempFiles.value = accepted
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

  const handleFileRemove = (_, fileList) => {
    tempFiles.value = fileList
    const uids = new Set(fileList.map((f) => resolveUploadFileUid(f)))
    for (const uid of fileUploadStates.keys()) {
      if (!uids.has(uid)) fileUploadStates.delete(uid)
    }
  }

  const handleUploadDialogClosed = () => {
    clearUploadSelection()
    uploadLoading.value = false
  }

  const applyFileState = (uid, state) => {
    if (!uid || !state) return
    fileUploadStates.set(uid, { ...state })
  }

  const getFileUploadState = (fileItem) => {
    const uid = resolveUploadFileUid(fileItem)
    return fileUploadStates.get(uid) || null
  }

  const buildUploadParams = () => ({
    projectId: currentProject.value,
    fileContextType: tempUploadType.value,
    phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : undefined,
  })

  const executeUpload = async (filesToUpload) => {
    const batchCheck = validateUploadBatchSize(filesToUpload)
    if (!batchCheck.ok) {
      ElMessage.error(batchCheck.message)
      return { successCount: 0, errorCount: filesToUpload.length, cancelled: false }
    }
    if (batchCheck.warning) {
      ElMessage.warning(batchCheck.warning)
    }

    uploadLoading.value = true
    try {
      const result = await runConcurrentUploads({
        files: filesToUpload,
        buildParams: buildUploadParams,
        concurrency: 4,
        uploadApi,
        onFileState: applyFileState,
        onFileSuccess: ({ fileId, fileName }) => {
          if (!fileId || typeof prependUploadedFiles !== 'function') return
          prependUploadedFiles([
            {
              fileId,
              fileName,
              fileContextType: tempUploadType.value,
              phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : null,
            },
          ])
        },
      })

      if (result.successCount > 0) {
        if (typeof refreshData === 'function') refreshData()
        startPolling?.()
      }

      if (result.errorCount > 0 && result.successCount > 0) {
        ElMessage.warning(
          `部分文件上传失败：成功 ${result.successCount} 个，失败 ${result.errorCount} 个`
        )
      } else if (result.successCount > 0) {
        ElMessage.success(`${result.successCount} 个文件已入库，正在后台后处理与解析`)
      } else if (!result.cancelled) {
        ElMessage.error('文件上传失败，请查看各行错误说明')
      }

      return result
    } catch (err) {
      if (!isUploadAbortError(err)) {
        ElMessage.error(extractUploadError(err))
      }
      return { successCount: 0, errorCount: filesToUpload.length, cancelled: false }
    } finally {
      uploadLoading.value = false
    }
  }

  const handleRealUpload = async () => {
    if (!currentProject.value) return ElMessage.warning('请先选择作业项目')
    if (tempFiles.value.length === 0) return ElMessage.warning('请至少选择一个文件')

    const uploadFilesList = [...tempFiles.value]
    const result = await executeUpload(uploadFilesList)

    if (result.successCount > 0 && result.errorCount === 0) {
      uploadDialogVisible.value = false
      clearUploadSelection()
    }
  }

  const retryUploadFile = async (fileItem) => {
    if (uploadLoading.value) return
    await executeUpload([fileItem])
  }

  const confirmUpload = () => {
    if (tempFiles.value.length === 0) return ElMessage.warning('请先选择文件')

    const typeName = tempUploadType.value === 'CONTRACT' ? '合同文件' : '实测报告'
    const projectName =
      projectOptions.value.find((p) => p.id === currentProject.value)?.name || '未知项目'

    const msg = `
      <div style="text-align: left; font-size: 14px;">
        <p style="margin-bottom: 8px;">请核对本次上传任务信息：</p>
        <ul style="list-style: none; padding-left: 10px; background: #f5f7fa; padding: 10px; border-radius: 4px;">
          <li><strong>文件数量：</strong> <span style="color: #409EFF; font-weight: bold; font-size: 16px;">${tempFiles.value.length}</span> 份</li>
          <li><strong>归属项目：</strong> ${projectName}</li>
          ${tempUploadType.value === 'SURVEY_REPORT' ? `<li><strong>所属期数：</strong> <span style="color: #E6A23C; font-weight: bold;">第 ${uploadPhase.value} 期</span></li>` : ''}
          <li><strong>文件类型：</strong> <span style="color: #F56C6C; font-weight: bold;">${typeName}</span></li>
        </ul>
        <p style="margin-top: 10px; color: #909399; font-size: 12px;">确认后将并发上传，每个文件入库完成后自动开始解析。</p>
      </div>
    `

    ElMessageBox.confirm(msg, '确认开始上传？', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确认并上传',
      cancelButtonText: '再检查一下',
      type: 'info',
      center: true,
    })
      .then(() => handleRealUpload())
      .catch(() => { })
  }

  return {
    uploadDialogVisible,
    tempUploadType,
    uploadPhase,
    tempFiles,
    uploadRef,
    uploadLoading,
    getFileUploadState,
    clearUploadSelection,
    openUploadDialog,
    handleFileChange,
    handleFileRemove,
    handleUploadDialogClosed,
    confirmUpload,
    retryUploadFile,
  }
}

function extractUploadError(err) {
  return resolveUploadHttpError(err, '未知错误，上传失败')
}
