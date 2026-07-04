import { ref, computed, watch, nextTick, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectHasMissingUsage } from '@/composables/file-upload/surveyUsagePending.js'
import { createProject } from '@/services/project.service'
import { usePrint } from '@/hooks/usePrint.ts'
import { useProjectSelector } from '@/composables/project-list/useProjectSelector'
import { useContractLandManagement } from '@/composables/project-list/useContractLandManagement'
import { useProjectEditManagement } from '@/composables/project-list/useProjectEditManagement'
import { useSurveySummary } from '@/composables/project-list/useSurveySummary'
import { useSurveyRefresh } from '@/composables/project-list/useSurveyRefresh'
import { useProjectExport } from '@/composables/project-list/useProjectExport'
import { resolveVisibleColumnDefs } from '@/composables/project-list/summaryExportColumnSchema.js'
import { loadSummaryLayoutFromStorage } from '@/composables/project-list/summaryExportLayoutStorage.js'
import { useProjectDetailDialog } from '@/composables/project-list/useProjectDetailDialog'
import { getArchiveFileRecordId } from '@/composables/project-list/archiveFolderQuery.js'
import { useSmartFolderImport } from '@/composables/project-list/useSmartFolderImport.js'
import { useProjectListWorkspace } from '@/composables/project-list/useProjectListWorkspace.js'

export const PROJECT_LIST_TABS_KEY = Symbol('projectListTabs')
export const PROJECT_LIST_OVERLAYS_KEY = Symbol('projectListOverlays')

export function useProjectListPage() {
  const { isPrinting, triggerPrint } = usePrint()

  const summaryLayoutRows = ref(loadSummaryLayoutFromStorage())
  const summaryLayoutDialogVisible = ref(false)
  const resolvedSummaryMainColumns = computed(() =>
    resolveVisibleColumnDefs(summaryLayoutRows.value)
  )

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
    buildUploadItems,
  } = useSmartFolderImport()
  const smartFolderUploadItems = computed(() => buildUploadItems())
  const isCreateProjectBusy = computed(
    () => createProjectLoading.value || smartFolderUploadLoading.value
  )
  const createSubmitLabel = computed(() => {
    if (smartFolderUploadLoading.value) return '上传中…'
    if (createProjectLoading.value) return '创建中…'
    return selectedCount.value > 0 ? '创建并上传' : '立即创建'
  })
  const newProjectForm = ref({
    projectName: '',
    projectTime: '',
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
    resetSummaryMetrics,
  } = useSurveySummary()

  const currentPrintDate = computed(() => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  const {
    filterProject,
    projectOptions,
    currentProjectInfo,
    fetchProjects: fetchProjectList,
    searchProjects,
    ensureProjectOption,
    applyProjectMeta,
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
    saveReportBasicInfo,
  } = useProjectDetailDialog({
    currentProjectInfo,
    rawTableData,
    fetchSurveyReports,
  })

  const resolveAuditFileRecordId = (row) => {
    const raw =
      row?.fileRecordId ||
      row?.fileId ||
      row?.file_record_id ||
      row?.sourceFileRecordId ||
      row?.source_file_record_id
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
    clearRefreshTimer,
  } = useSurveyRefresh({
    currentProjectInfo,
    fetchSurveyReports,
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
    summaryLayoutRows,
  })

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
    handleSelectPreviewFile,
  } = useContractLandManagement({
    filterProject,
    currentProjectInfo,
    onContractLandChanged: async () => {
      if (!currentProjectInfo.id) return
      await fetchSurveyReports(currentProjectInfo.id)
    },
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
    handlePendingAuditConsumed,
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
    workspaceQueryLoading,
  })

  const {
    projectEditLoading,
    projectUpdateForm,
    projectEditRules,
    setProjectEditRef,
    submitProjectUpdate,
  } = useProjectEditManagement({
    activeTab,
    filterProject,
    currentProjectInfo,
    fetchProjectList,
    applyProjectMeta,
    reloadActiveTabData: loadActiveTabData,
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

  const page = {
    filterBar: {
      filterProject,
      projectOptions,
      currentProjectInfo,
      projectOptionsLoading,
      searchProjects,
      ensureProjectOptionsLoaded,
      handleGlobalSearch,
      showCreateProjectDialog,
    },
    tabs: {
      activeTab,
      archiveTabRef,
      projectWorkspaceBootstrapping,
      workspaceQueryLoading,
      pageRouteActive,
      initialArchiveId,
      currentProjectInfo,
      handleArchiveRowAudit,
      unknownUsages,
      handleOpenAuditByFileRecordId,
      surveyStats,
      surveyLoading,
      refreshBtnLoading,
      parsedRefreshLoading,
      isRefreshCd,
      cdRemaining,
      displayTableData,
      handleRefreshSurveyData,
      handleRefreshParsedOnly,
      viewDetail,
      openSummaryPrintExportSettings,
      areaComparison,
      selectedComparisonGroups,
      contractLandList,
      selectedContract,
      currentLandParcelList,
      contractRefreshLoading,
      handleRefreshContracts,
      addContract,
      handleContractRowClick,
      editContract,
      deleteContract,
      addLandParcel,
      editLandParcel,
      deleteLandParcel,
      projectUpdateForm,
      projectEditRules,
      projectEditLoading,
      setProjectEditRef,
      submitProjectUpdate,
    },
    overlays: {
      workspaceAuditStackRef,
      currentProjectInfo,
      pageRouteActive,
      refreshWorkspaceAfterFileAudit,
      handleContractArchiveAudit,
      handlePendingAuditConsumed,
      isPrinting,
      resolvedSummaryMainColumns,
      currentPrintDate,
      displayTableData,
      areaComparison,
      selectedComparisonGroups,
      summaryLayoutDialogVisible,
      summaryLayoutRows,
      handleSummaryAfterPrintRequest,
      handleSummaryAfterExportRequest,
      detailDialogVisible,
      reportAuditInfo,
      roomInfoData,
      detailLoading,
      currentDetailRow,
      canJumpAuditFromDetail,
      reportBasicInfoForm,
      reportBasicInfoSaving,
      handleJumpAuditFromDetail,
      saveReportBasicInfo,
      contractDialogVisible,
      contractForm,
      contractFormRules,
      contractFormLoading,
      setContractFormRef,
      submitContractForm,
      contractWorkspaceVisible,
      contractWorkspacePdfUrl,
      contractWorkspacePdfLoading,
      contractWorkspaceFileName,
      contractFileOptions,
      contractFileOptionsLoading,
      selectedPreviewFileId,
      handleSelectPreviewFile,
      landParcelDialogVisible,
      landParcelForm,
      landParcelFormRules,
      landParcelFormLoading,
      setLandParcelFormRef,
      submitLandParcelForm,
      showCreateProjectDialog,
      isCreateProjectBusy,
      resetCreateProjectWizard,
      newProjectForm,
      scannedEntries,
      groupedEntries,
      surveyPhase,
      selectedCount,
      hasScanResult,
      smartFolderUploadLoading,
      smartFolderScanLoading,
      smartFolderUploadProgress,
      getSmartFolderUploadState,
      smartFolderUploadItems,
      handleCreateProjectCancel,
      handleCreateProjectSubmit,
      createSubmitLabel,
      handleFolderInputChange,
      handleFolderDrop,
      setEntrySelected,
      setEntryContextType,
    },
  }

  provide(PROJECT_LIST_TABS_KEY, page.tabs)
  provide(PROJECT_LIST_OVERLAYS_KEY, page.overlays)

  return { page }
}
