import { computed, ref } from 'vue'
import axios from 'axios'
import {
  enrichAuditSummaryFromVerificationReason,
  isAreaSumMissing,
} from '@/composables/file-upload/auditSummaryMetrics'
import { formatRoomAreaFromApi } from '@/utils/roomInfoValidation.js'
import { ElMessage } from 'element-plus'
import { downloadGridFsFile } from '@/services/file.service'
import { queryRoomInfos } from '@/services/project.service'

export function useCalibrationViewer({
  currentProject,
  showCalibration,
  currentFile,
  calibrationLoading,
  roomInfoLoading,
  roomInfoData,
  roomInfoTotal,
  roomInfoPageNum,
  roomInfoPageSize,
  roomSumInfo,
  auditSummaryData,
  usageCategoryMap,
}) {
  const currentViewType = ref('original')
  const preprocessGridfsId = ref('')
  const isPreprocessAvailable = computed(() => !!preprocessGridfsId.value)
  const recognitionMdContent = ref('')
  const recognitionMdLoading = ref(false)
  const calibrationPdfUrl = ref('')
  const pdfLoading = ref(false)
  const realSurveyReportId = ref(null)
  /** 打开校准会话代次：快速切换文件时丢弃过期异步结果 */
  const openGeneration = ref(0)

  const isCurrentGeneration = (generation) => generation === openGeneration.value

  const replaceCalibrationPdfUrl = (nextUrl = '') => {
    const prev = calibrationPdfUrl.value
    if (prev && prev !== nextUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(prev)
    }
    calibrationPdfUrl.value = nextUrl || ''
  }

  const resetLoadedBusinessData = () => {
    Object.assign(auditSummaryData, {
      pendingConfirmArea: '0.00',
      unknownUsages: '[]',
      unknownUsageCount: 0,
      isVerified: 0,
      hasUnknownUsage: 0,
      verificationErrorReason: '-',
      roomInfoBuildingAreaSum: '0.00',
      roomInfoInnerAreaSum: '0.00',
      roomInfoBalconyAreaSum: '0.00',
      roomInfoSharedAreaSum: '0.00',
      roomInfoBuildingAreaSumFromOcr: '0.00',
      roomInfoInnerAreaSumFromOcr: '0.00',
      roomInfoBalconyAreaSumFromOcr: '0.00',
      roomInfoSharedAreaSumFromOcr: '0.00',
    })
    roomInfoData.value = []
    if (roomInfoTotal) roomInfoTotal.value = 0
    if (roomInfoPageNum) roomInfoPageNum.value = 1
    realSurveyReportId.value = null
  }

  const loadRecognitionMd = async (fileRecordId, generation = openGeneration.value) => {
    if (!fileRecordId) {
      if (isCurrentGeneration(generation)) {
        recognitionMdContent.value = '# 缺少文件记录ID，无法加载识别内容'
      }
      return
    }

    if (isCurrentGeneration(generation)) {
      recognitionMdLoading.value = true
    }
    try {
      const res = await axios.post('/api/data-tables/ocr-execution-results/query', {
        fileRecordId,
        pageNum: 1,
        pageSize: 20,
        sortField: 'createTime',
        sortDirection: 'desc',
        loadGridFsPayload: true,
      })
      if (!isCurrentGeneration(generation)) return

      if (
        res.data.code === 200 &&
        Array.isArray(res.data.data.records) &&
        res.data.data.records.length > 0
      ) {
        const ocrResult = res.data.data.records[0]
        recognitionMdContent.value = ocrResult.markdownContent || '# 暂无识别内容（MD格式）'
      } else {
        recognitionMdContent.value = '# 未查询到OCR识别结果'
      }
    } catch (error) {
      if (!isCurrentGeneration(generation)) return
      console.error('MD 内容加载失败:', error)
      recognitionMdContent.value = '# 加载失败：' + (error.message || '网络异常')
    } finally {
      if (isCurrentGeneration(generation)) {
        recognitionMdLoading.value = false
      }
    }
  }

  const getPdfBlobUrl = async (gridfsId) => {
    if (!gridfsId) return ''
    try {
      const pdfRes = await downloadGridFsFile(gridfsId, { responseType: 'blob' })
      const blob = new Blob([pdfRes.data], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    } catch (error) {
      ElMessage.warning('PDF预览失败')
      return ''
    }
  }

  const switchView = async (viewType) => {
    if (currentViewType.value === viewType) return
    const generation = openGeneration.value
    calibrationLoading.value = true
    try {
      if (viewType === 'recognition') {
        await loadRecognitionMd(currentFile.value?.rawId, generation)
        if (!isCurrentGeneration(generation)) return
        currentViewType.value = viewType
        return
      }

      let targetGridfsId = ''
      if (viewType === 'original') {
        targetGridfsId = currentFile.value?.fileId || ''
      } else if (viewType === 'preprocess') {
        targetGridfsId = preprocessGridfsId.value || ''
      }

      const newPdfUrl = await getPdfBlobUrl(targetGridfsId)
      if (!isCurrentGeneration(generation)) {
        if (newPdfUrl && URL?.revokeObjectURL) URL.revokeObjectURL(newPdfUrl)
        return
      }
      if (newPdfUrl) {
        replaceCalibrationPdfUrl(newPdfUrl)
        currentViewType.value = viewType
      } else {
        ElMessage.warning('目标文件加载失败')
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        calibrationLoading.value = false
      }
    }
  }

  const resetCalibrationState = () => {
    openGeneration.value += 1
    currentViewType.value = 'original'
    preprocessGridfsId.value = ''
    replaceCalibrationPdfUrl('')
    recognitionMdContent.value = ''
    resetLoadedBusinessData()
  }

  const openCalibration = async (row) => {
    const generation = openGeneration.value + 1
    openGeneration.value = generation

    currentFile.value = row
    showCalibration.value = true
    calibrationLoading.value = true
    pdfLoading.value = true
    replaceCalibrationPdfUrl('')
    recognitionMdContent.value = ''
    resetLoadedBusinessData()
    preprocessGridfsId.value = row.preprocessGridfsId || ''
    currentViewType.value = 'original'

    try {
      const loadPdfTask = async () => {
        try {
          const initialPdfUrl = await getPdfBlobUrl(row.fileId)
          if (!isCurrentGeneration(generation)) {
            if (initialPdfUrl && URL?.revokeObjectURL) URL.revokeObjectURL(initialPdfUrl)
            return
          }
          if (initialPdfUrl) {
            replaceCalibrationPdfUrl(initialPdfUrl)
          } else {
            ElMessage.warning('原始文件预览失败')
          }
        } catch (error) {
          if (isCurrentGeneration(generation)) {
            ElMessage.warning('原始文件预览失败')
          }
        } finally {
          if (isCurrentGeneration(generation)) {
            pdfLoading.value = false
          }
        }
      }

      const loadBusinessDataTask = async () => {
        if (!currentProject.value || !row.rawId) {
          if (isCurrentGeneration(generation)) {
            ElMessage.warning('缺少项目/报告ID，无法加载数据')
            calibrationLoading.value = false
            pdfLoading.value = false
          }
          return
        }

        roomSumInfo.buildingAreaSum = '0.00'
        roomSumInfo.innerAreaSum = '0.00'
        roomSumInfo.balconyAreaSum = '0.00'
        roomSumInfo.sharedAreaSum = '0.00'

        try {
          const summaryRes = await axios.post('/api/project/survey-reports/query', {
            fileRecordId: row.rawId,
          })
          if (!isCurrentGeneration(generation)) return

          if (
            summaryRes.data.code === 200 &&
            Array.isArray(summaryRes.data.data.records) &&
            summaryRes.data.data.records.length > 0
          ) {
            const currentSummary = summaryRes.data.data.records[0]
            realSurveyReportId.value = currentSummary.id

            auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(
              2
            )
            auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]'
            auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0
            auditSummaryData.isVerified = currentSummary.isVerified || 0
            auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0
            auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-'
            auditSummaryData.roomInfoBuildingAreaSum = (
              currentSummary.roomInfoBuildingAreaSum || 0
            ).toFixed(2)
            auditSummaryData.roomInfoInnerAreaSum = (
              currentSummary.roomInfoInnerAreaSum || 0
            ).toFixed(2)
            auditSummaryData.roomInfoBalconyAreaSum = (
              currentSummary.roomInfoBalconyAreaSum || 0
            ).toFixed(2)
            auditSummaryData.roomInfoSharedAreaSum = (
              currentSummary.roomInfoSharedAreaSum || 0
            ).toFixed(2)
            auditSummaryData.roomInfoBuildingAreaSumFromOcr = (
              currentSummary.roomInfoBuildingAreaSumFromOcr || 0
            ).toFixed(2)
            auditSummaryData.roomInfoInnerAreaSumFromOcr = (
              currentSummary.roomInfoInnerAreaSumFromOcr || 0
            ).toFixed(2)
            auditSummaryData.roomInfoBalconyAreaSumFromOcr = (
              currentSummary.roomInfoBalconyAreaSumFromOcr || 0
            ).toFixed(2)
            auditSummaryData.roomInfoSharedAreaSumFromOcr = (
              currentSummary.roomInfoSharedAreaSumFromOcr || 0
            ).toFixed(2)
            enrichAuditSummaryFromVerificationReason(auditSummaryData)
          } else {
            ElMessage.warning('query 接口返回格式异常，未获取到有效数据')
            Object.assign(auditSummaryData, {
              pendingConfirmArea: '0.00',
              unknownUsageCount: 0,
              verificationErrorReason: '-',
              roomInfoBuildingAreaSum: '0.00',
            })
            return
          }
        } catch (error) {
          if (!isCurrentGeneration(generation)) return
          ElMessage.warning('query 接口请求失败，无法获取汇总数据和真实报告ID')
          console.error('query 接口异常:', error)
          Object.assign(auditSummaryData, {
            pendingConfirmArea: '0.00',
            unknownUsageCount: 0,
            verificationErrorReason: '-',
            roomInfoBuildingAreaSum: '0.00',
          })
          return
        }

        if (!isCurrentGeneration(generation)) return

        if (!realSurveyReportId.value) {
          ElMessage.warning('未获取到真实报告ID，无法加载户室数据')
          return
        }

        if (roomInfoPageNum) roomInfoPageNum.value = 1

        roomInfoLoading.value = true
        try {
          const pid = Number(currentProject.value)
          const sid = Number(realSurveyReportId.value)
          const pageSize = Number(roomInfoPageSize?.value || 50)
          let page = 1

          let roomRes
          let body
          let records
          let total

          for (let guard = 0; guard < 8; guard++) {
            roomRes = await queryRoomInfos({
              projectId: pid,
              surveyReportInfoId: sid,
              pageNum: page,
              pageSize,
              sortField: 'id',
              sortDirection: 'asc',
            })
            if (!isCurrentGeneration(generation)) return
            if (roomRes.data.code !== 200) {
              roomInfoData.value = []
              if (roomInfoTotal) roomInfoTotal.value = 0
              ElMessage.warning('暂无户室面积数据')
              break
            }
            body = roomRes.data.data || {}
            records = Array.isArray(body.records) ? body.records : []
            total = Number(body.total ?? 0)
            if (records.length > 0 || total === 0 || page <= 1) {
              break
            }
            page -= 1
          }

          if (!isCurrentGeneration(generation)) return

          if (roomRes.data.code === 200) {
            if (roomInfoPageNum && page !== roomInfoPageNum.value) {
              roomInfoPageNum.value = page
            }
            if (roomInfoTotal) {
              roomInfoTotal.value = total
            }
            roomInfoData.value = records.map((item) => ({
              id: item.id,
              roomLevel: item.roomLevel || '-',
              roomNumber: item.roomNumber || '-',
              buildingArea: formatRoomAreaFromApi(item.buildingArea),
              innerArea: formatRoomAreaFromApi(item.innerArea),
              balconyArea: formatRoomAreaFromApi(item.balconyArea),
              sharedArea: formatRoomAreaFromApi(item.sharedArea),
              isCalculate: Number(item.isCalculate ?? 0),
              usageCategory: usageCategoryMap[item.usageCategory] || '未知',
              roomUsage: item.roomUsage || '-',
              floorAreaType:
                item.floorAreaType === 'BUILDABLE'
                  ? '计容'
                  : item.floorAreaType === 'NON_BUILDABLE'
                    ? '不计容'
                    : '未知',
              remark: item.remark || '',
            }))

            if (
              isAreaSumMissing(auditSummaryData.roomInfoBuildingAreaSum) &&
              roomInfoData.value.length > 0
            ) {
              const buildingAreaTotal = roomInfoData.value.reduce(
                (sum, item) => sum + Number(item.buildingArea),
                0
              )
              if (buildingAreaTotal > 0) {
                auditSummaryData.roomInfoBuildingAreaSum = buildingAreaTotal.toFixed(2)
              }
            }
            enrichAuditSummaryFromVerificationReason(auditSummaryData)
          }
        } catch (error) {
          if (!isCurrentGeneration(generation)) return
          roomInfoData.value = []
          if (roomInfoTotal) roomInfoTotal.value = 0
          ElMessage.warning('户室数据加载失败')
          console.error('户室数据接口异常:', error)
        } finally {
          if (isCurrentGeneration(generation)) {
            roomInfoLoading.value = false
          }
        }
      }

      await Promise.all([loadPdfTask(), loadBusinessDataTask()])
    } catch (error) {
      if (isCurrentGeneration(generation)) {
        ElMessage.error('文件详情加载失败')
        pdfLoading.value = false
        roomInfoLoading.value = false
      }
    } finally {
      if (isCurrentGeneration(generation)) {
        calibrationLoading.value = false
      }
    }
  }

  const pdfLoaded = () => { }

  const pdfLoadError = () => {
    ElMessage.warning('PDF预览失败，可通过下载接口查看文件')
    replaceCalibrationPdfUrl('')
  }

  return {
    currentViewType,
    preprocessGridfsId,
    isPreprocessAvailable,
    recognitionMdContent,
    recognitionMdLoading,
    calibrationPdfUrl,
    pdfLoading,
    realSurveyReportId,
    switchView,
    resetCalibrationState,
    openCalibration,
    pdfLoaded,
    pdfLoadError,
  }
}
