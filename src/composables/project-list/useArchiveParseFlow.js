import { onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getParseJobFlow } from '@/services/file.service'

function isParseFlowTerminal(detail) {
  const s = String(detail?.status || '').toUpperCase()
  return s === 'SUCCESS' || s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED'
}

/**
 * @param {{ isActive: () => boolean }} options Tab 是否处于激活态（非激活时停止轮询）
 */
export function useArchiveParseFlow({ isActive }) {
  const parseFlowDialogVisible = ref(false)
  const parseFlowDetail = ref(null)
  const parseFlowLoading = ref(false)
  const parseFlowJobId = ref(null)
  let parseFlowAutoTimer = null
  let parseFlowRefreshing = false

  const refreshParseFlowDialog = async (options = {}) => {
    const silent = Boolean(options?.silent)
    const id = parseFlowJobId.value
    if (!id) return
    if (parseFlowRefreshing) return
    parseFlowRefreshing = true
    if (!silent) parseFlowLoading.value = true
    try {
      const res = await getParseJobFlow(id)
      const code = Number(res?.data?.code)
      if (code === 200) {
        parseFlowDetail.value = res?.data?.data || null
        return
      }
      ElMessage.warning(res?.data?.msg || '加载解析流程失败')
    } catch (e) {
      console.error(e)
      ElMessage.error(e?.response?.data?.msg || '加载解析流程失败')
    } finally {
      parseFlowRefreshing = false
      if (!silent) parseFlowLoading.value = false
    }
  }

  const openParseFlowDialog = async (row) => {
    const id = row?.parseJobId
    if (!id) return
    parseFlowJobId.value = id
    parseFlowDetail.value = null
    parseFlowDialogVisible.value = true
    await refreshParseFlowDialog()
  }

  const startParseFlowAutoRefresh = () => {
    if (parseFlowAutoTimer) return
    parseFlowAutoTimer = setInterval(async () => {
      if (!isActive() || !parseFlowDialogVisible.value || !parseFlowJobId.value) return
      if (isParseFlowTerminal(parseFlowDetail.value)) {
        stopParseFlowAutoRefresh()
        return
      }
      await refreshParseFlowDialog({ silent: true })
      if (isParseFlowTerminal(parseFlowDetail.value)) {
        stopParseFlowAutoRefresh()
      }
    }, 3000)
  }

  const stopParseFlowAutoRefresh = () => {
    if (!parseFlowAutoTimer) return
    clearInterval(parseFlowAutoTimer)
    parseFlowAutoTimer = null
  }

  watch(
    () => parseFlowDialogVisible.value,
    (visible) => {
      if (!visible) {
        stopParseFlowAutoRefresh()
        return
      }
      startParseFlowAutoRefresh()
    }
  )

  watch(
    () => parseFlowDetail.value?.status,
    (status) => {
      if (!parseFlowDialogVisible.value) return
      if (isParseFlowTerminal({ status })) stopParseFlowAutoRefresh()
    }
  )

  onBeforeUnmount(() => {
    stopParseFlowAutoRefresh()
  })

  return {
    parseFlowDialogVisible,
    parseFlowDetail,
    parseFlowLoading,
    openParseFlowDialog,
    refreshParseFlowDialog,
    stopParseFlowAutoRefresh
  }
}
