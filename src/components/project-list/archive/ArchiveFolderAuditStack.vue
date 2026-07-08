<template>
  <div class="archive-audit-stack">
    <CalibrationWorkspaceDialog
      v-if="showCalibration"
      v-model="showCalibration"
      :project-id="projectId"
      :focus-usage-name="auditFocusUsageName"
      :focus-mode="auditFocusMode"
      :current-file="currentFile"
      :dirty-row-count="dirtyRowCount"
      :batch-update-loading="batchUpdateLoading"
      :is-cell-active="isCellActive"
      :is-row-dirty="isRowDirty"
      :start-cell-edit="startCellEdit"
      :commit-active-cell="commitActiveCell"
      :discard-all-changes="discardAllChanges"
      :handle-save-dirty-rows="handleSaveDirtyRows"
      :confirm-discard-unsaved-changes="confirmDiscardUnsavedChanges"
      :sync-room-row="syncRoomRow"
      :notify-row-touched="notifyRowTouched"
      :prepare-row-for-edit="prepareRowForEdit"
      :handle-refresh-survey-report="handleRefreshSurveyReport"
      :handle-create-room="handleCreateRoom"
      :handle-delete-room="handleDeleteRoom"
      :room-create-loading="roomCreateLoading"
      :room-delete-loading="roomDeleteLoading"
      :report-refresh-loading="reportRefreshLoading"
      :calibration-loading="calibrationLoading"
      :current-view-type="currentViewType"
      :is-preprocess-available="isPreprocessAvailable"
      :switch-view="switchView"
      :pdf-loading="pdfLoading"
      :calibration-pdf-url="calibrationPdfUrl"
      :pdf-loaded="pdfLoaded"
      :pdf-load-error="pdfLoadError"
      :recognition-md-loading="recognitionMdLoading"
      :recognition-html="recognitionHtml"
      :audit-summary-data="auditSummaryData"
      :audit-summary-display="auditSummaryDisplay"
      :room-info-data="roomInfoData"
      :room-info-loading="roomInfoLoading"
      :room-info-total="roomInfoTotal"
      :search-room-infos-by-pages="searchRoomInfosByPages"
      :search-missing-usage-by-pages="searchMissingUsageByPages"
      :load-more-room-info="loadMoreRoomInfo"
      :room-info-has-more="roomInfoHasMore"
      :room-info-loading-more="roomInfoLoadingMore"
      @closed="handleCalibrationClosed"
    />

    <PlanningReviewAuditDialog
      v-model="planningReviewAuditVisible"
      :project-id="projectId"
      :form-data="planningReviewAuditForm"
    />

    <ProjectPartySummaryAuditDialog
      v-model="partySummaryAuditVisible"
      :project-id="projectId"
      :file-record-id="partySummaryAuditFileRecordId"
      :initial-file="partySummaryAuditInitialFile"
    />

    <CapacityIndicatorAuditDialog
      v-model="capacityIndicatorAuditVisible"
      :project-id="projectId"
      :file-record-id="capacityIndicatorAuditFileRecordId"
      :initial-file="capacityIndicatorAuditInitialFile"
    />
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import PlanningReviewAuditDialog from '@/components/project-list/PlanningReviewAuditDialog.vue'

const CalibrationWorkspaceDialog = defineAsyncComponent(
  () => import('@/components/file-upload/CalibrationWorkspaceDialog.vue')
)
import CapacityIndicatorAuditDialog from '@/components/project-list/CapacityIndicatorAuditDialog.vue'
import { useArchiveFolderAuditStack } from '@/composables/project-list/useArchiveFolderAuditStack.js'

const ProjectPartySummaryAuditDialog = defineAsyncComponent(
  () => import('@/components/project-list/ProjectPartySummaryAuditDialog.vue')
)

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false },
  selectedArchive: { type: Object, default: null },
  archiveList: { type: Array, default: () => [] },
  archiveFiles: { type: Array, default: () => [] },
  selectedArchiveId: { type: [String, Number], default: null },
  selectedArchiveName: { type: String, default: '' },
  queryForm: { type: Object, default: null },
  fetchArchiveFiles: { type: Function, default: () => Promise.resolve() },
  fetchArchives: { type: Function, default: undefined },
  selectArchiveForAudit: { type: Function, default: undefined },
  onContractArchiveAudit: { type: Function, default: undefined },
  onAuditReturnNavigate: { type: Function, default: undefined },
})

const emit = defineEmits(['audit-consumed'])

const {
  showCalibration,
  currentFile,
  dirtyRowCount,
  batchUpdateLoading,
  isCellActive,
  isRowDirty,
  startCellEdit,
  commitActiveCell,
  notifyRowTouched,
  prepareRowForEdit,
  discardAllChanges,
  confirmDiscardUnsavedChanges,
  handleSaveDirtyRows,
  roomCreateLoading,
  roomDeleteLoading,
  reportRefreshLoading,
  calibrationLoading,
  currentViewType,
  isPreprocessAvailable,
  switchView,
  pdfLoading,
  calibrationPdfUrl,
  pdfLoaded,
  pdfLoadError,
  recognitionMdLoading,
  recognitionHtml,
  auditSummaryData,
  auditSummaryDisplay,
  roomInfoData,
  roomInfoLoading,
  roomInfoTotal,
  searchRoomInfosByPages,
  searchMissingUsageByPages,
  loadMoreRoomInfo,
  roomInfoHasMore,
  roomInfoLoadingMore,
  syncRoomRow,
  handleRefreshSurveyReport,
  handleCreateRoom,
  handleDeleteRoom,
  handleCalibrationClosed,
  planningReviewAuditVisible,
  planningReviewAuditForm,
  partySummaryAuditVisible,
  partySummaryAuditFileRecordId,
  partySummaryAuditInitialFile,
  capacityIndicatorAuditVisible,
  capacityIndicatorAuditFileRecordId,
  capacityIndicatorAuditInitialFile,
  handleAudit,
  openAuditByFileRecordId,
  auditFocusUsageName,
  auditFocusMode,
} = useArchiveFolderAuditStack({
  projectId: () => props.projectId,
  active: () => props.active,
  selectedArchive: () => props.selectedArchive,
  archiveList: () => props.archiveList,
  archiveFiles: () => props.archiveFiles,
  selectedArchiveId: () => props.selectedArchiveId,
  selectedArchiveName: () => props.selectedArchiveName,
  queryForm: props.queryForm,
  refreshArchiveFiles: props.fetchArchiveFiles,
  fetchArchives: props.fetchArchives,
  selectArchiveForAudit: props.selectArchiveForAudit,
  onContractArchiveAudit: props.onContractArchiveAudit,
  onAuditReturnNavigate: props.onAuditReturnNavigate,
  onAuditConsumed: () => emit('audit-consumed'),
})

defineExpose({
  handleAudit,
  openAuditByFileRecordId,
})
</script>

<style scoped>
.archive-audit-stack {
  display: contents;
}
</style>
