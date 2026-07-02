import { describe, expect, it } from 'vitest'
import {
  buildSummaryMetrics,
  enrichAuditSummaryFromVerificationReason,
  parseAreaPairsFromVerificationReason,
  sortMetricsForCompare
} from './auditSummaryMetrics.js'

const SAMPLE_REASON =
  '建筑面积总和(212958.9200)与OCR识别结果(212962.72)不一致; [以下 OCR 差异不阻断通过] 套内面积总和(161898.7200)与OCR识别结果(161907.72)不一致; 分摊面积总和(51054.8000)与OCR识别结果(51055.00)不一致;'

describe('auditSummaryMetrics', () => {
  it('parses area pairs from verification reason', () => {
    const parsed = parseAreaPairsFromVerificationReason(SAMPLE_REASON)
    expect(parsed.building.manual).toBeCloseTo(212958.92, 2)
    expect(parsed.building.ocr).toBeCloseTo(212962.72, 2)
    expect(parsed.inner.manual).toBeCloseTo(161898.72, 2)
    expect(parsed.shared.ocr).toBeCloseTo(51055, 2)
  })

  it('enriches zero summary fields from reason', () => {
    const audit = {
      verificationErrorReason: SAMPLE_REASON,
      roomInfoBuildingAreaSum: '0.00',
      roomInfoBuildingAreaSumFromOcr: '0.00',
      roomInfoInnerAreaSum: '161898.72',
      roomInfoInnerAreaSumFromOcr: '161907.72'
    }
    enrichAuditSummaryFromVerificationReason(audit)
    expect(audit.roomInfoBuildingAreaSum).toBe('212958.92')
    expect(audit.roomInfoBuildingAreaSumFromOcr).toBe('212962.72')
    expect(audit.roomInfoInnerAreaSum).toBe('161898.72')
  })

  it('pins building first and sorts remaining mismatches before matched metrics', () => {
    const metrics = buildSummaryMetrics({
      verificationErrorReason: SAMPLE_REASON,
      roomInfoBuildingAreaSum: '212958.92',
      roomInfoBuildingAreaSumFromOcr: '212962.72',
      roomInfoInnerAreaSum: '161898.72',
      roomInfoInnerAreaSumFromOcr: '161907.72',
      roomInfoBalconyAreaSum: '4019.71',
      roomInfoBalconyAreaSumFromOcr: '4019.71',
      roomInfoSharedAreaSum: '51054.80',
      roomInfoSharedAreaSumFromOcr: '51055.00'
    })
    const sorted = sortMetricsForCompare(metrics)
    expect(sorted[0].key).toBe('building')
    expect(sorted.slice(1).filter((m) => m.mismatch).map((m) => m.key)).toEqual(['inner', 'shared'])
    expect(sorted.map((m) => m.key)).toEqual(['building', 'inner', 'shared', 'balcony'])
  })

  it('keeps building first when only other metrics mismatch', () => {
    const metrics = buildSummaryMetrics({
      roomInfoBuildingAreaSum: '100.00',
      roomInfoBuildingAreaSumFromOcr: '100.00',
      roomInfoInnerAreaSum: '80.00',
      roomInfoInnerAreaSumFromOcr: '80.00',
      roomInfoBalconyAreaSum: '5.00',
      roomInfoBalconyAreaSumFromOcr: '5.00',
      roomInfoSharedAreaSum: '20.00',
      roomInfoSharedAreaSumFromOcr: '21.00'
    })
    const sorted = sortMetricsForCompare(metrics)
    expect(sorted[0].key).toBe('building')
    expect(sorted[1].key).toBe('shared')
    expect(sorted[0].mismatch).toBe(false)
    expect(sorted[1].mismatch).toBe(true)
  })
})
