import { describe, expect, it } from 'vitest'
import {
  buildSourceBundleConfirmText,
  emptySourceBundleMessage,
  formatByteSize,
} from './useProjectSourceBundleDownload.js'

describe('项目原件打包确认文案', () => {
  it('按体积换算并带上缺失数', () => {
    expect(formatByteSize(1536)).toBe('1.5 KB')
    expect(buildSourceBundleConfirmText({ fileCount: 3, totalBytes: 1536, missingCount: 1 })).toBe(
      '3 个文件，约 1.5 KB，1 个缺失'
    )
  })

  it('没有原件时区分是否存在缺失文件', () => {
    expect(emptySourceBundleMessage({ missingCount: 0 })).toBe('当前项目没有可下载的原件')
    expect(emptySourceBundleMessage({ missingCount: 2 })).toBe('没有可下载的原件（2 个文件已缺失）')
  })
})