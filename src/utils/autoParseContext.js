/** 上传后自动进入延迟解析队列的文件内容类型（与后端 FileContextType.isAutoParseContext 对齐） */

import { isPlanningReviewEnabled } from '@/config/featureFlags.js'

const ALL_AUTO_PARSE_FILE_CONTEXT_TYPES = [
  'CONTRACT',
  'SURVEY_REPORT',
  'PLANNING_REVIEW',
  'CAPACITY_INDICATOR',
  'PROJECT_PARTY_SURVEY_SUMMARY',
]

export const AUTO_PARSE_FILE_CONTEXT_TYPES = ALL_AUTO_PARSE_FILE_CONTEXT_TYPES.filter(
  (type) => type !== 'PLANNING_REVIEW' || isPlanningReviewEnabled()
)

export function isAutoParseFileContext(fileContextType) {
  const t = String(fileContextType || '').toUpperCase()
  return AUTO_PARSE_FILE_CONTEXT_TYPES.includes(t)
}
