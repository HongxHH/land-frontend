import { computed, ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import {
  MISSING_USAGE_LABEL,
  buildMissingUsageSourceGroupForAudit,
  groupRoomNumbersByUsageName,
  mergeUnknownUsagePolicyRows,
  parseDistinctUnknownUsageNames,
  reportHasPendingUnknownUsage,
} from '@/composables/file-upload/surveyUsagePending'

export { parseDistinctUnknownUsageNames as parseUnknownUsageNames }

/**
 * 智能审核对话框内：展示当前报告涉及的未知用途
 */
export function useCalibrationUnknownUsagePolicy({
  dialogOpen,
  projectId,
  auditSummaryData,
  currentFile,
}) {
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
    if ((roomsByUsageName.value.get(MISSING_USAGE_LABEL) || []).length > 0) return true
    return reportHasPendingUnknownUsage(auditSummaryData.value)
  })

  const resolveFileContext = () => {
    const file = currentFile?.value
    return {
      fileRecordId: String(file?.rawId || file?.fileRecordId || '').trim(),
      fileName: String(file?.name || file?.originalName || '').trim(),
    }
  }

  const loadUnknownUsageApiRows = async (pid, names, fileRecordId) => {
    if (names.size > 0) {
      const res = await axios.get(`/api/usage-config/unknown/project/${pid}`)
      const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
      return list.filter((item) => names.has(String(item.usageName || '').trim()))
    }
    if (!fileRecordId) return []
    const res = await axios.get(`/api/usage-config/unknown/file/${fileRecordId}`)
    const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
    return list.filter((item) => Number(item.status ?? 0) === 0)
  }

  const loadRows = async () => {
    const pid = String(projectId.value || '').trim()
    const unknownUsagesJson = auditSummaryData.value?.unknownUsages
    const hasMissingOnly =
      nameSet.value.size === 0 && (roomsByUsageName.value.get(MISSING_USAGE_LABEL) || []).length > 0
    const pendingBySummary = reportHasPendingUnknownUsage(auditSummaryData.value)
    if (!pid || (nameSet.value.size === 0 && !hasMissingOnly && !pendingBySummary)) {
      rows.value = []
      return
    }
    loading.value = true
    try {
      const names = nameSet.value
      const { fileRecordId, fileName } = resolveFileContext()
      const filtered = await loadUnknownUsageApiRows(pid, names, fileRecordId)
      rows.value = mergeUnknownUsagePolicyRows(unknownUsagesJson, filtered, {
        missingUsageSourceGroups: buildMissingUsageSourceGroupForAudit(
          fileRecordId,
          fileName,
          unknownUsagesJson
        ),
      })
    } catch (error) {
      console.error('加载审核页未知用途失败:', error)
      ElMessage.warning('加载未知用途列表失败')
      const { fileRecordId, fileName } = resolveFileContext()
      rows.value = mergeUnknownUsagePolicyRows(unknownUsagesJson, [], {
        missingUsageSourceGroups: buildMissingUsageSourceGroupForAudit(
          fileRecordId,
          fileName,
          unknownUsagesJson
        ),
      })
    } finally {
      loading.value = false
    }
  }

  watch(
    [
      dialogOpen,
      projectId,
      () => auditSummaryData.value?.unknownUsages,
      () => auditSummaryData.value?.hasUnknownUsage,
      () => auditSummaryData.value?.unknownUsageCount,
      shouldLoad,
    ],
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
  }
}
