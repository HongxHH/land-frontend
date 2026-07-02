import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSurveyRoomInfo, querySurveyReports, updateSurveyReportInfo } from '@/services/project.service'

const usageCategoryMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业/办公',
  MANAGEMENT: '物管用房',
  COMMUNITY: '社区用房',
  OTHER_BUILDABLE: '其他计容',
  OTHER_PUBLIC: '其他公用',
  UNKNOWN: '未知'
}

export function useProjectDetailDialog({ currentProjectInfo, rawTableData, fetchSurveyReports }) {
  const detailDialogVisible = ref(false)
  const roomInfoData = ref([])
  const detailLoading = ref(false)
  const currentDetailRow = ref(null)
  const reportAuditInfo = reactive({
    pendingConfirmArea: '0.00',
    unknownUsageCount: 0,
    hasUnknownUsage: 0,
    isVerified: 0,
    verificationErrorReason: '-',
    roomInfoBuildingAreaSumFromOcr: '0.00',
    roomInfoInnerAreaSumFromOcr: '0.00',
    roomInfoBalconyAreaSumFromOcr: '0.00',
    roomInfoSharedAreaSumFromOcr: '0.00'
  })
  const reportBasicInfoForm = reactive({
    id: '',
    propertyCertificateNumber: '',
    propertyAreaConfirmationNoticeNumber: ''
  })
  const reportBasicInfoSaving = ref(false)

  const resetAuditInfo = () => {
    Object.assign(reportAuditInfo, {
      pendingConfirmArea: '0.00',
      unknownUsageCount: 0,
      hasUnknownUsage: 0,
      isVerified: 0,
      verificationErrorReason: '-',
      roomInfoBuildingAreaSumFromOcr: '0.00',
      roomInfoInnerAreaSumFromOcr: '0.00',
      roomInfoBalconyAreaSumFromOcr: '0.00',
      roomInfoSharedAreaSumFromOcr: '0.00'
    })
  }

  const viewDetail = async (row) => {
    if (!currentProjectInfo.id || !row.id) {
      ElMessage.warning('缺少项目/报告 ID，无法查看详情')
      return
    }

    detailLoading.value = true
    detailDialogVisible.value = true
    currentDetailRow.value = row ? { ...row } : null
    reportBasicInfoForm.id = String(row.id || '')
    reportBasicInfoForm.propertyCertificateNumber = row?.certNo && row.certNo !== '-' ? row.certNo : ''
    reportBasicInfoForm.propertyAreaConfirmationNoticeNumber =
      row?.areaConfirmationNoticeNo && row.areaConfirmationNoticeNo !== '-' ? row.areaConfirmationNoticeNo : ''

    try {
      resetAuditInfo()

      try {
        const reportRes = await querySurveyReports({
          surveyReportInfoId: Number(row.id),
          pageNum: 1,
          pageSize: 1,
          sortField: 'createTime',
          sortDirection: 'desc'
        })
        const reportRecord = reportRes?.data?.data?.records?.[0]
        if (reportRes?.data?.code === 200 && reportRecord) {
          reportBasicInfoForm.id = String(reportRecord.id || row.id || '')
          reportBasicInfoForm.propertyCertificateNumber = reportRecord.propertyCertificateNumber || ''
          reportBasicInfoForm.propertyAreaConfirmationNoticeNumber =
            reportRecord.propertyAreaConfirmationNoticeNumber || ''

          reportAuditInfo.pendingConfirmArea = Number(reportRecord.pendingConfirmArea || 0).toFixed(2)
          reportAuditInfo.unknownUsageCount = Number(reportRecord.unknownUsageCount || 0)
          reportAuditInfo.hasUnknownUsage = Number(reportRecord.hasUnknownUsage || 0)
          reportAuditInfo.isVerified = Number(reportRecord.isVerified || 0)
          reportAuditInfo.verificationErrorReason = reportRecord.verificationErrorReason || '-'
          reportAuditInfo.roomInfoBuildingAreaSumFromOcr = Number(reportRecord.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2)
          reportAuditInfo.roomInfoInnerAreaSumFromOcr = Number(reportRecord.roomInfoInnerAreaSumFromOcr || 0).toFixed(2)
          reportAuditInfo.roomInfoBalconyAreaSumFromOcr = Number(reportRecord.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2)
          reportAuditInfo.roomInfoSharedAreaSumFromOcr = Number(reportRecord.roomInfoSharedAreaSumFromOcr || 0).toFixed(2)
        }
      } catch (error) {
        console.error('获取实测报告校验信息失败:', error)
      }

      const res = await getSurveyRoomInfo(currentProjectInfo.id, row.id)
      if (res.data.code === 200 && Array.isArray(res.data.data)) {
        roomInfoData.value = res.data.data.map((item) => ({
          id: item.id,
          roomLevel: item.roomLevel || '-',
          roomNumber: item.roomNumber || '-',
          buildingArea: (item.buildingArea || 0).toFixed(2),
          innerArea: (item.innerArea || 0).toFixed(2),
          balconyArea: (item.balconyArea || 0).toFixed(2),
          sharedArea: (item.sharedArea || 0).toFixed(2),
          isCalculate: item.isCalculate || 0,
          usageCategory: usageCategoryMap[item.usageCategory] || '未知',
          roomUsage: item.roomUsage || '-',
          floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
        }))
      } else {
        roomInfoData.value = []
        ElMessage.warning('暂无户室面积数据')
      }
    } catch (error) {
      console.error('获取户室面积失败:', error)
      ElMessage.error('获取户室面积数据失败，请重试')
      roomInfoData.value = []
    } finally {
      detailLoading.value = false
    }
  }

  const saveReportBasicInfo = async () => {
    if (!reportBasicInfoForm.id) {
      ElMessage.warning('缺少实测报告ID，无法保存')
      return
    }

    reportBasicInfoSaving.value = true
    try {
      const payload = {
        id: Number(reportBasicInfoForm.id),
        propertyCertificateNumber: (reportBasicInfoForm.propertyCertificateNumber || '').trim(),
        propertyAreaConfirmationNoticeNumber: (reportBasicInfoForm.propertyAreaConfirmationNoticeNumber || '').trim()
      }
      const res = await updateSurveyReportInfo(payload)
      if (res?.data?.code !== 200) {
        ElMessage.error(res?.data?.msg || '保存失败，请重试')
        return
      }

      const target = rawTableData.value.find((item) => String(item.id) === String(reportBasicInfoForm.id))
      if (target) {
        target.certNo = payload.propertyCertificateNumber || '-'
        target.areaConfirmationNoticeNo = payload.propertyAreaConfirmationNoticeNumber || '-'
      }
      if (currentDetailRow.value) {
        currentDetailRow.value = {
          ...currentDetailRow.value,
          certNo: payload.propertyCertificateNumber || '-',
          areaConfirmationNoticeNo: payload.propertyAreaConfirmationNoticeNumber || '-'
        }
      }

      if (currentProjectInfo.id) {
        await fetchSurveyReports(currentProjectInfo.id)
      }

      ElMessage.success('补录信息已保存')
    } catch (error) {
      console.error('保存实测报告基础信息失败:', error)
      ElMessage.error('保存失败，请重试')
    } finally {
      reportBasicInfoSaving.value = false
    }
  }

  return {
    detailDialogVisible,
    roomInfoData,
    detailLoading,
    currentDetailRow,
    reportAuditInfo,
    reportBasicInfoForm,
    reportBasicInfoSaving,
    viewDetail,
    saveReportBasicInfo
  }
}
