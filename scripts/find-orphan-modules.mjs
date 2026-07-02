/**
 * 扫描 src 下可能未被引用的 .vue 模块（启发式，供 CI/人工复核）。
 * 用法: node scripts/find-orphan-modules.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const ENTRY_FILES = [
  path.join(SRC, 'main.js'),
  path.join(SRC, 'router', 'index.js')
]

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, acc)
    else acc.push(full)
  }
  return acc
}

function read(file) {
  return fs.readFileSync(file, 'utf8')
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('@/')) return null
  let base = spec
  if (base.startsWith('@/')) {
    base = path.join(SRC, base.slice(2))
  } else {
    base = path.resolve(path.dirname(fromFile), base)
  }
  const candidates = [
    base,
    `${base}.vue`,
    `${base}.js`,
    `${base}.ts`,
    path.join(base, 'index.js'),
    path.join(base, 'index.vue')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return path.normalize(c)
  }
  return null
}

function collectDeps(file, visited, queue) {
  if (!file || visited.has(file)) return
  visited.add(file)
  const text = read(file)
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(text))) {
      const target = resolveImport(file, m[1])
      if (target && !visited.has(target)) queue.push(target)
    }
  }
}

function main() {
  const allVue = walk(SRC).filter((f) => f.endsWith('.vue'))
  const allJs = walk(SRC).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
  const reachable = new Set()
  const queue = [...ENTRY_FILES.filter((f) => fs.existsSync(f))]
  const visited = new Set()

  while (queue.length) {
    const file = queue.pop()
    collectDeps(file, visited, queue)
    for (const v of visited) reachable.add(v)
  }

  const orphanVue = allVue.filter((f) => !reachable.has(path.normalize(f)))
  const orphanJs = allJs.filter((f) => !reachable.has(path.normalize(f)))

  const out = {
    generatedAt: new Date().toISOString(),
    entryFiles: ENTRY_FILES.map((f) => path.relative(ROOT, f)),
    totalVueFiles: allVue.length,
    reachableVueFiles: [...reachable].filter((f) => f.endsWith('.vue')).length,
    orphanVueModules: orphanVue.map((f) => path.relative(ROOT, f).replace(/\\/g, '/')),
    totalJsFiles: allJs.length,
    reachableJsFiles: allJs.length - orphanJs.length,
    orphanJsModules: orphanJs.map((f) => path.relative(ROOT, f).replace(/\\/g, '/')),
    note: '启发式扫描：动态 import 字符串拼接、全局注册组件可能误判，删除前请人工确认。'
  }

  console.log(JSON.stringify(out, null, 2))
  if (orphanVue.length || orphanJs.length) process.exitCode = 0
}

main()
