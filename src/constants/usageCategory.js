/**
 * 与后端 UsageCategoryEnum / UsageConfig.usage_category 一致。
 */
export const USAGE_CATEGORY_OPTIONS = [
  { label: '商业', value: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  { label: '住宅', value: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  { label: '物管', value: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  { label: '其他计容', value: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  { label: '社区用房', value: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  { label: '其他公用', value: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' },
]

export const USAGE_CATEGORY_LABEL_MAP = Object.fromEntries(
  USAGE_CATEGORY_OPTIONS.map((item) => [item.value, item.label])
)
USAGE_CATEGORY_LABEL_MAP.UNKNOWN = '未知'

export const USAGE_CATEGORY_BUILDABLE_OPTIONS = USAGE_CATEGORY_OPTIONS.filter(
  (item) => item.floorAreaType === 'BUILDABLE'
)
export const USAGE_CATEGORY_NON_BUILDABLE_OPTIONS = USAGE_CATEGORY_OPTIONS.filter(
  (item) => item.floorAreaType === 'NON_BUILDABLE'
)

export const FLOOR_AREA_TYPE_LABEL_MAP = {
  BUILDABLE: '计容',
  NON_BUILDABLE: '不计容',
  UNKNOWN: '未知',
}

/** 未知用途表单 targetCategory → 后端用途类别 */
export const TARGET_CATEGORY_MAP = {
  calcCommercial: { usageCategory: 'COMMERCIAL', floorAreaType: 'BUILDABLE' },
  calcResidential: { usageCategory: 'RESIDENTIAL', floorAreaType: 'BUILDABLE' },
  calcPropMgmt: { usageCategory: 'MANAGEMENT', floorAreaType: 'BUILDABLE' },
  calcOther: { usageCategory: 'OTHER_BUILDABLE', floorAreaType: 'BUILDABLE' },
  nonCalcCommunity: { usageCategory: 'COMMUNITY', floorAreaType: 'NON_BUILDABLE' },
  nonCalcOther: { usageCategory: 'OTHER_PUBLIC', floorAreaType: 'NON_BUILDABLE' },
}

export const TARGET_CATEGORY_LABEL_MAP = {
  calcCommercial: '商业',
  calcResidential: '住宅',
  calcPropMgmt: '物管',
  calcOther: '其他计容',
  nonCalcCommunity: '社区用房',
  nonCalcOther: '其他公用',
}

const USAGE_CATEGORY_TEXT_TO_CODE_MAP = Object.fromEntries(
  USAGE_CATEGORY_OPTIONS.map((item) => [item.label, item.value])
)
USAGE_CATEGORY_TEXT_TO_CODE_MAP['未知'] = 'UNKNOWN'

const FLOOR_AREA_TYPE_TEXT_TO_CODE_MAP = {
  计容: 'BUILDABLE',
  不计容: 'NON_BUILDABLE',
  未知: 'UNKNOWN',
}

export function usageCategoryLabel(code, fallback = '—') {
  const raw = String(code ?? '').trim()
  if (!raw) return fallback

  const fromCode = USAGE_CATEGORY_LABEL_MAP[raw.toUpperCase()]
  if (fromCode) return fromCode

  // 校准页等场景 row 内已是中文类别，直接展示
  if (USAGE_CATEGORY_TEXT_TO_CODE_MAP[raw]) return raw

  return fallback
}

export function floorAreaTypeLabel(code, fallback = '—') {
  const raw = String(code ?? '').trim()
  if (!raw) return fallback

  const fromCode = FLOOR_AREA_TYPE_LABEL_MAP[raw.toUpperCase()]
  if (fromCode) return fromCode

  if (FLOOR_AREA_TYPE_TEXT_TO_CODE_MAP[raw]) return raw

  return fallback
}

/** Element Plus Tag type：计容 success，不计容 warning */
export function floorAreaTypeTagType(code) {
  const key = normalizeFloorAreaTypeCode(code)
  if (key === 'BUILDABLE') return 'success'
  if (key === 'NON_BUILDABLE') return 'warning'
  return 'info'
}

export function resolveFloorAreaTypeByCategory(usageCategory) {
  return (
    USAGE_CATEGORY_OPTIONS.find((item) => item.value === usageCategory)?.floorAreaType ||
    'BUILDABLE'
  )
}

/** 中文标签或英文枚举 → 标准英文 code */
export function normalizeUsageCategoryCode(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'UNKNOWN'
  const upper = raw.toUpperCase()
  if (USAGE_CATEGORY_LABEL_MAP[upper]) return upper
  return USAGE_CATEGORY_TEXT_TO_CODE_MAP[raw] || 'UNKNOWN'
}

/** 中文标签或英文枚举 → 标准英文 code */
export function normalizeFloorAreaTypeCode(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return 'UNKNOWN'
  const upper = raw.toUpperCase()
  if (FLOOR_AREA_TYPE_LABEL_MAP[upper]) return upper
  return FLOOR_AREA_TYPE_TEXT_TO_CODE_MAP[raw] || 'UNKNOWN'
}

/** 兼容旧调用名 */
export const formatUsageCategoryLabel = usageCategoryLabel
export const formatFloorAreaTypeLabel = floorAreaTypeLabel
