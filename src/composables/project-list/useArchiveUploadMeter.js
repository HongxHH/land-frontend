import { computed, ref } from 'vue'

function formatSpeed(bps) {
  const val = Number(bps)
  if (!Number.isFinite(val) || val <= 0) return ''
  if (val < 1024) return `${Math.round(val)} B/s`
  if (val < 1024 * 1024) return `${(val / 1024).toFixed(1)} KB/s`
  if (val < 1024 * 1024 * 1024) return `${(val / (1024 * 1024)).toFixed(1)} MB/s`
  return `${(val / (1024 * 1024 * 1024)).toFixed(2)} GB/s`
}

function formatEta(sec) {
  const val = Math.max(0, Math.floor(Number(sec) || 0))
  if (!Number.isFinite(val) || val <= 0) return ''
  const m = Math.floor(val / 60)
  const s = val % 60
  if (m <= 0) return `${s}s`
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h <= 0) return `${m}m ${s}s`
  return `${h}h ${mm}m`
}

function normalizeExt(name) {
  const val = String(name || '').trim()
  const idx = val.lastIndexOf('.')
  if (idx <= 0 || idx === val.length - 1) return ''
  return val.slice(idx + 1).toLowerCase()
}

function fileExtLabel(ext) {
  if (!ext) return '无后缀'
  return ext.length > 6 ? `${ext.slice(0, 6)}…` : ext.toUpperCase()
}

/**
 * @param {import('vue').Ref<Array>} uploadFilesRef
 * @param {import('vue').Ref<number>} uploadUploadedBytesRef
 * @param {import('vue').Ref<number>} uploadTotalBytesRef
 */
export function useArchiveUploadMeter(uploadFilesRef, uploadUploadedBytesRef, uploadTotalBytesRef) {
  const uploadSpeedBps = ref(0)
  const uploadEtaSec = ref(null)
  let uploadSpeedTimer = null
  let uploadSpeedLastTs = 0
  let uploadSpeedLastBytes = 0

  const selectedTotalBytes = computed(() =>
    (uploadFilesRef.value || []).reduce((sum, item) => {
      const size = Number(item?.raw?.size ?? item?.size ?? 0)
      return sum + (Number.isFinite(size) ? size : 0)
    }, 0)
  )

  const topFileGroups = computed(() => {
    const map = new Map()
    for (const item of uploadFilesRef.value || []) {
      const name = item?.raw?.name ?? item?.name ?? ''
      const ext = normalizeExt(name)
      const key = ext || '__none__'
      const prev = map.get(key) || { key, ext, count: 0 }
      prev.count += 1
      map.set(key, prev)
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)))
      .slice(0, 6)
      .map((g) => ({ ...g, label: fileExtLabel(g.ext) }))
  })

  const uploadSpeedText = computed(() => formatSpeed(uploadSpeedBps.value))
  const uploadEtaText = computed(() => formatEta(uploadEtaSec.value))

  const startUploadSpeedMeter = () => {
    if (uploadSpeedTimer) return
    uploadSpeedBps.value = 0
    uploadEtaSec.value = null
    uploadSpeedLastTs = Date.now()
    uploadSpeedLastBytes = Number(uploadUploadedBytesRef.value || 0)
    uploadSpeedTimer = setInterval(() => {
      const now = Date.now()
      const bytes = Number(uploadUploadedBytesRef.value || 0)
      const dt = now - uploadSpeedLastTs
      if (dt <= 0) return
      const db = bytes - uploadSpeedLastBytes
      if (db > 0) {
        const inst = (db * 1000) / dt
        uploadSpeedBps.value = uploadSpeedBps.value > 0 ? uploadSpeedBps.value * 0.72 + inst * 0.28 : inst
      }
      uploadSpeedLastTs = now
      uploadSpeedLastBytes = bytes
      const total = Number(uploadTotalBytesRef.value || 0)
      const remain = Math.max(0, total - bytes)
      if (remain > 0 && uploadSpeedBps.value > 1) {
        uploadEtaSec.value = remain / uploadSpeedBps.value
        return
      }
      uploadEtaSec.value = null
    }, 520)
  }

  const stopUploadSpeedMeter = () => {
    if (!uploadSpeedTimer) return
    clearInterval(uploadSpeedTimer)
    uploadSpeedTimer = null
    uploadSpeedBps.value = 0
    uploadEtaSec.value = null
  }

  return {
    uploadSpeedBps,
    uploadEtaSec,
    selectedTotalBytes,
    topFileGroups,
    uploadSpeedText,
    uploadEtaText,
    startUploadSpeedMeter,
    stopUploadSpeedMeter
  }
}
