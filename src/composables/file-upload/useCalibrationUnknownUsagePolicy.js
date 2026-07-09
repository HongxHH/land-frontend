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

const LOAD_DEBOUNCE_MS = 50

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
  let loadSeq = 0
  let loadDebounceTimer = null

  const nameSet = computed(() => {
    const json = auditSummaryData.value?.unknownUsages
    return new Set(parseDistinctUnknownUsageNames(json))
  })

  const roomsByUsageName = computed(() =>
    groupRoomNumbersByUsageName(auditSummaryData.value?.unknownUsages)
  )

  const hasMissingOnly = computed(
    () =>
      nameSet.value.size === 0 &&
      (roomsByUsageName.value.get(MISSING_USAGE_LABEL) || []).length > 0
  )

  const resolveFileContext = () => {
    const file = currentFile?.value
    return {
      fileRecordId: String(file?.rawId || file?.fileRecordId || '').trim(),
      fileName: String(file?.name || file?.originalName || '').trim(),
    }
  }

  const buildRowsFromSummary = (unknownUsagesJson) => {
    const { fileRecordId, fileName } = resolveFileContext()
    return mergeUnknownUsagePolicyRows(unknownUsagesJson, [], {
      missingUsageSourceGroups: buildMissingUsageSourceGroupForAudit(
        fileRecordId,
        fileName,
        unknownUsagesJson
      ),
    })
  }

  const hasPendingToShow = () => {
    if (nameSet.value.size > 0) return true
    if (hasMissingOnly.value) return true
    return reportHasPendingUnknownUsage(auditSummaryData.value)
  }

  const loadUnknownUsageApiRows = async (pid, names, fileRecordId) => {
    if (names.size > 0) {
      const res = await axios.get(`/api/usage-config/unknown/project/${pid}`)
      const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
      return list.filter((item) => names.has(String(item.usageName || '').trim()))
    }
    if (fileRecordId) {
      const res = await axios.get(`/api/usage-config/unknown/file/${fileRecordId}`)
      const list = res.data?.code === 200 && Array.isArray(res.data.data) ? res.data.data : []
      return list.filter((item) => Number(item.status ?? 0) === 0)
    }
    return []
  }

  const loadRows = async () => {
    if (!dialogOpen.value) return

    const unknownUsagesJson = auditSummaryData.value?.unknownUsages
    if (!hasPendingToShow()) {
      rows.value = []
      return
    }

    // 阶段 1：从 summary JSON 同步构建列表，不依赖 projectId
    if (nameSet.value.size > 0 || hasMissingOnly.value) {
      rows.value = buildRowsFromSummary(unknownUsagesJson)
    }

    const pid = String(projectId.value || '').trim()
    const needsApiEnrich =
      pid &&
      (nameSet.value.size > 0 ||
        hasMissingOnly.value ||
        Number(auditSummaryData.value?.hasUnknownUsage) === 1)

    if (!needsApiEnrich) return

    const seq = ++loadSeq
    const showLoadingOverlay = rows.value.length === 0
    if (showLoadingOverlay) loading.value = true
    try {
      const { fileRecordId, fileName } = resolveFileContext()
      const apiRows = await loadUnknownUsageApiRows(pid, nameSet.value, fileRecordId)
      if (seq !== loadSeq) return
      rows.value = mergeUnknownUsagePolicyRows(unknownUsagesJson, apiRows, {
        missingUsageSourceGroups: buildMissingUsageSourceGroupForAudit(
          fileRecordId,
          fileName,
          unknownUsagesJson
        ),
      })
    } catch (error) {
      if (seq !== loadSeq) return
      console.error('加载审核页未知用途失败:', error)
      ElMessage.warning('加载未知用途列表失败')
      // 保留阶段 1 的同步 rows
    } finally {
      if (seq === loadSeq && showLoadingOverlay) loading.value = false
    }
  }

  const scheduleLoadRows = () => {
    if (loadDebounceTimer != null) {
      clearTimeout(loadDebounceTimer)
      loadDebounceTimer = null
    }
    loadDebounceTimer = setTimeout(() => {
      loadDebounceTimer = null
      loadRows()
    }, LOAD_DEBOUNCE_MS)
  }

  watch(
    [
      dialogOpen,
      projectId,
      () => auditSummaryData.value?.unknownUsages,
      () => auditSummaryData.value?.hasUnknownUsage,
      () => auditSummaryData.value?.unknownUsageCount,
      () => resolveFileContext().fileRecordId,
    ],
    () => {
      if (!dialogOpen.value) {
        if (loadDebounceTimer != null) {
          clearTimeout(loadDebounceTimer)
          loadDebounceTimer = null
        }
        loadSeq += 1
        rows.value = []
        loading.value = false
        return
      }
      scheduleLoadRows()
    },
    { flush: 'post', immediate: true }
  )

  return {
    calibrationUnknownRows: rows,
    calibrationUnknownLoading: loading,
  }
}
