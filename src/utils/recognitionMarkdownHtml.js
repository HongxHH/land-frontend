import DOMPurify from 'dompurify'
import { marked } from 'marked'

let markedConfigured = false

function ensureMarkedConfigured() {
  if (markedConfigured) return
  marked.setOptions({
    gfm: true,
    breaks: true
  })
  markedConfigured = true
}

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'ul',
    'ol',
    'li',
    'pre',
    'code',
    'div',
    'img',
    'strong',
    'em',
    'blockquote',
    'br',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td'
  ],
  ALLOWED_ATTR: {
    img: ['src', 'alt', 'width'],
    a: ['href', 'title'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan']
  },
  ALLOW_DATA_ATTR: false
}

/** 仅保留文件名，防止路径穿越；相对路径统一走后端图片下载接口 */
export function normalizeRecognitionImageSrc(src) {
  const raw = String(src || '').trim()
  if (!raw) return ''
  const basename = raw.split('/').pop()?.split('\\').pop() || ''
  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, '')
  if (!safeName || !/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(safeName)) return ''
  return `/api/file/download/imgs/${safeName}`
}

function rewriteRecognitionImages(html) {
  if (!html) return html
  return html.replace(/<img\b([^>]*?)>/gi, (full, attrs) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i)
    if (!srcMatch) return ''
    const rawSrc = srcMatch[2] ?? srcMatch[3] ?? srcMatch[4] ?? ''
    const nextSrc = normalizeRecognitionImageSrc(rawSrc)
    if (!nextSrc) return ''
    const newAttrs = attrs.replace(
      /\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i,
      `src="${nextSrc}"`
    )
    return `<img${newAttrs}>`
  })
}

/**
 * 将 OCR/识别 Markdown 转为可安全 v-html 的 HTML（DOMPurify + 图片路径约束）。
 * @param {unknown} markdown
 * @returns {string}
 */
export function renderRecognitionMarkdownHtml(markdown) {
  const source = String(markdown ?? '')
  if (!source.trim()) return ''
  ensureMarkedConfigured()
  const unsafeHtml = marked.parse(source)
  const withImages = rewriteRecognitionImages(String(unsafeHtml))
  return DOMPurify.sanitize(withImages, PURIFY_CONFIG)
}
