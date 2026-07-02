import { describe, expect, it } from 'vitest'
import {
  normalizeRecognitionImageSrc,
  renderRecognitionMarkdownHtml
} from '@/utils/recognitionMarkdownHtml.js'

describe('normalizeRecognitionImageSrc', () => {
  it('strips path segments and unsafe characters', () => {
    expect(normalizeRecognitionImageSrc('../../etc/passwd')).toBe('')
    expect(normalizeRecognitionImageSrc('folder/scan_01.png')).toBe(
      '/api/file/download/imgs/scan_01.png'
    )
  })
})

describe('renderRecognitionMarkdownHtml', () => {
  it('renders basic markdown', () => {
    const html = renderRecognitionMarkdownHtml('# 标题\n\n正文')
    expect(html).toContain('标题')
    expect(html).not.toContain('<script')
  })

  it('strips script tags and inline handlers', () => {
    const html = renderRecognitionMarkdownHtml(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'
    )
    expect(html.toLowerCase()).not.toContain('<script')
    expect(html.toLowerCase()).not.toContain('onerror')
  })

  it('rewrites image src to download API', () => {
    const html = renderRecognitionMarkdownHtml('![图](imgs/foo.png)')
    expect(html).toContain('/api/file/download/imgs/foo.png')
  })

  it('returns empty string for blank markdown', () => {
    expect(renderRecognitionMarkdownHtml('')).toBe('')
    expect(renderRecognitionMarkdownHtml('   ')).toBe('')
  })
})
