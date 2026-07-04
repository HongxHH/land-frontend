import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import {
  MISSING_USAGE_LABEL,
  groupRoomNumbersByUsageName,
  mergeUnknownUsagePolicyRows,
  parseDistinctUnknownUsageNames,
} from '@/composables/file-upload/surveyUsagePending'

export { parseDistinctUnknownUsageNames as parseUnknownUsageNames }

/**
 * 智能审核对话框内：展示当前报告涉及的未知用途
 */
export function useCalibrationUnknownUsagePolicy({ dialogOpen, projectId, auditSummaryData }) {
  const rows = ref([])
  const loading = ref(false)

  const nameSet = computed(() => {
    const json = auditSummaryData.value?.unknownUsages
    return new Set(parseDistinctUnknownUsageNames(json))
  })

  const roomsByUsageName = computed(() =>
    groupRoomNumbersByUsageName(auditSummaryData.value?.unknownUsages)
  )

  const shouldLoad = computed(() => {
    if (!dialogOpen.value) return false
    const pid = String(projectId.value || '').trim()
    if (!pid) return false
    if (nameSet.value.size > 0) return true
    return (roomsByUsageName.value.get(MISSING_USAGE_LABEL) || []).length > 0
  })

  const loadRows = async () => {
    const pid = String(projectId.value || '').trim()
    const unknownUsagesJson = auditSummaryData.value?.unknownUsages
    const hasMissingOnly =
      nameSet.value.size === 0 && (roomsByUsageName.value.get(MISSING_USAGE_LABEL) || []).length > 0
    if (!pid || (nameSet.value.size === 0 && !hasMissingOnly)) {
      rows.value = []
      return
    }
    loading.value = true
    try {
      const res = await axios.get(`/api/usage-config/unknown/project/${pid}`)
      const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
      const names = nameSet.value
      const filtered = list.filter((item) => names.has(String(item.usageName || '').trim()))
      rows.value = mergeUnknownUsagePolicyRows(unknownUsagesJson, filtered)
    } catch (error) {
      console.error('加载审核页未知用途失败:', error)
      ElMessage.warning('加载未知用途列表失败')
      rows.value = mergeUnknownUsagePolicyRows(unknownUsagesJson, [])
    } finally {
      loading.value = false
    }
  }

  watch(
    [dialogOpen, projectId, () => auditSummaryData.value?.unknownUsages, shouldLoad],
    async () => {
      if (!shouldLoad.value) {
        rows.value = []
        return
      }
      await loadRows()
    },
    { flush: 'post' }
  )

  return {
    calibrationUnknownRows: rows,
    calibrationUnknownLoading: loading,
    reloadCalibrationUnknownRows: loadRows,
  }
}
