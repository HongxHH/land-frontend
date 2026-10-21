import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createSourceBundleTicket, getSourceBundleManifest } from '@/services/file.service'

export function formatByteSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '0 B'
  if (value < 1024) return `${Math.round(value)} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function buildSourceBundleConfirmText(manifest) {
  const count = Number(manifest?.fileCount) || 0
  const missing = Number(manifest?.missingCount) || 0
  let text = `${count} 个文件，约 ${formatByteSize(manifest?.totalBytes)}`
  if (missing > 0) {
    text += `，${missing} 个缺失`
  }
  return text
}

export function emptySourceBundleMessage(manifest) {
  const missing = Number(manifest?.missingCount) || 0
  if (missing > 0) {
    return `没有可下载的原件（${missing} 个文件已缺失）`
  }
  return '当前项目没有可下载的原件'
}

function downloadFileName(projectName) {
  const name = String(projectName || '').trim() || '项目'
  return `${name}-原件.zip`
}

function isConfirmDismissed(error) {
  return error === 'cancel' || error === 'close'
}

export function useProjectSourceBundleDownload(getProjectId) {
  const bundleLoading = ref(false)

  async function downloadSourceBundle() {
    const projectId = getProjectId?.()
    if (projectId == null || projectId === '' || bundleLoading.value) return

    bundleLoading.value = true
    try {
      const manifestRes = await getSourceBundleManifest(projectId)
      const manifestBody = manifestRes?.data
      if (manifestBody?.code !== 200) {
        ElMessage.error(manifestBody?.msg || '无法获取原件清单')
        return
      }
      const manifest = manifestBody.data || {}
      if (!Number(manifest.fileCount)) {
        ElMessage.warning(emptySourceBundleMessage(manifest))
        return
      }
      await ElMessageBox.confirm(buildSourceBundleConfirmText(manifest), '原件包', {
        confirmButtonText: '下载',
        cancelButtonText: '取消',
        type: 'info',
        distinguishCancelAndClose: true,
      })
      const ticketRes = await createSourceBundleTicket(projectId)
      const ticketBody = ticketRes?.data
      if (ticketBody?.code !== 200 || !ticketBody.data?.ticket) {
        const busy = Number(ticketBody?.code) === 429
        const text = ticketBody?.msg || '无法开始下载'
        if (busy) {
          ElMessage.warning({ message: text, duration: 8000, showClose: true })
        } else {
          ElMessage.error(text)
        }
        return
      }
      const link = document.createElement('a')
      link.href = `/api/file/project/${encodeURIComponent(projectId)}/source-bundle?ticket=${encodeURIComponent(ticketBody.data.ticket)}`
      link.download = downloadFileName(manifest?.projectName)
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      ElMessage.success({
        message: '已交给浏览器下载。进度在浏览器的下载列表里，完成后即可打开压缩包。',
        duration: 6000,
        showClose: true,
      })
    } catch (error) {
      if (isConfirmDismissed(error)) return
      ElMessage.error(error?.response?.data?.msg || '原件打包下载失败')
    } finally {
      bundleLoading.value = false
    }
  }

  return {
    bundleLoading,
    downloadSourceBundle,
  }
}
