import { describe, expect, it } from 'vitest'
import {
  enrichAuditSummaryFromVerificationReason,
  isAuditSummaryFieldDerivedFromVerificationReason,
} from '@/composables/file-upload/auditSummaryMetrics'

describe('enrichAuditSummaryFromVerificationReason', () => {
  it('marks OCR sums copied from verification reason as derived', () => {
    const summary = {
      verificationErrorReason: '建筑面积总和(10.00)与OCR识别结果(12.34)',
      roomInfoBuildingAreaSum: 0,
      roomInfoBuildingAreaSumFromOcr: 0,
    }

    enrichAuditSummaryFromVerificationReason(summary)

    expect(summary.roomInfoBuildingAreaSumFromOcr).toBe('12.34')
    expect(
      isAuditSummaryFieldDerivedFromVerificationReason(
        summary,
        'roomInfoBuildingAreaSumFromOcr'
      )
    ).toBe(true)
    expect(Object.keys(summary)).not.toContain('__derivedAreaSumFields')
  })

  it('does not mark backend-provided OCR sums as derived', () => {
    const summary = {
      verificationErrorReason: '建筑面积总和(10.00)与OCR识别结果(12.34)',
      roomInfoBuildingAreaSum: 10,
      roomInfoBuildingAreaSumFromOcr: 12.34,
    }

    enrichAuditSummaryFromVerificationReason(summary)

    expect(
      isAuditSummaryFieldDerivedFromVerificationReason(
        summary,
        'roomInfoBuildingAreaSumFromOcr'
      )
    ).toBe(false)
  })

  it('clears derived markers when the reason no longer supplies a value', () => {
    const summary = {
      verificationErrorReason: '建筑面积总和(10.00)与OCR识别结果(12.34)',
      roomInfoBuildingAreaSum: 0,
      roomInfoBuildingAreaSumFromOcr: 0,
    }
    enrichAuditSummaryFromVerificationReason(summary)

    summary.verificationErrorReason = ''
    enrichAuditSummaryFromVerificationReason(summary)

    expect(
      isAuditSummaryFieldDerivedFromVerificationReason(
        summary,
        'roomInfoBuildingAreaSumFromOcr'
      )
    ).toBe(false)
  })
})
