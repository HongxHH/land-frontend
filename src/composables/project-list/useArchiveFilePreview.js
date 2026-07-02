import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadGridFsFile } from '@/services/file.service'

const ARCHIVE_PREVIEW_MODES = {
  PDF: 'pdf',
  EXCEL: 'excel',
  IMAGE: 'image',
  UNSUPPORTED: 'unsupported'
}

const IMAGE_TYPES = new Set(['PNG', 'JPEG', 'JPG', 'GIF'])
const EXCEL_TYPES = new Set(['XLS', 'XLSX'])

function resolveSourceGridfsId(row) {
  return String(row?.gridfsId || row?.fileId || row?.sourceGridfsId || '').trim()
}

function inferArchivePreviewMode(fileType, fileName = '') {
  const normalizedType = String(fileType || '').toUpperCase()
  if (normalizedType === 'PDF') return ARCHIVE_PREVIEW_MODES.PDF
  if (EXCEL_TYPES.has(normalizedType)) return ARCHIVE_PREVIEW_MODES.EXCEL
  if (IMAGE_TYPES.has(normalizedType)) return ARCHIVE_PREVIEW_MODES.IMAGE

  const lowerName = String(fileName || '').toLowerCase()
  if (lowerName.endsWith('.pdf')) return ARCHIVE_PREVIEW_MODES.PDF
  if (/\.(xls|xlsx)$/.test(lowerName)) return ARCHIVE_PREVIEW_MODES.EXCEL
  if (/\.(png|jpe?g|gif)$/.test(lowerName)) return ARCHIVE_PREVIEW_MODES.IMAGE

  return ARCHIVE_PREVIEW_MODES.UNSUPPORTED
}

export function canPreviewArchiveFile(row) {
  const gridfsId = resolveSourceGridfsId(row)
  if (!gridfsId) return false
  const state = String(row?.fileState || '').toUpperCase()
  return !['UPLOADING', 'UPLOAD_FAIL'].includes(state)
}

export function useArchiveFilePreview() {
  const previewVisible = ref(false)
  const previewLoading = ref(false)
  const previewMode = ref(ARCHIVE_PREVIEW_MODES.UNSUPPORTED)
  const previewFileMeta = ref(null)
  const pdfPreviewUrl = ref('')
  const imagePreviewUrl = ref('')
  const excelPreviewSrc = ref(null)

  const revokePreviewUrls = () => {
    if (pdfPreviewUrl.value) {
      URL.revokeObjectURL(pdfPreviewUrl.value)
      pdfPreviewUrl.value = ''
    }
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value)
      imagePreviewUrl.value = ''
    }
    excelPreviewSrc.value = null
  }

  const resetPreviewState = () => {
    revokePreviewUrls()
    previewLoading.value = false
    previewMode.value = ARCHIVE_PREVIEW_MODES.UNSUPPORTED
    previewFileMeta.value = null
  }

  const loadPreviewContent = async (row) => {
    const gridfsId = resolveSourceGridfsId(row)
    if (!gridfsId) {
      ElMessage.warning('该文件缺少可预览的源文件ID')
      return false
    }

    revokePreviewUrls()
    previewLoading.value = true
    previewFileMeta.value = {
      originalName: row?.originalName || row?.name || '未命名文件',
      fileType: row?.fileType || '',
      gridfsId
    }
    previewMode.value = inferArchivePreviewMode(row?.fileType, previewFileMeta.value.originalName)

    if (previewMode.value === ARCHIVE_PREVIEW_MODES.UNSUPPORTED) {
      previewLoading.value = false
      return true
    }

    try {
      if (previewMode.value === ARCHIVE_PREVIEW_MODES.EXCEL) {
        const res = await downloadGridFsFile(gridfsId, { responseType: 'arraybuffer' })
        excelPreviewSrc.value = res.data
      } else {
        const mimeType =
          previewMode.value === ARCHIVE_PREVIEW_MODES.PDF
            ? 'application/pdf'
            : inferImageMimeType(row?.fileType, previewFileMeta.value.originalName)
        const res = await downloadGridFsFile(gridfsId, { responseType: 'blob' })
        const blob = new Blob([res.data], { type: mimeType })
        const objectUrl = URL.createObjectURL(blob)
        if (previewMode.value === ARCHIVE_PREVIEW_MODES.PDF) {
          pdfPreviewUrl.value = objectUrl
        } else {
          imagePreviewUrl.value = objectUrl
        }
      }
      return true
    } catch (error) {
      console.error('归档文件预览加载失败:', error)
      ElMessage.error('文件预览加载失败，请稍后重试或下载原文件查看')
      return false
    } finally {
      if (previewMode.value !== ARCHIVE_PREVIEW_MODES.EXCEL) {
        previewLoading.value = false
      }
    }
  }

  const openArchivePreview = async (row) => {
    if (!canPreviewArchiveFile(row)) {
      ElMessage.warning('当前文件暂不可预览')
      return
    }
    const ok = await loadPreviewContent(row)
    if (ok) {
      previewVisible.value = true
    }
  }

  const closeArchivePreview = () => {
    previewVisible.value = false
  }

  const handlePreviewClosed = () => {
    resetPreviewState()
  }

  const downloadPreviewFile = async () => {
    const meta = previewFileMeta.value
    if (!meta?.gridfsId) {
      ElMessage.warning('缺少文件ID，无法下载')
      return
    }
    try {
      const res = await downloadGridFsFile(meta.gridfsId, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = meta.originalName || '归档文件'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('归档文件下载失败:', error)
      ElMessage.error('文件下载失败')
    }
  }

  return {
    previewVisible,
    previewLoading,
    previewMode,
    previewFileMeta,
    pdfPreviewUrl,
    imagePreviewUrl,
    excelPreviewSrc,
    openArchivePreview,
    closeArchivePreview,
    handlePreviewClosed,
    downloadPreviewFile
  }
}

function inferImageMimeType(fileType, fileName = '') {
  const normalizedType = String(fileType || '').toUpperCase()
  if (normalizedType === 'PNG') return 'image/png'
  if (normalizedType === 'GIF') return 'image/gif'
  if (normalizedType === 'JPEG' || normalizedType === 'JPG') return 'image/jpeg'

  const lowerName = String(fileName || '').toLowerCase()
  if (lowerName.endsWith('.png')) return 'image/png'
  if (lowerName.endsWith('.gif')) return 'image/gif'
  if (/\.jpe?g$/.test(lowerName)) return 'image/jpeg'
  return 'image/jpeg'
}
