import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteFileById, parseFileById } from '@/services/file.service'

export function useBatchActions({ refreshData, startPolling }) {
  const selectedRows = ref([])
  const batchLoading = ref(false)

  const canBatchParse = computed(() => {
    return selectedRows.value.some((row) =>
      ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.status)
    )
  })

  const handleSelectionChange = (val) => {
    selectedRows.value = val
  }

  const batchDelete = () => {
    if (selectedRows.value.length === 0) return

    ElMessageBox.confirm(
      `确认删除选中的 ${selectedRows.value.length} 个文件吗？删除后无法恢复。`,
      '批量删除',
      { type: 'warning', confirmButtonText: '确认删除' }
    ).then(async () => {
      batchLoading.value = true
      try {
        await Promise.all(selectedRows.value.map((row) => deleteFileById(row.rawId)))
        ElMessage.success(`成功删除 ${selectedRows.value.length} 个文件`)
        refreshData()
        selectedRows.value = []
      } catch (err) {
        console.error('批量删除失败:', err)
        ElMessage.error('部分文件删除失败，请重试')
      } finally {
        batchLoading.value = false
      }
    })
  }

  const batchParse = () => {
    if (!canBatchParse.value) return

    const parseRows = selectedRows.value.filter((row) =>
      ['WAITING_PARSE', 'PARSE_FAIL', 'PARSE_COMPLETE'].includes(row.status)
    )

    ElMessageBox.confirm(
      `确认解析选中的可解析文件（${parseRows.length} 个）吗？`,
      '批量解析',
      { type: 'primary', confirmButtonText: '立即开始' }
    ).then(async () => {
      batchLoading.value = true
      try {
        await Promise.all(
          parseRows.map((row) => {
            row.status = 'PENDING'
            return parseFileById(row.rawId)
          })
        )
        ElMessage.success('批量解析任务已提交，后台处理中')
        startPolling()
        selectedRows.value = []
      } catch (err) {
        console.error('批量解析失败:', err)
        ElMessage.error('部分文件解析请求失败，请重试')
      } finally {
        batchLoading.value = false
      }
    })
  }

  return {
    selectedRows,
    batchLoading,
    canBatchParse,
    handleSelectionChange,
    batchDelete,
    batchParse
  }
}

