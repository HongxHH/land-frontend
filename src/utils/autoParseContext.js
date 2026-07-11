/** 上传后自动进入延迟解析队列的文件内容类型（与后端 FileContextType.isAutoParseContext 对齐） */

export const AUTO_PARSE_FILE_CONTEXT_TYPES = [
  'CONTRACT',
  'SURVEY_REPORT',
  'PLANNING_REVIEW',
  'CAPACITY_INDICATOR',
  'PROJECT_PARTY_SURVEY_SUMMARY',
]

export function isAutoParseFileContext(fileContextType) {
  const t = String(fileContextType || '').toUpperCase()
  return AUTO_PARSE_FILE_CONTEXT_TYPES.includes(t)
}
