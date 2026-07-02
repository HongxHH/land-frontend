<template>
  <div class="macaron-container">
    <UploadActionHeader
      v-if="!isAuditOnlyMode"
      v-model="currentProject"
      :project-options="projectOptions"
      @create-project="showCreateProject = true"
      @open-upload="openUploadDialog"
    />

    <FileUploadTaskPanel
      v-if="!isAuditOnlyMode"
      :current-project="currentProject"
      :table-loading="tableLoading"
      :selected-rows-length="selectedRows.length"
      :batch-loading="batchLoading"
      :can-batch-parse="canBatchParse"
      :filter-file-name="filterFileName"
      :filter-file-type="filterFileType"
      :filter-status="filterStatus"
      :file-table-data="fileTableData"
      :status-map="statusMap"
      :table-row-class-name="tableRowClassName"
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      @batch-delete="batchDelete"
      @batch-parse="batchParse"
      @update:filter-file-name="(val) => (filterFileName = val)"
      @update:filter-file-type="(val) => (filterFileType = val)"
      @update:filter-status="(val) => (filterStatus = val)"
      @search="refreshData"
      @reset="resetFilter"
      @refresh="handleRefresh"
      @selection-change="handleSelectionChange"
      @cancel-processing="cancelProcessing"
      @start-processing="startProcessing"
      @open-calibration="openCalibration"
      @delete-file="deleteFile"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <CreateProjectDialog
      v-if="!isAuditOnlyMode"
      v-model="showCreateProject"
      :new-project-form="newProjectForm"
      :locale="zhCn"
      @update:new-project-form="(v) => Object.assign(newProjectForm, v)"
      @submit="handleCreateProject"
    />

    <BatchUploadDialog
      v-if="!isAuditOnlyMode"
      v-model="uploadDialogVisible"
      :temp-upload-type="tempUploadType"
      :upload-phase="uploadPhase"
      :temp-files="tempFiles"
      :upload-loading="uploadLoading"
      :get-file-upload-state="getFileUploadState"
      @update:temp-upload-type="(val) => (tempUploadType = val)"
      @update:upload-phase="(val) => (uploadPhase = val)"
      @file-change="handleFileChange"
      @file-remove="handleFileRemove"
      @confirm="confirmUpload"
      @retry-one="retryUploadFile"
      @closed="handleUploadDialogClosed"
    />

    <div v-if="isAuditOnlyMode && !showCalibration" class="audit-loading">
      <el-skeleton animated>
        <template #template>
          <el-skeleton-item variant="rect" style="width: 100%; height: 72vh; border-radius: 12px" />
        </template>
      </el-skeleton>
      <p class="audit-loading__hint">正在打开审核界面…</p>
    </div>

    <CalibrationWorkspaceDialog
      v-model="showCalibration"
      :project-id="currentProject"
      :current-file="currentFile"
      :is-editing="isEditing"
      :start-row-edit="enterEditMode"
      :exit-edit-mode="exitEditMode"
      :handle-save-data="handleSaveData"
      :sync-room-row="syncRoomRow"
      :handle-refresh-survey-report="handleRefreshSurveyReport"
      :report-refresh-loading="reportRefreshLoading"
      :handle-audit-pass="handleAuditPass"
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
      :fetch-all-room-info-rows="fetchAllRoomInfoRows"
      :search-room-infos-by-pages="searchRoomInfosByPages"
      :load-more-room-info="loadMoreRoomInfo"
      :room-info-has-more="roomInfoHasMore"
      :room-info-loading-more="roomInfoLoadingMore"
      @closed="handleCalibrationClosed"
    />
  </div>
</template>

<script setup>
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UploadActionHeader from '@/components/file-upload/UploadActionHeader.vue'
import FileUploadTaskPanel from '@/components/file-upload/FileUploadTaskPanel.vue'
import CreateProjectDialog from '@/components/file-upload/CreateProjectDialog.vue'
import BatchUploadDialog from '@/components/file-upload/BatchUploadDialog.vue'
import CalibrationWorkspaceDialog from '@/components/file-upload/CalibrationWorkspaceDialog.vue'
import { useFileUploadPage } from '@/composables/file-upload/useFileUploadPage'
const route = useRoute()
const router = useRouter()

const {
  statusMap,
  tableRowClassName,
  projectOptions,
  currentProject,
  showCreateProject,
  newProjectForm,
  handleCreateProject,
  fileTableData,
  tableLoading,
  filterStatus,
  filterFileName,
  filterFileType,
  currentPage,
  pageSize,
  total,
  refreshData,
  resetFilter,
  handleSizeChange,
  handleCurrentChange,
  handleRefresh,
  selectedRows,
  batchLoading,
  canBatchParse,
  handleSelectionChange,
  batchDelete,
  batchParse,
  uploadDialogVisible,
  tempUploadType,
  uploadPhase,
  tempFiles,
  uploadLoading,
  getFileUploadState,
  openUploadDialog,
  handleFileChange,
  handleFileRemove,
  handleUploadDialogClosed,
  confirmUpload,
  retryUploadFile,
  openCalibration,
  startProcessing,
  cancelProcessing,
  deleteFile,
  showCalibration,
  resetCalibrationState,
  currentFile,
  isEditing,
  enterEditMode,
  exitEditMode,
  handleSaveData,
  syncRoomRow,
  handleRefreshSurveyReport,
  reportRefreshLoading,
  handleAuditPass,
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
  fetchAllRoomInfoRows,
  searchRoomInfosByPages,
  loadMoreRoomInfo,
  roomInfoHasMore,
  roomInfoLoadingMore
} = useFileUploadPage()

const isAuditOnlyMode = computed(() => String(route.query.returnTo || '') === 'projects')

const isReturningToProjects = ref(false)
const calibrationOpenedInAudit = ref(false)

const navigateBackToProjects = () => {
  if (isReturningToProjects.value) return
  isReturningToProjects.value = true
  const query = {
    tab: String(route.query.returnTab || 'archives'),
    fromAuditReturn: '1'
  }
  if (route.query.projectId) query.projectId = String(route.query.projectId)
  if (route.query.archiveId) query.archiveId = String(route.query.archiveId)
  router.replace({ name: 'ProjectList', query }).finally(() => {
    isReturningToProjects.value = false
  })
}

const handleCalibrationClosed = () => {
  resetCalibrationState()
  if (route.query.returnTo === 'projects') {
    navigateBackToProjects()
  }
}

watch(
  () => showCalibration.value,
  (visible) => {
    if (!isAuditOnlyMode.value) return
    if (visible) {
      calibrationOpenedInAudit.value = true
      return
    }
    if (calibrationOpenedInAudit.value) {
      calibrationOpenedInAudit.value = false
      navigateBackToProjects()
    }
  }
)
</script>

<style scoped>
.macaron-container {
  padding: 20px;
  min-height: 80vh;
  background-color: #f5f7fa;
}

.audit-loading {
  min-height: 72vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #64748b;
}

.audit-loading__hint {
  margin: 0;
  text-align: center;
  font-size: 14px;
}

:deep(.upload-confirm-btn:not(:disabled)) {
  background-color: #a0c4ff !important;
  border-color: #a0c4ff !important;
  color: #fff !important;
}

:deep(.upload-confirm-btn:disabled) {
  background-color: #e0e0e0 !important;
  border-color: #e0e0e0 !important;
  color: #999 !important;
}
</style>
