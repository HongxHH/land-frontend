<template>
  <div class="right-panel audit-split-layout__right">
    <div class="cali-right-panel">
      <CalibrationAuditStrip
        :open="open"
        :audit-summary-data="auditSummaryData"
        :audit-summary-display="auditSummaryDisplay"
        :room-info-data="roomInfoData"
        :project-id="projectId"
        :focus-usage-name="focusUsageName"
        @locate-usage="handleLocateUnknownUsage"
      />
      <CalibrationRoomTable
        ref="roomTableRef"
        :open="open"
        :is-editing="isEditing"
        :editing-row-id="editingRowId"
        :start-row-edit="startRowEdit"
        :exit-edit-mode="exitEditMode"
        :handle-save-data="handleSaveData"
        :sync-room-row="syncRoomRow"
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
        :load-more-room-info="loadMoreRoomInfo"
        :room-info-has-more="roomInfoHasMore"
        :room-info-loading-more="roomInfoLoadingMore"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import CalibrationAuditStrip from '@/components/file-upload/CalibrationAuditStrip.vue'
import CalibrationRoomTable from '@/components/file-upload/CalibrationRoomTable.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  editingRowId: { type: [String, Number], default: '' },
  startRowEdit: { type: Function, required: true },
  exitEditMode: { type: Function, required: true },
  handleSaveData: { type: Function, required: true },
  syncRoomRow: { type: Function, default: null },
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
  loadMoreRoomInfo: { type: Function, default: null },
  roomInfoHasMore: { type: Boolean, default: false },
  roomInfoLoadingMore: { type: Boolean, default: false },
  focusUsageName: { type: String, default: '' },
})

const roomTableRef = ref(null)

const handleLocateUnknownUsage = (usageName) => {
  const name = String(usageName || '').trim()
  if (!name) return
  roomTableRef.value?.setRoomTableKeyword?.(name)
  ElMessage.info(`已在户室表中筛选「${name}」`)
}

watch(
  () => [props.open, props.focusUsageName],
  ([open, focusName]) => {
    if (!open) return
    const name = String(focusName || '').trim()
    if (name) {
      roomTableRef.value?.setRoomTableKeyword?.(name)
    }
  },
  { immediate: true }
)

defineExpose({
  clearRoomTableKeyword: () => roomTableRef.value?.clearRoomTableKeyword?.(),
})
</script>
