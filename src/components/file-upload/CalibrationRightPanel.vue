<template>
  <div class="right-panel audit-split-layout__right">
    <div class="cali-right-panel">
      <CalibrationAuditStrip
        :open="open"
        :audit-summary-data="auditSummaryData"
        :audit-summary-display="auditSummaryDisplay"
        :project-id="projectId"
        :current-file="currentFile"
        :focus-usage-name="focusUsageName"
        :focus-mode="focusMode"
        @locate-usage="handleLocateUnknownUsage"
        @filter-missing-usage="handleFilterMissingUsage"
      />
      <CalibrationRoomTable
        ref="roomTableRef"
        :open="open"
        :dirty-row-count="dirtyRowCount"
        :batch-update-loading="batchUpdateLoading"
        :is-cell-active="isCellActive"
        :is-row-dirty="isRowDirty"
        :start-cell-edit="startCellEdit"
        :commit-active-cell="commitActiveCell"
        :discard-all-changes="discardAllChanges"
        :handle-save-dirty-rows="handleSaveDirtyRows"
        :sync-room-row="syncRoomRow"
        :notify-row-touched="notifyRowTouched"
        :prepare-row-for-edit="prepareRowForEdit"
        :handle-refresh-survey-report="handleRefreshSurveyReport"
        :handle-create-room="handleCreateRoom"
        :handle-delete-room="handleDeleteRoom"
        :room-create-loading="roomCreateLoading"
        :room-delete-loading="roomDeleteLoading"
        :report-refresh-loading="reportRefreshLoading"
        :audit-summary-data="auditSummaryData"
        :room-info-data="roomInfoData"
        :room-info-loading="roomInfoLoading"
        :room-info-total="roomInfoTotal"
        :search-room-infos-by-pages="searchRoomInfosByPages"
        :search-missing-usage-by-pages="searchMissingUsageByPages"
        :load-more-room-info="loadMoreRoomInfo"
        :room-info-has-more="roomInfoHasMore"
        :room-info-loading-more="roomInfoLoadingMore"
      />
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { FOCUS_MODE_MISSING_USAGE } from '@/composables/file-upload/surveyUsagePending'
import CalibrationAuditStrip from '@/components/file-upload/CalibrationAuditStrip.vue'
import CalibrationRoomTable from '@/components/file-upload/CalibrationRoomTable.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  currentFile: { type: Object, default: null },
  dirtyRowCount: { type: Number, default: 0 },
  batchUpdateLoading: { type: Boolean, default: false },
  isCellActive: { type: Function, required: true },
  isRowDirty: { type: Function, required: true },
  startCellEdit: { type: Function, required: true },
  commitActiveCell: { type: Function, required: true },
  discardAllChanges: { type: Function, required: true },
  handleSaveDirtyRows: { type: Function, required: true },
  syncRoomRow: { type: Function, default: null },
  notifyRowTouched: { type: Function, default: null },
  prepareRowForEdit: { type: Function, default: null },
  handleRefreshSurveyReport: { type: Function, default: null },
  handleCreateRoom: { type: Function, default: null },
  handleDeleteRoom: { type: Function, default: null },
  roomCreateLoading: { type: Boolean, default: false },
  roomDeleteLoading: { type: Boolean, default: false },
  reportRefreshLoading: { type: Boolean, default: false },
  auditSummaryData: { type: Object, required: true },
  auditSummaryDisplay: { type: Object, required: true },
  roomInfoData: { type: Array, required: true },
  roomInfoLoading: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  roomInfoTotal: { type: Number, default: 0 },
  searchRoomInfosByPages: { type: Function, default: null },
  searchMissingUsageByPages: { type: Function, default: null },
  loadMoreRoomInfo: { type: Function, default: null },
  roomInfoHasMore: { type: Boolean, default: false },
  roomInfoLoadingMore: { type: Boolean, default: false },
  focusUsageName: { type: String, default: '' },
  focusMode: { type: String, default: '' },
})

const roomTableRef = ref(null)
let focusRetryTimer = null
let lastFocusToastKey = ''

const notifyFocusOnce = (key, message) => {
  if (lastFocusToastKey === key) return
  lastFocusToastKey = key
  ElMessage.info(message)
}

const tryApplyRoomTableFocus = async () => {
  if (!props.open) return false
  if (props.roomInfoLoading) return false

  await nextTick()
  const table = roomTableRef.value
  if (!table) return false

  const focusMode = String(props.focusMode || '').trim()
  const focusName = String(props.focusUsageName || '').trim()

  if (focusMode === FOCUS_MODE_MISSING_USAGE) {
    table.setMissingUsageFilter?.()
    notifyFocusOnce('missing-usage', '已筛选用途缺失户室，请逐户「选用途」')
    return true
  }
  if (focusName) {
    table.setRoomTableKeyword?.(focusName)
    notifyFocusOnce(`usage:${focusName}`, `已在户室表中筛选「${focusName}」`)
    return true
  }
  return false
}

const scheduleRoomTableFocus = () => {
  if (!props.open) return
  if (!props.focusMode && !props.focusUsageName) return
  if (props.roomInfoLoading) return

  if (focusRetryTimer != null) {
    clearTimeout(focusRetryTimer)
    focusRetryTimer = null
  }

  const attempt = async (retriesLeft = 6) => {
    const ok = await tryApplyRoomTableFocus()
    if (ok || retriesLeft <= 0) return
    focusRetryTimer = setTimeout(() => attempt(retriesLeft - 1), 100)
  }

  attempt()
}

const handleLocateUnknownUsage = (usageName) => {
  const name = String(usageName || '').trim()
  if (!name) return
  roomTableRef.value?.setRoomTableKeyword?.(name)
  ElMessage.info(`已在户室表中筛选「${name}」`)
}

const handleFilterMissingUsage = () => {
  roomTableRef.value?.setMissingUsageFilter?.()
  ElMessage.info('已筛选用途缺失户室，请逐户「选用途」')
}

watch(
  () => [props.open, props.focusUsageName, props.focusMode, props.roomInfoLoading],
  ([open]) => {
    if (!open) {
      lastFocusToastKey = ''
      if (focusRetryTimer != null) {
        clearTimeout(focusRetryTimer)
        focusRetryTimer = null
      }
      return
    }
    scheduleRoomTableFocus()
  },
  { immediate: true }
)

defineExpose({
  clearRoomTableKeyword: () => roomTableRef.value?.clearRoomTableKeyword?.(),
})
</script>
