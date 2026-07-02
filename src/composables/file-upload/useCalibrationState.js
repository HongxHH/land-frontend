import { reactive, ref } from 'vue'

export function useCalibrationState() {
  const roomInfoLoading = ref(false)
  const roomInfoData = ref([])
  const roomInfoTotal = ref(0)
  const roomInfoPageNum = ref(1)
  const roomInfoPageSize = ref(50)
  const roomSumInfo = reactive({
    buildingAreaSum: '0.00',
    innerAreaSum: '0.00',
    balconyAreaSum: '0.00',
    sharedAreaSum: '0.00'
  })

  const showCalibration = ref(false)
  const calibrationLoading = ref(false)
  const currentFile = ref(null)

  const auditSummaryData = reactive({
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
    roomInfoSharedAreaSumFromOcr: '0.00'
  })

  return {
    roomInfoLoading,
    roomInfoData,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    roomSumInfo,
    showCalibration,
    calibrationLoading,
    currentFile,
    auditSummaryData
  }
}
