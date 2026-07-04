/**
 * 从本地文件夹递归收集 File 对象（拖拽 / 目录选择）。
 * 拖拽文件夹时 dataTransfer.files 通常只有顶层文件，必须用 FileSystemEntry 递归遍历。
 */

/** @param {File} file @param {string} relativePath */
export function annotateFileRelativePath(file, relativePath) {
  if (!file || !relativePath) return file
  try {
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      configurable: true,
      enumerable: true
    })
  } catch {
    // 部分环境不允许重新定义，忽略
  }
  return file
}

/**
 * DirectoryReader.readEntries 每次最多返回一批，需循环直到为空。
 * @param {FileSystemDirectoryReader} reader
 * @returns {Promise<FileSystemEntry[]>}
 */
export function readAllDirectoryEntries(reader) {
  return new Promise((resolve, reject) => {
    /** @type {FileSystemEntry[]} */
    const entries = []

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch?.length) {
            resolve(entries)
            return
          }
          entries.push(...batch)
          readBatch()
        },
        (error) => reject(error)
      )
    }

    readBatch()
  })
}

/**
 * 递归遍历 FileSystemEntry，收集所有文件。
 * @param {FileSystemEntry} entry
 * @param {string} [basePath]
 * @returns {Promise<File[]>}
 */
export async function traverseFileSystemEntry(entry, basePath = '') {
  if (!entry) return []

  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => {
      /** @type {FileSystemFileEntry} */ (entry).file(resolve, reject)
    })
    const relativePath = basePath ? `${basePath}/${file.name}` : file.name
    return [annotateFileRelativePath(file, relativePath)]
  }

  if (entry.isDirectory) {
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name
    const reader = /** @type {FileSystemDirectoryEntry} */ (entry).createReader()
    const children = await readAllDirectoryEntries(reader)
    const nested = await Promise.all(
      children.map((child) => traverseFileSystemEntry(child, dirPath))
    )
    return nested.flat()
  }

  return []
}

/**
 * 从 webkitdirectory 输入框收集文件（浏览器已递归展开，直接返回即可）。
 * @param {HTMLInputElement|null|undefined} inputElement
 * @returns {File[]}
 */
export function collectFilesFromInput(inputElement) {
  return Array.from(inputElement?.files || [])
}

/**
 * 从 webkitRelativePath 推断用户选择的根文件夹名称。
 * 例如 `7-金科世界城/实测报告/a.pdf` → `7-金科世界城`
 * @param {File[]|FileList} files
 * @returns {string}
 */
export function extractRootFolderNameFromFiles(files) {
  const list = Array.from(files || [])
  if (!list.length) return ''

  /** @type {Map<string, number>} */
  const counts = new Map()
  for (const file of list) {
    const path = String(file.webkitRelativePath || '').replace(/\\/g, '/').trim()
    if (!path.includes('/')) continue
    const root = path.split('/')[0]?.trim()
    if (!root) continue
    counts.set(root, (counts.get(root) || 0) + 1)
  }
  if (!counts.size) return ''

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * 从 DataTransfer 递归收集文件夹内所有文件。
 * @param {DataTransfer|null|undefined} dataTransfer
 * @returns {Promise<File[]>}
 */
export async function collectFilesFromDataTransferAsync(dataTransfer) {
  const items = dataTransfer?.items
  if (!items?.length) {
    return Array.from(dataTransfer?.files || [])
  }

  /** @type {Promise<File[]>[]} */
  const tasks = []

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (item.kind !== 'file') continue

    const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.()
    if (entry) {
      tasks.push(traverseFileSystemEntry(entry))
      continue
    }

    const file = item.getAsFile?.()
    if (file) {
      tasks.push(Promise.resolve([file]))
    }
  }

  if (!tasks.length) {
    return Array.from(dataTransfer?.files || [])
  }

  const groups = await Promise.all(tasks)
  return groups.flat()
}
