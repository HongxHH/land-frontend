import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import {
  getParsedSurveyReportsByProject,
  queryProjectAreaComparison,
} from '@/services/project.service'
import { getApiErrorMessage } from '@/utils/apiErrorMessage'
import { queryFiles } from '@/services/file.service'
import {
  aggregateProjectUnknownUsagesJson,
  buildMissingUsageGroupsByFile,
  buildUsageNameFileRecordMap,
  mergeUnknownUsagePolicyRows,
  projectHasPendingUnknownUsageRows,
} from '@/composables/file-upload/surveyUsagePending'
import { SUMMARY_COMPARISON_GROUP_KEYS } from '@/composables/project-list/summaryComparisonGroupMeta.js'

function normalizeVerifiedFlag(value) {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

const COMPARISON_GROUP_KEYS = SUMMARY_COMPARISON_GROUP_KEYS

const createEmptyTripleLines = () => ({
  totalBuilding: { contractAgreedArea: null, buildableArea: null, difference: null },
  commercial: { contractAgreedArea: null, buildableArea: null, difference: null },
  residential: { contractAgreedArea: null, buildableArea: null, difference: null },
})

const createEmptyAreaComparison = () => ({
  systemCalculated: createEmptyTripleLines(),
  projectPartyDeclared: createEmptyTripleLines(),
  planningCalculated: createEmptyTripleLines(),
  capacityIndicatorCalculated: createEmptyTripleLines(),
  consistencyFlags: [],
  dataCompleteness: {
    systemCalculatedAvailable: false,
    projectPartyDeclaredAvailable: false,
    planningCalculatedAvailable: false,
    capacityIndicatorCalculatedAvailable: false,
  },
})

export function useSurveySummary() {
  const rawTableData = ref([])
  const unknownUsages = ref([])
  const displayTableData = computed(() => rawTableData.value)
  const requestSeq = ref(0)
  let surveyAbortController = null

  const isAbortError = (error) =>
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError'
  const areaComparison = ref(createEmptyAreaComparison())
  const selectedComparisonGroups = ref([...COMPARISON_GROUP_KEYS])
  const uploadedSurveyReportTotal = ref(0)
  const surveyLoading = ref(false)

  const surveyStats = computed(() => {
    const verifiedCount = rawTableData.value.filter(
      (item) => normalizeVerifiedFlag(item.isVerified) === 1
    ).length
    const unverifiedCount = rawTableData.value.filter(
      (item) => normalizeVerifiedFlag(item.isVerified) === 0
    ).length
    return {
      total: Number(uploadedSurveyReportTotal.value || 0),
      success: rawTableData.value.length,
      verified: verifiedCount,
      unverified: unverifiedCount,
    }
  })

  const refreshUnknownUsagePolicyRows = async (projectId, tableRows) => {
    if (!projectHasPendingUnknownUsageRows(tableRows)) {
      unknownUsages.value = []
      return
    }

    const aggregatedJson = aggregateProjectUnknownUsagesJson(tableRows)
    let apiRows = []
    try {
      const res = await axios.get(`/api/usage-config/unknown/project/${projectId}`)
      if (res.data?.code === 200 && Array.isArray(res.data?.data)) {
        apiRows = res.data.data
      }
    } catch (error) {
      console.error('未知用途加载失败:', error)
    }
    unknownUsages.value = mergeUnknownUsagePolicyRows(aggregatedJson, apiRows, {
      fileRecordIdByUsage: buildUsageNameFileRecordMap(tableRows),
      missingUsageSourceGroups: buildMissingUsageGroupsByFile(tableRows),
    })
  }

  const fetchUploadedSurveyReportTotal = async (projectId) => {
    if (!projectId) return 0
    try {
      const res = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        projectId: Number(projectId),
        fileContextType: 'SURVEY_REPORT',
      })
      const total = Number(res?.data?.data?.total || 0)
      return Number.isFinite(total) ? total : 0
    } catch (error) {
      console.error('查询已上传实测报告总数失败:', error)
      return 0
    }
  }

  const fetchSurveyReports = async (projectId) => {
    if (!projectId) {
      surveyAbortController?.abort()
      surveyAbortController = null
      resetSummaryMetrics()
      return false
    }

    surveyAbortController?.abort()
    surveyAbortController = new AbortController()
    const { signal } = surveyAbortController
    const currentSeq = ++requestSeq.value

    rawTableData.value = []
    unknownUsages.value = []
    surveyLoading.value = true

    try {
      const [surveyRes, uploadedTotal, comparisonRes] = await Promise.all([
        getParsedSurveyReportsByProject(projectId, { signal }),
        fetchUploadedSurveyReportTotal(projectId),
        queryProjectAreaComparison(projectId, { signal }),
      ])
      if (currentSeq !== requestSeq.value) return true

      uploadedSurveyReportTotal.value = uploadedTotal
      areaComparison.value =
        comparisonRes?.data?.code === 200 && comparisonRes?.data?.data
          ? comparisonRes.data.data
          : createEmptyAreaComparison()

      if (surveyRes.data?.code !== 200 || !Array.isArray(surveyRes.data?.data)) {
        rawTableData.value = []
        return true
      }

      const surveyData = surveyRes.data.data
      rawTableData.value = surveyData.map((item) => ({
        id: item.id || '-',
        fileRecordId:
          item.fileRecordId ||
          item.fileId ||
          item.file_record_id ||
          item.sourceFileRecordId ||
          item.source_file_record_id ||
          '',
        archiveId: item.archiveId || item.archive_id || '',
        projectName: item.buildingName || '未知楼栋',
        certNo: item.propertyCertificateNumber || '-',
        contractNo:
          item.contractApprovalNumber != null && String(item.contractApprovalNumber).trim() !== ''
            ? String(item.contractApprovalNumber).trim()
            : '-',
        areaConfirmationNoticeNo: item.propertyAreaConfirmationNoticeNumber || '-',
        phase: item.phase || '-',
        totalArea: (item.actualTotalBuildingArea || 0).toFixed(2),
        calcCommercial: (item.actualCommercialArea || 0).toFixed(2),
        calcResidential: (item.actualResidentialArea || 0).toFixed(2),
        calcPropMgmt: (item.actualManagementRoomArea || 0).toFixed(2),
        calcOther: (item.actualOtherBuildableArea || 0).toFixed(2),
        nonCalcCommunity: (item.actualCommunityArea || 0).toFixed(2),
        nonCalcOther: (item.actualOtherPublicArea || 0).toFixed(2),
        reportNo: item.realEstateSurveyReportNumber || '-',
        fileOriginalName: item.fileOriginalName || item.originalName || '-',
        remarks: item.remark || '-',
        pendingConfirmArea: item.pendingConfirmArea || 0,
        unknownUsages: item.unknownUsages || '[]',
        unknownUsageCount: item.unknownUsageCount || 0,
        isVerified: normalizeVerifiedFlag(item.isVerified),
        hasUnknownUsage: item.hasUnknownUsage || 0,
        verificationErrorReason: item.verificationErrorReason || '-',
        roomInfoBuildingAreaSum: item.roomInfoBuildingAreaSum || 0,
        roomInfoInnerAreaSum: item.roomInfoInnerAreaSum || 0,
        roomInfoBalconyAreaSum: item.roomInfoBalconyAreaSum || 0,
        roomInfoSharedAreaSum: item.roomInfoSharedAreaSum || 0,
      }))

      await refreshUnknownUsagePolicyRows(projectId, rawTableData.value)
      return true
    } catch (error) {
      if (isAbortError(error) || currentSeq !== requestSeq.value) return true
      console.error('拉取汇总表数据失败:', error)
      resetSummaryMetrics()
      ElMessage.error(getApiErrorMessage(error, '汇总表数据加载失败，请重试'))
      return false
    } finally {
      if (currentSeq === requestSeq.value) {
        surveyLoading.value = false
      }
    }
  }

  const resetSummaryMetrics = () => {
    surveyAbortController?.abort()
    surveyAbortController = null
    surveyLoading.value = false
    rawTableData.value = []
    unknownUsages.value = []
    uploadedSurveyReportTotal.value = 0
    areaComparison.value = createEmptyAreaComparison()
    selectedComparisonGroups.value = [...COMPARISON_GROUP_KEYS]
  }

  return {
    rawTableData,
    unknownUsages,
    displayTableData,
    areaComparison,
    selectedComparisonGroups,
    surveyStats,
    surveyLoading,
    fetchSurveyReports,
    resetSummaryMetrics,
  }
}
