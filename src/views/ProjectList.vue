<template>
  <div class="archive-container archive-container--fill">
    <ProjectFilterBar
      v-model="filterProject"
      :project-options="projectOptions"
      :current-project-id="currentProjectInfo.id"
      :current-project-name="currentProjectInfo.name"
      :options-loading="projectOptionsLoading"
      :search-projects="searchProjects"
      @search="handleGlobalSearch"
      @request-options="ensureProjectOptionsLoaded"
      @create-project="showCreateProjectDialog = true"
    />

    <div class="content-tabs-wrapper content-tabs-wrapper--fill no-print">
      <ProjectWorkspaceTabSkeleton v-if="projectWorkspaceBootstrapping" />
      <el-tabs
        v-else
        v-model="activeTab"
        type="border-card"
        class="archive-tabs archive-tabs--fill no-print"
        v-loading="workspaceQueryLoading"
        element-loading-text="正在加载业务数据…"
      >

        <el-tab-pane name="archives" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><FolderOpened /></el-icon> 归档文件查询
            </span>
          </template>
          <ArchiveFolderTab
            v-if="activeTab === 'archives'"
            ref="archiveTabRef"
            :project-id="currentProjectInfo.id"
            :project-name="currentProjectInfo.name"
            :initial-archive-id="initialArchiveId"
            :active="pageRouteActive && activeTab === 'archives'"
            :file-audit-handler="handleArchiveRowAudit"
            @contract-archive-audit="handleContractArchiveAudit"
          />
        </el-tab-pane>

        <el-tab-pane name="summary" class="workspace-tab-pane workspace-tab-pane--scroll" lazy>
          <template #label><span class="custom-tab-label"><el-icon><DataAnalysis /></el-icon> 房产实测汇总表</span></template>
          
          <div v-if="activeTab === 'summary'" class="tab-content tab-content--scroll workspace-ui-scale">
            <!-- 未知用途规则配置卡片 -->
            <UnknownUsagePolicyCard
              :unknown-usages="unknownUsages"
              :project-id="currentProjectInfo.id"
              @open-source-audit="handleOpenAuditByFileRecordId"
            />

            <SummaryTableCard
              :current-project-info="currentProjectInfo"
              :survey-stats="surveyStats"
              :data-loading="surveyLoading"
              :refresh-btn-loading="refreshBtnLoading"
              :parsed-refresh-loading="parsedRefreshLoading"
              :is-refresh-cd="isRefreshCd"
              :cd-remaining="cdRemaining"
              :display-table-data="displayTableData"
              @refresh-survey="handleRefreshSurveyData"
              @refresh-parsed="handleRefreshParsedOnly"
              @view-detail="viewDetail"
              @configure-print-export="openSummaryPrintExportSettings"
            />

            <SummaryComparisonCard
              :area-comparison="areaComparison"
              :selected-groups="selectedComparisonGroups"
              @update:selected-groups="(val) => (selectedComparisonGroups = val)"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane name="contractLandEdit" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><Location /></el-icon> 合同及地块信息
            </span>
          </template>
          <ContractLandTab
            v-if="activeTab === 'contractLandEdit'"
            :contract-land-list="contractLandList"
            :selected-contract="selectedContract"
            :current-land-parcel-list="currentLandParcelList"
            :contract-refresh-loading="contractRefreshLoading"
            @refresh-contracts="handleRefreshContracts"
            @add-contract="addContract"
            @contract-row-click="handleContractRowClick"
            @edit-contract="editContract"
            @delete-contract="deleteContract"
            @add-land-parcel="addLandParcel"
            @edit-land-parcel="editLandParcel"
            @delete-land-parcel="deleteLandParcel"
          />
        </el-tab-pane>

        <el-tab-pane name="planningReview" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><DocumentChecked /></el-icon> 规划复核表
            </span>
          </template>
          <PlanningReviewTab
            v-if="activeTab === 'planningReview'"
            :project-id="currentProjectInfo.id"
            :active="pageRouteActive && activeTab === 'planningReview'"
          />
        </el-tab-pane>

        <el-tab-pane name="capacityIndicator" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><DataAnalysis /></el-icon> 容量指标核查表
            </span>
          </template>
          <CapacityIndicatorTab
            v-if="activeTab === 'capacityIndicator'"
            :project-id="currentProjectInfo.id"
            :active="pageRouteActive && activeTab === 'capacityIndicator'"
          />
        </el-tab-pane>

        <el-tab-pane name="projectPartySummary" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><DocumentCopy /></el-icon> 项目方汇总表
            </span>
          </template>
          <ProjectPartySummaryTab
            v-if="activeTab === 'projectPartySummary'"
            :project-id="currentProjectInfo.id"
            :active="pageRouteActive && activeTab === 'projectPartySummary'"
          />
        </el-tab-pane>

        <el-tab-pane name="operationAudit" class="workspace-tab-pane no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><List /></el-icon> 审计日志
            </span>
          </template>
          <OperationAuditTab
            v-if="activeTab === 'operationAudit'"
            :project-id="currentProjectInfo.id"
            :active="pageRouteActive && activeTab === 'operationAudit'"
          />
        </el-tab-pane>

        <!-- 项目信息更新放在最后 -->
        <el-tab-pane name="projectEdit" class="workspace-tab-pane workspace-tab-pane--scroll no-print" lazy>
          <template #label>
            <span class="custom-tab-label">
              <el-icon><EditPen /></el-icon> 项目信息更新
            </span>
          </template>
          <ProjectEditForm
            v-if="activeTab === 'projectEdit'"
            :form="projectUpdateForm"
            :rules="projectEditRules"
            :loading="projectEditLoading"
            :set-form-ref="setProjectEditRef"
            @update:form="(v) => Object.assign(projectUpdateForm, v)"
            @submit="submitProjectUpdate"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <ArchiveFolderAuditStack
      v-if="currentProjectInfo.id"
      ref="workspaceAuditStackRef"
      :project-id="currentProjectInfo.id"
      :active="pageRouteActive && !!currentProjectInfo.id"
      :fetch-archive-files="refreshWorkspaceAfterFileAudit"
      :on-contract-archive-audit="handleContractArchiveAudit"
      @audit-consumed="handlePendingAuditConsumed"
    />

    <PrintSummaryBlock
      :is-printing="isPrinting"
      :resolved-main-columns="resolvedSummaryMainColumns"
      :current-project-info="currentProjectInfo"
      :current-print-date="currentPrintDate"
      :display-table-data="displayTableData"
      :area-comparison="areaComparison"
      :selected-comparison-groups="selectedComparisonGroups"
    />

    <SummaryPrintExportDialog
      v-model="summaryLayoutDialogVisible"
      v-model:layout-rows="summaryLayoutRows"
      v-model:comparison-groups="selectedComparisonGroups"
      :preview-table-data="displayTableData"
      :area-comparison="areaComparison"
      @after-print-request="handleSummaryAfterPrintRequest"
      @after-export-request="handleSummaryAfterExportRequest"
    />

    <ProjectDetailDialog
      v-model="detailDialogVisible"
      :report-audit-info="reportAuditInfo"
      :room-info-data="roomInfoData"
      :detail-loading="detailLoading"
      :current-detail-row="currentDetailRow"
      :can-jump-audit="canJumpAuditFromDetail"
      :report-basic-info-form="reportBasicInfoForm"
      :report-basic-info-saving="reportBasicInfoSaving"
      @jump-audit="handleJumpAuditFromDetail"
      @save-basic-info="saveReportBasicInfo"
      @update:building-name="(v) => (reportBasicInfoForm.buildingName = v)"
      @update:property-certificate-number="(v) => (reportBasicInfoForm.propertyCertificateNumber = v)"
      @update:property-area-confirmation-notice-number="(v) => (reportBasicInfoForm.propertyAreaConfirmationNoticeNumber = v)"
    />

      <ContractEditDialog
        v-model="contractDialogVisible"
        :form="contractForm"
        :rules="contractFormRules"
        :loading="contractFormLoading"
        :set-form-ref="setContractFormRef"
        @update:form="(v) => Object.assign(contractForm, v)"
        @submit="submitContractForm"
      />

      <ContractWorkspaceDialog
        v-model="contractWorkspaceVisible"
        :form="contractForm"
        :rules="contractFormRules"
        :loading="contractFormLoading"
        :set-form-ref="setContractFormRef"
        :pdf-url="contractWorkspacePdfUrl"
        :pdf-loading="contractWorkspacePdfLoading"
        :file-name="contractWorkspaceFileName"
        :file-options="contractFileOptions"
        :file-options-loading="contractFileOptionsLoading"
        :selected-file-id="selectedPreviewFileId"
        @update:form="(v) => Object.assign(contractForm, v)"
        @submit="submitContractForm"
        @update:selected-file-id="handleSelectPreviewFile"
      />

      <LandParcelEditDialog
        v-model="landParcelDialogVisible"
        :form="landParcelForm"
        :rules="landParcelFormRules"
        :loading="landParcelFormLoading"
        :set-form-ref="setLandParcelFormRef"
        :pdf-url="contractWorkspacePdfUrl"
        :pdf-loading="contractWorkspacePdfLoading"
        :file-options="contractFileOptions"
        :file-options-loading="contractFileOptionsLoading"
        :selected-file-id="selectedPreviewFileId"
        @update:form="(v) => Object.assign(landParcelForm, v)"
        @submit="submitLandParcelForm"
        @update:selected-file-id="handleSelectPreviewFile"
      />

      <el-dialog
        v-model="showCreateProjectDialog"
        class="app-form-dialog create-project-wizard-dialog"
        title="新建项目"
        width="680px"
        :close-on-click-modal="!isCreateProjectBusy"
        :close-on-press-escape="!isCreateProjectBusy"
        :show-close="!isCreateProjectBusy"
        @closed="resetCreateProjectWizard"
      >
        <div class="create-project-wizard-body" :class="{ 'is-uploading': smartFolderUploadLoading }">
          <el-form label-position="top" class="create-project-wizard-form">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="项目名称" required>
                  <el-input
                    v-model.trim="newProjectForm.projectName"
                    placeholder="请输入项目名称"
                    maxlength="30"
                    :disabled="isCreateProjectBusy"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="项目时间" required>
                  <el-date-picker
                    v-model="newProjectForm.projectTime"
                    type="date"
                    value-format="YYYY-MM-DD"
                    format="YYYY-MM-DD"
                    placeholder="请选择项目时间"
                    style="width: 100%;"
                    :disabled="isCreateProjectBusy"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <SmartFolderImportDialog
            embedded
            :scanned-entries="scannedEntries"
            :grouped-entries="groupedEntries"
            :survey-phase="surveyPhase"
            :selected-count="selectedCount"
            :has-scan-result="hasScanResult"
            :upload-loading="smartFolderUploadLoading"
            :scan-loading="smartFolderScanLoading"
            :upload-progress="smartFolderUploadProgress"
            :get-file-upload-state="getSmartFolderUploadState"
            :upload-items="smartFolderUploadItems"
            @update:survey-phase="(val) => (surveyPhase = val)"
            @folder-input-change="handleFolderInputChange"
            @folder-drop="handleFolderDrop"
            @toggle-selected="setEntrySelected"
            @change-context-type="setEntryContextType"
          />
        </div>
        <template #footer>
          <el-button :disabled="isCreateProjectBusy" @click="handleCreateProjectCancel">
            取消
          </el-button>
          <el-button type="primary" :loading="isCreateProjectBusy" @click="handleCreateProjectSubmit">
            {{ createSubmitLabel }}
          </el-button>
        </template>
      </el-dialog>

  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  nextTick,
  defineAsyncComponent
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataAnalysis, DocumentChecked, DocumentCopy, FolderOpened, Location, List, EditPen } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectHasMissingUsage } from '@/composables/file-upload/surveyUsagePending.js'
import { createProject } from '@/services/project.service'

import { usePrint } from '@/hooks/usePrint.ts'
import { useProjectSelector } from '@/composables/project-list/useProjectSelector'
import ProjectFilterBar from '@/components/project-list/ProjectFilterBar.vue'
import ProjectWorkspaceTabSkeleton from '@/components/project-list/ProjectWorkspaceTabSkeleton.vue'
import { useContractLandManagement } from '@/composables/project-list/useContractLandManagement'
import { useProjectEditManagement } from '@/composables/project-list/useProjectEditManagement'
import { useSurveySummary } from '@/composables/project-list/useSurveySummary'
import { useSurveyRefresh } from '@/composables/project-list/useSurveyRefresh'
import { useProjectExport } from '@/composables/project-list/useProjectExport'
import { resolveVisibleColumnDefs } from '@/composables/project-list/summaryExportColumnSchema.js'
import { loadSummaryLayoutFromStorage } from '@/composables/project-list/summaryExportLayoutStorage.js'
import { useProjectDetailDialog } from '@/composables/project-list/useProjectDetailDialog'
import { getArchiveFileRecordId } from '@/composables/project-list/archiveFolderQuery.js'
import SmartFolderImportDialog from '@/components/project-list/SmartFolderImportDialog.vue'
import { useSmartFolderImport } from '@/composables/project-list/useSmartFolderImport.js'
import { useProjectListWorkspace } from '@/composables/project-list/useProjectListWorkspace.js'

/** 归档 Tab 与其余 Tab / 弹窗异步分包，减轻首次进入「项目信息」的解析与下载耗时 */
const ArchiveFolderTab = defineAsyncComponent(() => import('@/components/project-list/ArchiveFolderTab.vue'))
const UnknownUsagePolicyCard = defineAsyncComponent(() =>
  import('@/components/project-list/UnknownUsagePolicyCard.vue')
)
const SummaryTableCard = defineAsyncComponent(() => import('@/components/project-list/SummaryTableCard.vue'))
const SummaryComparisonCard = defineAsyncComponent(() =>
  import('@/components/project-list/SummaryComparisonCard.vue')
)
const PrintSummaryBlock = defineAsyncComponent(() => import('@/components/project-list/PrintSummaryBlock.vue'))
const SummaryPrintExportDialog = defineAsyncComponent(() =>
  import('@/components/project-list/SummaryPrintExportDialog.vue')
)
const ProjectDetailDialog = defineAsyncComponent(() => import('@/components/project-list/ProjectDetailDialog.vue'))
const ContractEditDialog = defineAsyncComponent(() => import('@/components/project-list/ContractEditDialog.vue'))
const ContractWorkspaceDialog = defineAsyncComponent(() =>
  import('@/components/project-list/ContractWorkspaceDialog.vue')
)
const LandParcelEditDialog = defineAsyncComponent(() =>
  import('@/components/project-list/LandParcelEditDialog.vue')
)
const ProjectEditForm = defineAsyncComponent(() => import('@/components/project-list/ProjectEditForm.vue'))
const ContractLandTab = defineAsyncComponent(() => import('@/components/project-list/ContractLandTab.vue'))
const OperationAuditTab = defineAsyncComponent(() => import('@/components/project-list/OperationAuditTab.vue'))
const PlanningReviewTab = defineAsyncComponent(() => import('@/components/project-list/PlanningReviewTab.vue'))
const ProjectPartySummaryTab = defineAsyncComponent(() =>
  import('@/components/project-list/ProjectPartySummaryTab.vue')
)
const CapacityIndicatorTab = defineAsyncComponent(() =>
  import('@/components/project-list/CapacityIndicatorTab.vue')
)
const ArchiveFolderAuditStack = defineAsyncComponent(() =>
  import('@/components/project-list/archive/ArchiveFolderAuditStack.vue')
)

const { isPrinting, triggerPrint } = usePrint()

/** 房产实测汇总：打印 / 导出共用列布局（本地持久化） */
const summaryLayoutRows = ref(loadSummaryLayoutFromStorage())
const summaryLayoutDialogVisible = ref(false)
const resolvedSummaryMainColumns = computed(() => resolveVisibleColumnDefs(summaryLayoutRows.value))

const openSummaryPrintExportSettings = () => {
  summaryLayoutDialogVisible.value = true
}

const handleSummaryAfterPrintRequest = async () => {
  if (projectHasMissingUsage(displayTableData.value)) {
    try {
      await ElMessageBox.confirm(
        '当前项目存在用途缺失的户室，打印数据可能不完整。是否仍要继续打印？',
        '打印确认',
        { type: 'warning', confirmButtonText: '继续打印', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  await nextTick()
  triggerPrint()
}

const handleSummaryAfterExportRequest = () => {
  runExportExcel()
}


const route = useRoute()
const router = useRouter()
const archiveTabRef = ref(null)
const workspaceAuditStackRef = ref(null)
const workspaceQueryLoading = ref(false)

// 页面状态
const activeTab = ref('archives')
const showCreateProjectDialog = ref(false)
const createProjectLoading = ref(false)
const {
  scannedEntries,
  groupedEntries,
  surveyPhase,
  selectedCount,
  hasScanResult,
  uploadLoading: smartFolderUploadLoading,
  uploadProgress: smartFolderUploadProgress,
  scanLoading: smartFolderScanLoading,
  importedRootFolderName,
  resetScan: resetSmartFolderScan,
  handleFolderInputChange,
  handleFolderDrop,
  setEntrySelected,
  setEntryContextType,
  getFileUploadState: getSmartFolderUploadState,
  uploadToProject,
  buildUploadItems
} = useSmartFolderImport()
const smartFolderUploadItems = computed(() => buildUploadItems())
const isCreateProjectBusy = computed(() => createProjectLoading.value || smartFolderUploadLoading.value)
const createSubmitLabel = computed(() => {
  if (smartFolderUploadLoading.value) return '上传中…'
  if (createProjectLoading.value) return '创建中…'
  return selectedCount.value > 0 ? '创建并上传' : '立即创建'
})
const newProjectForm = ref({
  projectName: '',
  projectTime: ''
})

const applySuggestedProjectName = (folderName) => {
  const suggested = String(folderName || '').trim()
  if (!suggested) return
  if ((newProjectForm.value.projectName || '').trim()) return
  newProjectForm.value.projectName = suggested.slice(0, 30)
}

watch(importedRootFolderName, (name) => {
  applySuggestedProjectName(name)
})


const {
  rawTableData,
  unknownUsages,
  displayTableData,
  areaComparison,
  selectedComparisonGroups,
  surveyStats,
  surveyLoading,
  fetchSurveyReports,
  resetSummaryMetrics
} = useSurveySummary()




// --- 核心 API 逻辑 ---

// 1. 获取项目列表
const currentPrintDate = computed(() => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

const {
  filterProject,
  projectOptions,
  currentProjectInfo,
  fetchProjects: fetchProjectList,
  searchProjects,
  ensureProjectOption,
  applyProjectMeta
} = useProjectSelector()

const applyCurrentProjectMeta = (projectId) => applyProjectMeta(projectId)

const {
  detailDialogVisible,
  roomInfoData,
  detailLoading,
  currentDetailRow,
  reportAuditInfo,
  reportBasicInfoForm,
  reportBasicInfoSaving,
  viewDetail,
  saveReportBasicInfo
} = useProjectDetailDialog({
  currentProjectInfo,
  rawTableData,
  fetchSurveyReports
})

const resolveAuditFileRecordId = (row) => {
  const raw = row?.fileRecordId || row?.fileId || row?.file_record_id || row?.sourceFileRecordId || row?.source_file_record_id
  return raw ? String(raw) : ''
}

const canJumpAuditFromDetail = computed(() => !!resolveAuditFileRecordId(currentDetailRow.value))

const handleArchiveRowAudit = (row) => {
  workspaceAuditStackRef.value?.handleAudit(row)
}

const refreshWorkspaceAfterFileAudit = async () => {
  const pid = currentProjectInfo.id
  if (!pid) return
  if (activeTab.value === 'archives') {
    await archiveTabRef.value?.refreshFiles?.()
    return
  }
  if (activeTab.value === 'summary') {
    await fetchSurveyReports(pid)
  }
}

const handleJumpAuditFromDetail = async (row) => {
  const fileRecordId = resolveAuditFileRecordId(row)
  if (!fileRecordId) {
    ElMessage.warning('当前记录缺少 fileRecordId，无法直达审核')
    return
  }
  await handleOpenAuditByFileRecordId(fileRecordId)
}



const {
  refreshBtnLoading,
  isRefreshCd,
  cdRemaining,
  handleRefreshSurveyData,
  resetRefreshCdStatus,
  restoreRefreshCdStatus,
  clearRefreshTimer
} = useSurveyRefresh({
  currentProjectInfo,
  fetchSurveyReports
})

const parsedRefreshLoading = ref(false)
const handleRefreshParsedOnly = async () => {
  if (!currentProjectInfo.id) {
    ElMessage.warning('请先选择项目后再刷新')
    return
  }
  parsedRefreshLoading.value = true
  try {
    const ok = await fetchSurveyReports(currentProjectInfo.id)
    if (ok) {
      ElMessage.success('已刷新已解析实测报告数据')
    }
  } catch (error) {
    console.error('刷新已解析列表失败:', error)
    ElMessage.error('刷新失败，请稍后重试')
  } finally {
    parsedRefreshLoading.value = false
  }
}
const { runExportExcel } = useProjectExport({
  displayTableData,
  currentProjectInfo,
  areaComparison,
  selectedComparisonGroups,
  summaryLayoutRows
})
// ===== 合同表单相关（补充注释）=====
const {
  contractLandList,
  selectedContract,
  currentLandParcelList,
  contractDialogVisible,
  contractWorkspaceVisible,
  contractWorkspacePdfUrl,
  contractWorkspacePdfLoading,
  contractWorkspaceFileName,
  contractFileOptions,
  contractFileOptionsLoading,
  selectedPreviewFileId,
  contractForm,
  contractFormRules,
  contractFormLoading,
  setContractFormRef,
  submitContractForm,
  landParcelDialogVisible,
  landParcelForm,
  landParcelFormRules,
  landParcelFormLoading,
  setLandParcelFormRef,
  submitLandParcelForm,
  fetchContractListByProjectId,
  handleContractRowClick,
  addContract,
  editContract,
  deleteContract,
  addLandParcel,
  editLandParcel,
  deleteLandParcel,
  handleSelectPreviewFile
} = useContractLandManagement({
  filterProject,
  currentProjectInfo,
  onContractLandChanged: async () => {
    if (!currentProjectInfo.id) return
    await fetchSurveyReports(currentProjectInfo.id)
  }
})

const contractRefreshLoading = ref(false)

const handleRefreshContracts = async () => {
  if (!currentProjectInfo.id) {
    ElMessage.warning('请先查询项目后再刷新合同')
    return
  }
  contractRefreshLoading.value = true
  try {
    const ok = await fetchContractListByProjectId(currentProjectInfo.id)
    if (ok) {
      ElMessage.success('合同列表已更新')
    }
  } finally {
    contractRefreshLoading.value = false
  }
}

/** 归档「合同」夹：审核 → 打开与「合同及地块信息」中「编辑」相同的全屏合同工作区 */
const handleContractArchiveAudit = async (row) => {
  const fileRecordId = String(getArchiveFileRecordId(row) || '').trim()
  if (!fileRecordId) {
    ElMessage.warning('缺少文件记录ID，无法打开合同工作区')
    return
  }
  const pid = String(currentProjectInfo.id || filterProject.value || '').trim()
  if (!pid) {
    ElMessage.warning('请先选择项目')
    return
  }
  await fetchContractListByProjectId(pid)
  const match = contractLandList.value.find((c) => String(c.fileRecordId || '') === fileRecordId)
  if (!match?.id) {
    ElMessage.warning(
      '未找到与该文件关联的合同记录。请确认合同已解析入库，或在「合同及地块信息」中刷新合同列表后重试。'
    )
    return
  }
  editContract(match)
}

const {
  initialArchiveId,
  pageRouteActive,
  projectOptionsLoading,
  projectWorkspaceBootstrapping,
  ensureProjectOptionsLoaded,
  handleGlobalSearch,
  loadActiveTabData,
  handleOpenAuditByFileRecordId,
  handlePendingAuditConsumed
} = useProjectListWorkspace({
  route,
  router,
  activeTab,
  filterProject,
  currentProjectInfo,
  projectOptions,
  fetchProjectList,
  ensureProjectOption,
  applyProjectMeta: applyCurrentProjectMeta,
  fetchSurveyReports,
  fetchContractListByProjectId,
  resetSummaryMetrics,
  restoreRefreshCdStatus,
  clearRefreshTimer,
  resetRefreshCdStatus,
  showCreateProjectDialog,
  workspaceAuditStackRef,
  workspaceQueryLoading
})

const {
  projectEditLoading,
  projectUpdateForm,
  projectEditRules,
  setProjectEditRef,
  submitProjectUpdate
} = useProjectEditManagement({
  activeTab,
  filterProject,
  currentProjectInfo,
  fetchProjectList,
  applyProjectMeta,
  reloadActiveTabData: loadActiveTabData
})

const resetCreateProjectWizard = () => {
  newProjectForm.value = { projectName: '', projectTime: '' }
  resetSmartFolderScan()
}

const enterCreatedProject = async (projectId, projectName) => {
  showCreateProjectDialog.value = false
  resetCreateProjectWizard()

  await fetchProjectList()
  const targetId = projectId || projectOptions.value.find((item) => item.name === projectName)?.id
  if (targetId) {
    filterProject.value = targetId
    activeTab.value = 'archives'
    await handleGlobalSearch()
  }
}

const handleCreateProjectCancel = () => {
  if (isCreateProjectBusy.value) return
  showCreateProjectDialog.value = false
}

const handleCreateProjectSubmit = async () => {
  const projectName = (newProjectForm.value.projectName || '').trim()
  const projectTime = (newProjectForm.value.projectTime || '').trim()
  if (!projectName) {
    ElMessage.warning('请输入项目名称')
    return
  }
  if (!projectTime) {
    ElMessage.warning('请选择项目时间')
    return
  }

  createProjectLoading.value = true
  let projectId = null
  try {
    const res = await createProject(projectName, projectTime)
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '项目创建失败')
      return
    }

    projectId = res.data?.data?.id ?? null
    const shouldUpload = hasScanResult.value && selectedCount.value > 0

    if (shouldUpload && projectId) {
      createProjectLoading.value = false
      const result = await uploadToProject(projectId)
      if (result.cancelled) {
        ElMessage.info('项目已创建，上传已取消')
        await enterCreatedProject(projectId, projectName)
        return
      }
      if (result.successCount === 0) {
        ElMessage.warning('项目已创建，但文件未能上传成功')
        await enterCreatedProject(projectId, projectName)
        return
      }
      await enterCreatedProject(projectId, projectName)
      return
    }

    ElMessage.success(res.data?.msg || '项目创建成功')
    await enterCreatedProject(projectId, projectName)
  } catch (error) {
    console.error('项目创建失败:', error)
    ElMessage.error(error?.response?.data?.msg || '项目创建失败')
  } finally {
    createProjectLoading.value = false
  }
}

</script>

<style scoped>
.archive-container {
  padding: 14px;
  background-color: var(--biz-page-bg);
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.archive-container--fill {
  /* 保留语义类名，与上方 flex 链一致 */
}

.content-tabs-wrapper {
  background: linear-gradient(180deg, #ffffff 0%, var(--home-panel-grad-start) 100%);
  border-radius: var(--home-card-radius);
  border: 1px solid var(--home-soft-border);
  box-shadow: var(--home-soft-shadow);
}

.content-tabs-wrapper--fill {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-content {
  padding: 12px 14px 14px;
  box-sizing: border-box;
}

.tab-content--scroll {
  min-height: 100%;
}

:deep(.archive-tabs.el-tabs--border-card) {
  border: 1px solid transparent;
  border-radius: var(--home-card-radius);
  box-shadow: none;
  background: transparent;
}

:deep(.archive-tabs.archive-tabs--fill.el-tabs--border-card) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

:deep(.archive-tabs.el-tabs--border-card > .el-tabs__header) {
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--home-header-grad-start) 0%, var(--home-header-grad-end) 100%);
  border-bottom: 1px solid var(--home-soft-border);
  padding: 0 8px;
}

:deep(.archive-tabs .el-tabs__item) {
  height: 48px;
  color: var(--home-tab-text);
  font-weight: 600;
  font-size: 15px;
  border-radius: 8px 8px 0 0;
  margin-top: 4px;
}

:deep(.archive-tabs .custom-tab-label) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}

:deep(.archive-tabs .el-tabs__item.is-active) {
  color: var(--home-tab-active);
  background: #ffffff;
}

:deep(.archive-tabs .el-tabs__content) {
  background: #fff;
  padding: 2px;
}

:deep(.archive-tabs.archive-tabs--fill .el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

:deep(.archive-tabs .el-tab-pane.workspace-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.archive-tabs .el-tab-pane.workspace-tab-pane--scroll) {
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

:deep(.archive-tabs .el-button) {
  border-radius: 6px;
  font-weight: 600;
}

:deep(.archive-tabs .el-button--primary) {
  background: var(--biz-btn-soft-bg);
  border-color: #c8ddf1;
  color: var(--biz-btn-soft-text);
}

.create-project-wizard-body {
  max-height: min(72vh, 720px);
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
}

.create-project-wizard-body.is-uploading {
  overflow: visible;
}

.create-project-wizard-form {
  margin-bottom: 0;
}

.create-project-wizard-form :deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 100%;
}

.create-project-wizard-form :deep(.el-row > .el-col:first-child) {
  padding-left: 0 !important;
}

.create-project-wizard-form :deep(.el-row > .el-col:last-child) {
  padding-right: 0 !important;
}

.create-project-wizard-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.create-project-wizard-dialog :deep(.el-dialog__body) {
  overflow-x: hidden;
}
</style>
