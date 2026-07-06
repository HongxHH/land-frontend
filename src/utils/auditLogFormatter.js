import { getFileContextLabel } from '@/utils/fileContextTypeRegistry.js'

export const OPERATION_LABELS = {
  CREATE: '创建',
  UPDATE: '更新',
  DELETE: '删除',
  UPLOAD: '上传',
  MOVE: '移动',
  PARSE: '提交解析',
  PARSE_COMPLETE: '解析完成',
  PARSE_CANCEL: '取消解析'
}

export const TARGET_TYPE_LABELS = {
  project: '项目',
  contract: '合同',
  land_parcel: '地块',
  room_info: '户室',
  survey_report: '实测报告',
  file: '文件',
  file_archive: '归档夹',
  usage_config: '用途配置',
  planning_review_form: '规划复核表',
  planning_review_row: '规划复核行',
  project_party_summary_form: '项目方汇总表',
  capacity_indicator_form: '容量指标表'
}

const FIELD_LABELS = {
  projectId: '项目ID',
  projectName: '项目名称',
  projectCode: '项目编号',
  contractId: '合同ID',
  contractNumber: '合同编号',
  contractType: '合同类型',
  transferor: '出让方',
  transferee: '受让方',
  totalArea: '总面积',
  residentialArea: '住宅面积',
  commercialArea: '商业面积',
  parcelCode: '地块编号',
  parcelName: '地块名称',
  plannedUse: '规划用途',
  roomNumber: '户号',
  roomLevel: '楼层',
  roomUsage: '用途',
  usageCategory: '用途分类',
  floorAreaType: '计容类型',
  buildingArea: '建筑面积',
  innerArea: '套内面积',
  isCalculate: '是否计容',
  originalName: '文件名',
  fileType: '文件类型',
  fileState: '文件状态',
  fileContextType: '文件类别',
  archiveId: '归档夹ID',
  name: '名称',
  kind: '类型',
  isDefault: '是否默认',
  sortOrder: '排序',
  buildingName: '楼栋名称',
  phase: '期数',
  remark: '备注',
  isParsed: '是否已解析'
}

const ENUM_LABELS = {
  UNKNOWN: '未知',
  COMMERCIAL: '商业',
  RESIDENTIAL: '住宅',
  BUILDABLE: '计容',
  NON_BUILDABLE: '不计容',
  WAITING_POST_PROCESS: '等待后处理',
  WAITING_PARSE: '等待解析',
  UPLOADING: '上传中',
  UPLOAD_FAIL: '上传失败',
  PARSING: '解析中',
  PARSE_COMPLETE: '解析完成',
  PARSE_FAIL: '解析失败'
}

function translateEnum(value) {
  if (value == null || value === '') return '空'
  const key = String(value)
  return ENUM_LABELS[key] ?? key
}

function translateField(field) {
  return FIELD_LABELS[field] || field
}

function formatValue(value) {
  if (value == null || value === '') return '空'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (value === 0 || value === 1) {
    return value
  }
  return translateEnum(value)
}

function tryParseJson(text) {
  if (text == null || text === '') return null
  const trimmed = String(text).trim()
  if (!trimmed || trimmed === '[]' || trimmed === '{}') return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function formatObjectSummary(obj, operation) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  const fileName = obj.originalName
  const fileContext = obj.fileContextType ? getFileContextLabel(obj.fileContextType) : ''
  if (operation === 'UPLOAD' && fileName) {
    const typePart = fileContext ? `（${fileContext}）` : ''
    return `上传文件「${fileName}」${typePart}`
  }
  if (operation === 'PARSE' && fileName) {
    return `提交解析「${fileName}」`
  }
  if (operation === 'PARSE_COMPLETE' && fileName) {
    return `解析完成「${fileName}」`
  }
  if (operation === 'PARSE_CANCEL' && fileName) {
    return `取消解析「${fileName}」`
  }
  if (fileName) {
    return `文件「${fileName}」`
  }
  const name = obj.projectName || obj.name || obj.contractNumber || obj.parcelName || obj.buildingName
  if (name) {
    return `${operation === 'DELETE' ? '删除' : '创建'}「${name}」`
  }
  const parts = Object.entries(obj)
    .slice(0, 3)
    .map(([k, v]) => `${translateField(k)}：${formatValue(v)}`)
  return parts.join('；') || '-'
}

function formatDiffSummary(changes) {
  if (!Array.isArray(changes) || changes.length === 0) return null
  const lines = changes.slice(0, 3).map((item) => {
    const field = translateField(item.field)
    const oldVal = formatValue(item.oldValue)
    const newVal = formatValue(item.newValue)
    return `${field}：${oldVal} → ${newVal}`
  })
  if (changes.length > 3) {
    lines.push(`…等 ${changes.length} 项变更`)
  }
  return lines.join('；')
}

/** 表格列用的简短摘要 */
export function formatAuditChangeSummary(changeSummary, operation = '') {
  const parsed = tryParseJson(changeSummary)
  if (!parsed) {
    const text = String(changeSummary || '').trim()
    return text || '-'
  }
  if (Array.isArray(parsed)) {
    return formatDiffSummary(parsed) || '无业务字段变更'
  }
  return formatObjectSummary(parsed, operation) || '-'
}

/** 详情弹窗用的多行文本 */
export function formatAuditChangeDetail(changeSummary, _operation = '') {
  const parsed = tryParseJson(changeSummary)
  if (!parsed) {
    const text = String(changeSummary || '').trim()
    return text || '无详情'
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return '无业务字段变更'
    return parsed
      .map((item) => {
        const field = translateField(item.field)
        const oldVal = formatValue(item.oldValue)
        const newVal = formatValue(item.newValue)
        return `${field}：${oldVal} → ${newVal}`
      })
      .join('\n')
  }
  return Object.entries(parsed)
    .map(([k, v]) => `${translateField(k)}：${formatValue(v)}`)
    .join('\n')
}

export function getOperationLabel(operation) {
  return OPERATION_LABELS[operation] || operation || '-'
}

export function getTargetTypeLabel(targetType) {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-'
}
