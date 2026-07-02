/**
 * 统计 src 下各一级子目录行数与最大文件（供 clean/refactor 排期）。
 * 用法: node scripts/src-metrics.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(__dirname, '..', 'src')
const EXT = new Set(['.vue', '.js', '.ts', '.tsx', '.jsx', '.css', '.scss', '.sass'])

function walk(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else if (e.isFile()) acc.push(full)
  }
  return acc
}

function countLines(file) {
  const buf = fs.readFileSync(file, 'utf8')
  return buf.split(/\r?\n/).length
}

function main() {
  const files = walk(SRC).filter((f) => EXT.has(path.extname(f).toLowerCase()))
  const byTop = new Map()
  const fileRows = []

  for (const f of files) {
    const rel = path.relative(SRC, f).replace(/\\/g, '/')
    const lines = countLines(f)
    const top = rel.split('/')[0] || '(root)'
    byTop.set(top, (byTop.get(top) || 0) + lines)
    fileRows.push({ rel, lines })
  }

  fileRows.sort((a, b) => b.lines - a.lines)

  const topDirs = [...byTop.entries()].sort((a, b) => b[1] - a[1])

  const out = {
    generatedAt: new Date().toISOString(),
    srcRoot: SRC,
    totalFiles: files.length,
    totalLines: fileRows.reduce((s, r) => s + r.lines, 0),
    linesByTopLevelDir: Object.fromEntries(topDirs),
    largestFiles: fileRows.slice(0, 15).map((r) => ({ path: `src/${r.rel}`, lines: r.lines })),
    note:
      '若 git churn 为空，多为工作区大量未提交变更；提交后可用 git log --since --name-only 再算交集。',
  }

  console.log(JSON.stringify(out, null, 2))
}

main()
