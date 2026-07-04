import { reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export function useUsageConfigRelatedFiles() {
  const drawerVisible = ref(false)
  const currentConfig = ref(null)
  const loading = ref(false)
  const records = ref([])
  const keyword = ref('')
  const summary = reactive({
    totalFiles: 0,
    totalMatchedRooms: 0,
  })
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0,
    pages: 0,
  })

  const resetState = () => {
    records.value = []
    keyword.value = ''
    summary.totalFiles = 0
    summary.totalMatchedRooms = 0
    pagination.current = 1
    pagination.size = 10
    pagination.total = 0
    pagination.pages = 0
  }

  const fetchRelatedFiles = async () => {
    const config = currentConfig.value
    if (!config?.id) return false
    loading.value = true
    try {
      const res = await axios.get(`/api/usage-config/${config.id}/related-files`, {
        params: {
          pageNum: pagination.current,
          pageSize: pagination.size,
          keyword: keyword.value.trim() || undefined,
          _t: Date.now(),
        },
      })
      if (res.data.code !== 200) {
        ElMessage.error(res.data.msg || '查询关联文件失败')
        return false
      }
      const data = res.data.data || {}
      records.value = data.records || []
      pagination.current = Number(data.current || pagination.current)
      pagination.size = Number(data.size || pagination.size)
      pagination.total = Number(data.total || 0)
      pagination.pages = Number(data.pages || 0)
      summary.totalFiles = pagination.total
      summary.totalMatchedRooms = Number(data.totalMatchedRooms || 0)
      return true
    } catch (error) {
      console.error('查询用途配置关联文件失败:', error)
      ElMessage.error('查询关联文件失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  const openDrawer = async (config) => {
    if (!config?.id) {
      ElMessage.warning('缺少用途配置信息')
      return
    }
    currentConfig.value = { ...config }
    resetState()
    drawerVisible.value = true
    await fetchRelatedFiles()
  }

  const closeDrawer = () => {
    drawerVisible.value = false
  }

  const handleSearch = async () => {
    pagination.current = 1
    await fetchRelatedFiles()
  }

  const handlePageChange = async (page) => {
    pagination.current = page
    await fetchRelatedFiles()
  }

  const handleSizeChange = async (size) => {
    pagination.size = size
    pagination.current = 1
    await fetchRelatedFiles()
  }

  return {
    drawerVisible,
    currentConfig,
    loading,
    records,
    keyword,
    summary,
    pagination,
    openDrawer,
    closeDrawer,
    fetchRelatedFiles,
    handleSearch,
    handlePageChange,
    handleSizeChange,
  }
}
