import { computed } from 'vue'
import { FILE_STATE_LABELS, getFileStateDotColor, normalizeVerifiedFlag } from '@/utils/fileStatePresent.js'

export function useFileUploadConstants() {
  const statusMap = Object.fromEntries(
    Object.entries(FILE_STATE_LABELS).map(([key, text]) => [
      key,
      { text, color: getFileStateDotColor(key) },
    ])
  )

  const usageCategoryMap = {
    RESIDENTIAL: '住宅',
    COMMERCIAL: '商业',
    MANAGEMENT: '物管',
    COMMUNITY: '社区用房',
    OTHER_BUILDABLE: '其他计容',
    OTHER_PUBLIC: '其他公用',
    UNKNOWN: '未知',
  }

  const usageCategoryReverseMap = {
    住宅: 'RESIDENTIAL',
    商业: 'COMMERCIAL',
    '商业/办公': 'COMMERCIAL',
    物管: 'MANAGEMENT',
    物管用房: 'MANAGEMENT',
    社区用房: 'COMMUNITY',
    其他计容: 'OTHER_BUILDABLE',
    其他公用: 'OTHER_PUBLIC',
    未知: 'UNKNOWN',
  }

  return {
    statusMap,
    usageCategoryMap,
    usageCategoryReverseMap,
  }
}

export function useAuditSummaryDisplay(auditSummaryData) {
  const auditSummaryDisplay = computed(() => {
    const verifiedFlag = normalizeVerifiedFlag(auditSummaryData.isVerified)
    const hasPendingUnknown = Number(auditSummaryData.hasUnknownUsage) === 1
    let isVerifiedText = '未校验'
    if (verifiedFlag === 1) {
      isVerifiedText = hasPendingUnknown ? '已通过（有待确认用途）' : '已通过'
    } else if (verifiedFlag === 0) {
      isVerifiedText = '未通过'
    }

    return {
      isVerifiedText,
      isVerifiedTagType:
        verifiedFlag === 1
          ? hasPendingUnknown
            ? 'warning'
            : 'success'
          : verifiedFlag === 0
            ? 'danger'
            : 'info',
      hasUnknownUsageText: hasPendingUnknown ? '有' : '无',
    }
  })

  return { auditSummaryDisplay }
}
