/**
 * 本地项目文件夹扫描：按文件名规则识别 FileContextType。
 * 规则优先级从高到低，先匹配先锁定。
 *
 * 规划复核识别受 VITE_FEATURE_PLANNING_REVIEW 控制：关闭时新建项目智能导入
 * 不自动归类、也不提供「规划复核」类型选项（归档内手动上传不受此限）。
 */

import { isPlanningReviewEnabled } from '@/config/featureFlags.js'

/** @typedef {'CONTRACT'|'SURVEY_REPORT'|'PLANNING_REVIEW'|'CAPACITY_INDICATOR'|'PROJECT_PARTY_SURVEY_SUMMARY'} SmartImportContextType */

/** @typedef {Object} ScannedFileEntry
 * @property {string} id
 * @property {File} file
 * @property {string} relativePath
 * @property {string} displayName
 * @property {SmartImportContextType|null} fileContextType
 * @property {boolean} unmatchedOrigin
 * @property {boolean} selected
 * @property {number} lastModified
 */

export const SMART_IMPORT_CONTEXT_TYPES = [
  'CONTRACT',
  'SURVEY_REPORT',
  ...(isPlanningReviewEnabled() ? ['PLANNING_REVIEW'] : []),
  'CAPACITY_INDICATOR',
  'PROJECT_PARTY_SURVEY_SUMMARY',
]

const SCANNABLE_EXTENSIONS = new Set(['.pdf', '.xls', '.xlsx'])

/** 文件名命中下列词时，即使位于实测目录也不视为实测报告 */
const SURVEY_REPORT_FILENAME_EXCLUDES = [
  /汇总/,
  /出让合同/,
  /复核表/,
  /容量指标/,
  /竣备表/,
  /楼盘表确认/,
  /确认书$/,
  /分层平面图/,
  /房屋分层/,
]

/** 实测报告：文件名关键词（不含宽泛的「楼盘表」「地下室」整词） */
const SURVEY_REPORT_FILENAME_INCLUDES = [
  /实测报告/,
  /测绘成果报告/,
  /测绘报告/,
  /实测绘成果/,
  /预测报告/,
  /^地下室$/,
  /^\d+#?栋$/,
  /^[#]\d+栋$/,
  /^\d+#?栋/,
  /^[A-Z]\d+(?:-[A-Z]?\d+)?栋$/,
  /[A-Z]\d+(?:-[A-Z]?\d+)?栋/,
  /\d+栋楼盘表/,
  /楼盘表.*\d+栋/,
  /^(垃圾站|幼儿园)$/,
]

/** 父目录含下列片段时，目录内 PDF 默认识别为实测报告（文件名未命中其他类型且未被排除） */
const SURVEY_REPORT_DIR_PATTERNS = [
  /实测报告/,
  /实测成果/,
  /测绘成果报告/,
  /实测绘成果/,
  /二次实测/,
]

/** @type {Array<{ type: SmartImportContextType, extensions: string[], include: RegExp[], exclude?: RegExp[] }>} */
const ALL_MATCH_RULES = [
  {
    type: 'PROJECT_PARTY_SURVEY_SUMMARY',
    extensions: ['.xls', '.xlsx'],
    include: [/房产实测信息汇总/, /实测汇总/, /实测信息汇总/],
    exclude: [/模板/],
  },
  {
    type: 'CAPACITY_INDICATOR',
    extensions: ['.pdf'],
    include: [/容量指标核查/, /容量指标/],
  },
  {
    type: 'PLANNING_REVIEW',
    extensions: ['.pdf'],
    include: [/规划复核/, /面积复核/, /国土复核/],
    exclude: [/实测报告/, /出让合同/, /汇总/],
  },
  {
    type: 'CONTRACT',
    extensions: ['.pdf'],
    include: [/出让合同/, /国有建设用地/, /国土出让/, /土地出让/, /国土合同/, /补充合同/],
    exclude: [/实测/, /测绘/, /汇总/, /复核/, /容量指标/],
  },
]

const MATCH_RULES = ALL_MATCH_RULES.filter(
  (rule) => rule.type !== 'PLANNING_REVIEW' || isPlanningReviewEnabled()
)

export function getBaseName(filePath) {
  const normalized = String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || normalized
}

export function getFileExtension(filePath) {
  const base = getBaseName(filePath).toLowerCase()
  const dotIndex = base.lastIndexOf('.')
  if (dotIndex <= 0) return ''
  return base.slice(dotIndex)
}

export function shouldSkipFile(filePath) {
  const base = getBaseName(filePath)
  if (!base) return true
  if (base.startsWith('.') || base.startsWith('~$')) return true
  if (/\.tmp$/i.test(base)) return true
  return false
}

export function isScannableFile(filePath) {
  if (shouldSkipFile(filePath)) return false
  return SCANNABLE_EXTENSIONS.has(getFileExtension(filePath))
}

function nameWithoutExtension(filePath) {
  const base = getBaseName(filePath)
  const ext = getFileExtension(base)
  return ext ? base.slice(0, -ext.length) : base
}

export function getDirectoryPath(filePath) {
  const normalized = String(filePath || '')
    .trim()
    .replace(/\\/g, '/')
  const slashIndex = normalized.lastIndexOf('/')
  if (slashIndex <= 0) return ''
  return normalized.slice(0, slashIndex)
}

export const SMART_IMPORT_ROOT_DIRECTORY_LABEL = '(根目录)'

/** @param {import('./localFolderFileMatcher.js').ScannedFileEntry[]} entries */
export function groupEntriesByDirectory(entries) {
  if (!Array.isArray(entries) || !entries.length) return []

  const map = new Map()
  for (const entry of entries) {
    const dir = getDirectoryPath(entry.relativePath) || SMART_IMPORT_ROOT_DIRECTORY_LABEL
    if (!map.has(dir)) map.set(dir, [])
    map.get(dir).push(entry)
  }

  return Array.from(map.entries())
    .sort(([dirA], [dirB]) => {
      if (dirA === SMART_IMPORT_ROOT_DIRECTORY_LABEL) return 1
      if (dirB === SMART_IMPORT_ROOT_DIRECTORY_LABEL) return -1
      return dirA.localeCompare(dirB, 'zh-CN')
    })
    .map(([directory, dirEntries]) => ({
      directory,
      entries: dirEntries,
      selectedCount: dirEntries.filter((item) => item.selected).length,
    }))
}

function isSurveyReportFilenameExcluded(stem) {
  return SURVEY_REPORT_FILENAME_EXCLUDES.some((pattern) => pattern.test(stem))
}

function matchesSurveyReportByFileName(stem) {
  if (isSurveyReportFilenameExcluded(stem)) return false
  return SURVEY_REPORT_FILENAME_INCLUDES.some((pattern) => pattern.test(stem))
}

function matchesSurveyReportByDirectory(filePath) {
  if (getFileExtension(filePath) !== '.pdf') return false
  const stem = nameWithoutExtension(filePath)
  if (isSurveyReportFilenameExcluded(stem)) return false
  const dir = getDirectoryPath(filePath)
  if (!dir) return false
  return SURVEY_REPORT_DIR_PATTERNS.some((pattern) => pattern.test(dir))
}

function matchesSurveyReport(filePath) {
  const stem = nameWithoutExtension(filePath)
  if (matchesSurveyReportByFileName(stem)) return true
  return matchesSurveyReportByDirectory(filePath)
}

function matchesRule(rule, filePath) {
  const ext = getFileExtension(filePath)
  if (!rule.extensions.includes(ext)) return false
  const stem = nameWithoutExtension(filePath)
  if (rule.exclude?.some((pattern) => pattern.test(stem))) return false
  return rule.include.some((pattern) => pattern.test(stem))
}

/** @returns {SmartImportContextType|null} */
export function matchFileContextType(filePath) {
  for (const rule of MATCH_RULES) {
    if (matchesRule(rule, filePath)) return rule.type
  }
  if (matchesSurveyReport(filePath)) return 'SURVEY_REPORT'
  return null
}

function buildEntryId(relativePath, file) {
  return `${relativePath}::${file.size}::${file.lastModified}`
}

/** @param {File} file */
function toScannedEntry(file) {
  const relativePath = file.webkitRelativePath || file.name
  const fileContextType = matchFileContextType(relativePath)
  return {
    id: buildEntryId(relativePath, file),
    file,
    relativePath,
    displayName: getBaseName(relativePath),
    fileContextType,
    unmatchedOrigin: fileContextType == null,
    selected: fileContextType != null,
    lastModified: Number(file.lastModified || 0),
  }
}

/** @param {File[]|FileList} files */
export function scanLocalFolderFiles(files) {
  const list = Array.from(files || []).filter((file) => {
    const path = file.webkitRelativePath || file.name
    return isScannableFile(path)
  })

  return list.map(toScannedEntry)
}

/** @param {ScannedFileEntry[]} entries */
export function groupScannedEntries(entries) {
  /** @type {Record<string, ScannedFileEntry[]>} */
  const groups = {
    CONTRACT: [],
    SURVEY_REPORT: [],
    PLANNING_REVIEW: [],
    CAPACITY_INDICATOR: [],
    PROJECT_PARTY_SURVEY_SUMMARY: [],
    UNMATCHED: [],
  }

  for (const entry of entries) {
    if (entry.fileContextType && !entry.unmatchedOrigin) {
      groups[entry.fileContextType].push(entry)
    } else {
      groups.UNMATCHED.push(entry)
    }
  }
  return groups
}

/** @param {ScannedFileEntry[]} entries */
export function getSelectedUploadEntries(entries) {
  return entries.filter((entry) => entry.selected && entry.fileContextType)
}
