#!/usr/bin/env node
/**
 * 禁止顶层静态 import exceljs，确保仅 useProjectExport 内 dynamic import。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src')
const allowFile = 'composables/project-list/useProjectExport.js'
const staticImportRe = /(?:from\s+['"]exceljs['"]|import\s*\(\s*['"]exceljs['"]\s*\))/

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, out)
    } else if (/\.(js|vue|ts)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const violations = []
for (const file of walk(root)) {
  const rel = relative(join(root, '..'), file).replace(/\\/g, '/')
  if (rel.endsWith(allowFile)) continue
  const text = readFileSync(file, 'utf8')
  if (staticImportRe.test(text)) {
    violations.push(rel)
  }
}

if (violations.length) {
  console.error('[check-exceljs-import] 发现非 useProjectExport 的 exceljs 引用:')
  for (const v of violations) console.error(`  - ${v}`)
  process.exit(1)
}

console.log('[check-exceljs-import] OK')
