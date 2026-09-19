/** 与后端 SurveyReportCalculationServiceImpl 校验文案一致 */
const AREA_REASON_PATTERNS = [
  {
    key: 'building',
    title: '建筑面积(㎡)',
    re: /建筑面积总和\(([\d.]+)\)与OCR识别结果\(([\d.]+)\)/,
  },
  { key: 'inner', title: '套内面积(㎡)', re: /套内面积总和\(([\d.]+)\)与OCR识别结果\(([\d.]+)\)/ },
  {
    key: 'balcony',
    title: '阳台面积(㎡)',
    re: /阳台面积总和\(([\d.]+)\)与OCR识别结果\(([\d.]+)\)/,
  },
  { key: 'shared', title: '分摊面积(㎡)', re: /分摊面积总和\(([\d.]+)\)与OCR识别结果\(([\d.]+)\)/ },
]

const METRIC_FIELD_MAP = [
  {
    key: 'building',
    title: '建筑面积(㎡)',
    manualKey: 'roomInfoBuildingAreaSum',
    ocrKey: 'roomInfoBuildingAreaSumFromOcr',
  },
  {
    key: 'inner',
    title: '套内面积(㎡)',
    manualKey: 'roomInfoInnerAreaSum',
    ocrKey: 'roomInfoInnerAreaSumFromOcr',
  },
  {
    key: 'balcony',
    title: '阳台面积(㎡)',
    manualKey: 'roomInfoBalconyAreaSum',
    ocrKey: 'roomInfoBalconyAreaSumFromOcr',
  },
  {
    key: 'shared',
    title: '分摊面积(㎡)',
    manualKey: 'roomInfoSharedAreaSum',
    ocrKey: 'roomInfoSharedAreaSumFromOcr',
  },
]

const DERIVED_AREA_SUM_FIELDS_PROP = '__derivedAreaSumFields'

/** OCR 合计字段名（与 SurveyReportInfo / 更新 DTO 一致） */
export const OCR_SUM_FIELD_KEYS = METRIC_FIELD_MAP.map((m) => m.ocrKey)

export const OCR_SUM_FIELD_BY_METRIC_KEY = Object.fromEntries(
  METRIC_FIELD_MAP.map((m) => [m.key, m.ocrKey])
)

export const AREA_COMPARE_TOLERANCE = 0.01

const METRIC_SORT_ORDER = { building: 0, inner: 1, balcony: 2, shared: 3 }

export function toAreaNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export function isAreaSumMissing(value) {
  return toAreaNumber(value) === 0
}

function getDerivedAreaSumFields(auditSummaryData) {
  if (!auditSummaryData) return null
  let fields = auditSummaryData[DERIVED_AREA_SUM_FIELDS_PROP]
  if (!fields) {
    fields = {}
    Object.defineProperty(auditSummaryData, DERIVED_AREA_SUM_FIELDS_PROP, {
      value: fields,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  }
  return fields
}

function setAreaSumDerived(auditSummaryData, field, derived) {
  const fields = getDerivedAreaSumFields(auditSummaryData)
  if (!fields) return
  if (derived) {
    fields[field] = true
  } else {
    delete fields[field]
  }
}

/** 字段值是否仅由 verificationErrorReason 回填（尚未落库） */
export function isAuditSummaryFieldDerivedFromVerificationReason(auditSummaryData, field) {
  return Boolean(auditSummaryData?.[DERIVED_AREA_SUM_FIELDS_PROP]?.[field])
}

/** 从 verificationErrorReason 解析「列表汇总 / OCR」成对数值 */
export function parseAreaPairsFromVerificationReason(reason) {
  const text = String(reason || '')
  const map = {}
  for (const { key, re } of AREA_REASON_PATTERNS) {
    const match = text.match(re)
    if (match) {
      map[key] = { manual: toAreaNumber(match[1]), ocr: toAreaNumber(match[2]) }
    }
  }
  return map
}

/** 接口汇总为 0 时，用校验失败原因中的数值回填（与后端校验文案同源） */
export function enrichAuditSummaryFromVerificationReason(auditSummaryData) {
  if (!auditSummaryData) return
  const parsed = parseAreaPairsFromVerificationReason(auditSummaryData.verificationErrorReason)
  for (const { key, manualKey, ocrKey } of METRIC_FIELD_MAP) {
    const fromReason = parsed[key]
    if (!fromReason) {
      setAreaSumDerived(auditSummaryData, manualKey, false)
      setAreaSumDerived(auditSummaryData, ocrKey, false)
      continue
    }
    if (isAreaSumMissing(auditSummaryData[manualKey]) && fromReason.manual > 0) {
      auditSummaryData[manualKey] = fromReason.manual.toFixed(2)
      setAreaSumDerived(auditSummaryData, manualKey, true)
    } else {
      setAreaSumDerived(auditSummaryData, manualKey, false)
    }
    if (isAreaSumMissing(auditSummaryData[ocrKey]) && fromReason.ocr > 0) {
      auditSummaryData[ocrKey] = fromReason.ocr.toFixed(2)
      setAreaSumDerived(auditSummaryData, ocrKey, true)
    } else {
      setAreaSumDerived(auditSummaryData, ocrKey, false)
    }
  }
}

export function buildSummaryMetrics(auditSummaryData, tolerance = AREA_COMPARE_TOLERANCE) {
  const parsed = parseAreaPairsFromVerificationReason(auditSummaryData?.verificationErrorReason)
  return METRIC_FIELD_MAP.map(({ key, title, manualKey, ocrKey }) => {
    let manual = toAreaNumber(auditSummaryData?.[manualKey])
    let ocr = toAreaNumber(auditSummaryData?.[ocrKey])
    const fromReason = parsed[key]
    if (fromReason) {
      if (isAreaSumMissing(manual) && fromReason.manual > 0) manual = fromReason.manual
      if (isAreaSumMissing(ocr) && fromReason.ocr > 0) ocr = fromReason.ocr
    }
    const delta = manual - ocr
    return {
      key,
      title,
      manual: manual.toFixed(2),
      ocr: ocr.toFixed(2),
      delta,
      mismatch: Math.abs(delta) > tolerance,
    }
  })
}

/** 建筑面积固定第一列；其余指标有差异的优先，避免横向滚动时看不到不一致项 */
export function sortMetricsForCompare(metrics) {
  const building = metrics.find((m) => m.key === 'building')
  const rest = metrics.filter((m) => m.key !== 'building')
  const sortedRest = [...rest].sort((a, b) => {
    if (a.mismatch !== b.mismatch) return Number(b.mismatch) - Number(a.mismatch)
    return (METRIC_SORT_ORDER[a.key] ?? 99) - (METRIC_SORT_ORDER[b.key] ?? 99)
  })
  return building ? [building, ...sortedRest] : sortedRest
}
