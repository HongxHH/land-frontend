/**
 * 本地项目文件夹扫描：按文件名规则识别 FileContextType。
 * 规则优先级从高到低，先匹配先锁定。
 *
 * 规划复核识别受 VITE_FEATURE_PLANNING_REVIEW 控制：关闭时新建项目智能导入
 * 不自动归类、也不提供「规划复核」类型选项（归档内手动上传不受此限）。
 */

import { isPlanningReviewEnabled } from '@/config/featureFlags.js'
import { getFileContextLabel } from '@/utils/fileContextTypeRegistry.js'

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

const EXTENSION_LABELS = {
  '.pdf': 'PDF',
  '.xls': 'XLS',
  '.xlsx': 'XLSX',
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsPattern(keyword) {
  return new RegExp(escapeRegExp(keyword))
}

function exactNamePattern(keyword) {
  return new RegExp(`^${escapeRegExp(keyword)}$`)
}

function suffixPattern(keyword) {
  return new RegExp(`${escapeRegExp(keyword)}$`)
}

/** 文件名命中下列词时，即使位于实测目录也不视为实测报告 */
const SURVEY_REPORT_EXCLUDE_KEYWORDS = [
  '汇总',
  '出让合同',
  '复核表',
  '容量指标',
  '竣备表',
  '楼盘表确认',
  '分层平面图',
  '房屋分层',
]
const SURVEY_REPORT_EXCLUDE_SUFFIXES = ['确认书']

/** 实测报告：文件名关键词（不含宽泛的「楼盘表」「地下室」整词） */
const SURVEY_REPORT_NAME_KEYWORDS = ['实测报告', '测绘成果报告', '测绘报告', '实测绘成果', '预测报告']
const SURVEY_REPORT_EXACT_NAMES = ['地下室', '垃圾站', '幼儿园']
const SURVEY_REPORT_BUILDING_EXAMPLES = [
  '3栋.pdf',
  '1#栋.pdf',
  '#1栋.pdf',
  'A1栋.pdf',
  'A1-A2栋.pdf',
  '2栋楼盘表.pdf',
]
const SURVEY_REPORT_BUILDING_PATTERNS = [
  /^\d+#?栋$/,
  /^[#]\d+栋$/,
  /^\d+#?栋/,
  /^[A-Z]\d+(?:-[A-Z]?\d+)?栋$/,
  /[A-Z]\d+(?:-[A-Z]?\d+)?栋/,
  /\d+栋楼盘表/,
  /楼盘表.*\d+栋/,
]

/** 父目录含下列片段时，目录内 PDF 默认识别为实测报告（文件名未命中其他类型且未被排除） */
const SURVEY_REPORT_DIR_KEYWORDS = ['实测报告', '实测成果', '测绘成果报告', '实测绘成果', '二次实测']

const SURVEY_REPORT_FILENAME_EXCLUDES = [
  ...SURVEY_REPORT_EXCLUDE_KEYWORDS.map(containsPattern),
  ...SURVEY_REPORT_EXCLUDE_SUFFIXES.map(suffixPattern),
]

const SURVEY_REPORT_FILENAME_INCLUDES = [
  ...SURVEY_REPORT_NAME_KEYWORDS.map(containsPattern),
  ...SURVEY_REPORT_EXACT_NAMES.map(exactNamePattern),
  ...SURVEY_REPORT_BUILDING_PATTERNS,
]

const SURVEY_REPORT_DIR_PATTERNS = SURVEY_REPORT_DIR_KEYWORDS.map(containsPattern)

/** @type {Array<{ type: SmartImportContextType, extensions: string[], includeKeywords: string[], excludeKeywords?: string[], examples: string[] }>} */
const SMART_IMPORT_RULE_SPECS = [
  {
    type: 'PROJECT_PARTY_SURVEY_SUMMARY',
    extensions: ['.xls', '.xlsx'],
    includeKeywords: ['房产实测信息汇总', '实测汇总', '实测信息汇总'],
    excludeKeywords: ['模板'],
    examples: ['房产实测信息汇总.xlsx', '一期实测汇总.xls'],
  },
  {
    type: 'CAPACITY_INDICATOR',
    extensions: ['.pdf'],
    includeKeywords: ['容量指标核查', '容量指标'],
    examples: ['项目容量指标核查表.pdf', '容量指标复核稿.pdf'],
  },
  {
    type: 'PLANNING_REVIEW',
    extensions: ['.pdf'],
    includeKeywords: ['规划复核', '面积复核', '国土复核'],
    excludeKeywords: ['实测报告', '出让合同', '汇总'],
    examples: ['项目规划复核.pdf', '建设工程面积复核表.pdf'],
  },
  {
    type: 'CONTRACT',
    extensions: ['.pdf'],
    includeKeywords: ['出让合同', '国有建设用地', '国土出让', '土地出让', '国土合同', '补充合同'],
    excludeKeywords: ['实测', '测绘', '汇总', '复核', '容量指标'],
    examples: ['国有建设用地使用权出让合同.pdf', '项目补充合同.pdf'],
  },
]

/** @type {Array<{ type: SmartImportContextType, extensions: string[], include: RegExp[], exclude?: RegExp[] }>} */
const ALL_MATCH_RULES = SMART_IMPORT_RULE_SPECS.map((spec) => {
  const rule = {
    type: spec.type,
    extensions: spec.extensions,
    include: spec.includeKeywords.map(containsPattern),
  }
  if (spec.excludeKeywords?.length) {
    rule.exclude = spec.excludeKeywords.map(containsPattern)
  }
  return rule
})

const MATCH_RULES = ALL_MATCH_RULES.filter(
  (rule) => rule.type !== 'PLANNING_REVIEW' || isPlanningReviewEnabled()
)

function formatExtensionList(extensions) {
  return extensions.map((ext) => EXTENSION_LABELS[ext] || ext).join(' / ')
}

/** 展示时去掉已被更短关键词覆盖的词，例如「容量指标核查」已被「容量指标」包含。 */
function visibleKeywords(keywords) {
  return keywords.filter(
    (keyword) => !keywords.some((other) => other !== keyword && keyword.includes(other))
  )
}

/**
 * 新建项目智能导入的用户可见归类说明。
 * 关键词与匹配规则共用，避免界面说明和实际识别不一致。
 */
export function getSmartImportRuleGuide() {
  const categories = SMART_IMPORT_RULE_SPECS.filter(
    (spec) => spec.type !== 'PLANNING_REVIEW' || isPlanningReviewEnabled()
  ).map((spec) => ({
    type: spec.type,
    label: getFileContextLabel(spec.type),
    formats: formatExtensionList(spec.extensions),
    keywords: visibleKeywords(spec.includeKeywords),
    sections: [],
    examples: spec.examples,
  }))

  categories.push({
    type: 'SURVEY_REPORT',
    label: getFileContextLabel('SURVEY_REPORT'),
    formats: 'PDF',
    keywords: visibleKeywords(SURVEY_REPORT_NAME_KEYWORDS),
    sections: [
      { label: '整段文件名', keywords: SURVEY_REPORT_EXACT_NAMES },
      {
        label: '楼栋名',
        hint: '字母只认大写',
        keywords: SURVEY_REPORT_BUILDING_EXAMPLES.map((name) => name.replace(/\.pdf$/i, '')),
      },
      { label: '这些文件夹里的 PDF', keywords: SURVEY_REPORT_DIR_KEYWORDS },
    ],
    examples: [
      '项目实测报告.pdf',
      '3栋.pdf',
      'A1栋.pdf',
      '2栋楼盘表.pdf',
      '地下室.pdf',
      '实测成果/说明.pdf',
    ],
  })

  return {
    summary: '按序号归类，命中后不再继续。只认 PDF、XLS、XLSX。',
    categories,
  }
}

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
  const stem = nameWithoutExtension(filePath)
  if (isSurveyReportFilenameExcluded(stem)) return false
  const dir = getDirectoryPath(filePath)
  if (!dir) return false
  return SURVEY_REPORT_DIR_PATTERNS.some((pattern) => pattern.test(dir))
}

function matchesSurveyReport(filePath) {
  if (getFileExtension(filePath) !== '.pdf') return false
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
