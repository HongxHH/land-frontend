import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadGridFsFile, queryFiles } from '@/services/file.service'

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

export function usePlanningReviewAuditPreview() {
  const pdfLoading = ref(false)
  const leftView = ref('original')
  const pdfUrl = ref('')

  const fileMeta = reactive({
    originalName: '',
    gridfsId: '',
    preprocessGridfsId: '',
  })

  const previewViews = computed(() => [
    { id: 'original', label: '原始文件' },
    {
      id: 'preprocess',
      label: '预处理文件',
      disabled: !fileMeta.preprocessGridfsId,
      hint: fileMeta.preprocessGridfsId ? '' : '暂无',
    },
  ])

  const clearPdfUrl = () => {
    if (pdfUrl.value) {
      URL.revokeObjectURL(pdfUrl.value)
      pdfUrl.value = ''
    }
  }

  const switchPdfType = async (type) => {
    const targetGridfsId = type === 'preprocess' ? fileMeta.preprocessGridfsId : fileMeta.gridfsId
    if (!targetGridfsId) {
      if (type === 'preprocess') ElMessage.warning('当前文件没有预处理版本')
      clearPdfUrl()
      return
    }

    leftView.value = type
    pdfLoading.value = true
    try {
      const res = await downloadGridFsFile(targetGridfsId, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      clearPdfUrl()
      pdfUrl.value = URL.createObjectURL(blob)
    } catch (error) {
      console.error('加载 PDF 失败:', error)
      ElMessage.error('PDF 预览加载失败')
      clearPdfUrl()
    } finally {
      pdfLoading.value = false
    }
  }

  const resolvePdfMeta = async (fileRecordId) => {
    fileMeta.originalName = ''
    fileMeta.gridfsId = ''
    fileMeta.preprocessGridfsId = ''
    leftView.value = 'original'
    clearPdfUrl()

    if (!fileRecordId) return

    pdfLoading.value = true
    try {
      const res = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        fileId: String(fileRecordId),
      })
      const parsed = normalizePage(res.data?.data)
      const hit = parsed.records?.[0]
      if (!hit) {
        ElMessage.warning('未找到该复核表关联文件')
        return
      }
      fileMeta.originalName = hit.originalName || ''
      fileMeta.gridfsId = hit.gridfsId || ''
      fileMeta.preprocessGridfsId = hit.preprocessGridfsId || ''
      await switchPdfType('original')
    } catch (error) {
      console.error('查询复核文件失败:', error)
      ElMessage.error('查询复核文件失败，请稍后重试')
    } finally {
      pdfLoading.value = false
    }
  }

  const downloadSourceFile = async () => {
    if (!fileMeta.gridfsId) {
      ElMessage.warning('缺少 gridfsId，无法下载')
      return
    }
    try {
      const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileMeta.originalName || '规划复核文件.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('下载规划复核文件失败:', error)
      ElMessage.error('下载失败，请稍后重试')
    }
  }

  return {
    fileMeta,
    pdfUrl,
    leftView,
    pdfLoading,
    previewViews,
    clearPdfUrl,
    resolvePdfMeta,
    switchPdfType,
    downloadSourceFile,
  }
}
