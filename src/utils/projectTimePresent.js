/**
 * 将存库的 ISO 项目时间（yyyy-MM-dd 自然日）格式化为中文「yyyy年M月d日」供界面展示。
 * 非 ISO 或无法解析时原样返回，避免旧数据或异常值被吞掉。
 *
 * @param {string | null | undefined} iso
 * @returns {string}
 */
export function formatProjectTimeForDisplay(iso) {
  if (iso == null || typeof iso !== 'string') return ''
  const trimmed = iso.trim()
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return trimmed
  const y = m[1]
  const month = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (month < 1 || month > 12 || day < 1 || day > 31) return trimmed
  return `${y}年${month}月${day}日`
}
