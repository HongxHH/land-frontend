import { ref, shallowRef } from 'vue'
import axios from 'axios'
import { floorAreaTypeLabel, usageCategoryLabel } from '@/constants/usageCategory.js'

/** @type {import('vue').ShallowRef<Array|null>} */
const knownList = shallowRef(null)
/** @type {import('vue').ShallowRef<Array|null>} */
const unknownList = shallowRef(null)

const knownInflightRef = { current: null }
const unknownInflightRef = { current: null }

function normalizeKnownRows(data) {
  return (data || []).map((item) => ({
    ...item,
    priority: Number(item.priority),
    status: Number(item.status),
  }))
}

function normalizeUnknownRows(data) {
  return (data || []).map((item) => ({
    id: item.id,
    usageName: item.usageName,
    occurrenceCount: item.occurrenceCount,
    updateTime: item.updateTime,
    targetCategory: item.suggestedCategory || '',
    projectId: item.projectId,
    fileRecordId: item.fileRecordId,
    recentFileName: item.recentFileName || '',
    recentProjectName: item.recentProjectName || '',
    handleRemark: item.handleRemark || '',
  }))
}

async function requestKnownList(cacheBust = false) {
  const res = await axios.get('/api/usage-config/list', {
    params: cacheBust ? { _t: Date.now() } : undefined,
  })
  if (res.data?.code !== 200) {
    throw new Error(res.data?.msg || '获取用途配置失败')
  }
  return normalizeKnownRows(res.data.data)
}

async function requestUnknownList(cacheBust = false) {
  const res = await axios.get('/api/usage-config/unknown/pending', {
    params: cacheBust ? { _t: Date.now() } : undefined,
  })
  if (res.data?.code !== 200) {
    throw new Error(res.data?.msg || '获取未知用途失败')
  }
  return normalizeUnknownRows(res.data.data)
}

async function runCachedLoad({
  cacheRef,
  inflightRef,
  request,
  force,
  silent,
  cacheBust,
  loadingRef,
}) {
  const cached = cacheRef.value
  if (!force && cached !== null) {
    if (silent && !inflightRef.current) {
      void runCachedLoad({
        cacheRef,
        inflightRef,
        request,
        force: true,
        silent: true,
        cacheBust: false,
        loadingRef,
      }).catch((error) => {
        console.warn('后台刷新用途缓存失败:', error)
      })
    }
    return cached
  }

  if (inflightRef.current && !force) {
    return inflightRef.current
  }

  const showLoading = !silent && cached === null
  if (showLoading) {
    loadingRef.value = true
  }

  const task = request(cacheBust)
    .then((rows) => {
      cacheRef.value = rows
      return rows
    })
    .finally(() => {
      inflightRef.current = null
      if (showLoading) {
        loadingRef.value = false
      }
    })

  inflightRef.current = task
  return task
}

export function invalidateUsageConfigListCache() {
  knownList.value = null
  knownInflightRef.current = null
}

export function invalidateUnknownUsagePendingCache() {
  unknownList.value = null
  unknownInflightRef.current = null
}

export function invalidateUsageConfigPageCaches() {
  invalidateUsageConfigListCache()
  invalidateUnknownUsagePendingCache()
}

export function mapUsageConfigToPickerOptions(items) {
  return (items || []).map((item) => ({
    id: item.id,
    usagePattern: item.usagePattern || '-',
    usageCategory: String(item.usageCategory || '').toUpperCase(),
    floorAreaType: String(item.floorAreaType || '').toUpperCase(),
    usageCategoryText: usageCategoryLabel(item.usageCategory, '未知'),
    floorAreaTypeText: floorAreaTypeLabel(item.floorAreaType, '未知'),
  }))
}

export function useUsageConfigPageCache() {
  const knownLoading = ref(false)
  const unknownLoading = ref(false)

  const loadKnown = (options = {}) =>
    runCachedLoad({
      cacheRef: knownList,
      inflightRef: knownInflightRef,
      request: requestKnownList,
      loadingRef: knownLoading,
      force: Boolean(options.force),
      silent: Boolean(options.silent),
      cacheBust: Boolean(options.cacheBust),
    })

  const loadUnknown = (options = {}) =>
    runCachedLoad({
      cacheRef: unknownList,
      inflightRef: unknownInflightRef,
      request: requestUnknownList,
      loadingRef: unknownLoading,
      force: Boolean(options.force),
      silent: Boolean(options.silent),
      cacheBust: Boolean(options.cacheBust),
    })

  const refreshAll = async ({ cacheBust = true } = {}) => {
    invalidateUsageConfigPageCaches()
    await Promise.all([
      loadKnown({ force: true, cacheBust }),
      loadUnknown({ force: true, cacheBust }),
    ])
  }

  const syncPage = ({ silent = false } = {}) =>
    Promise.all([
      loadKnown({ silent: silent && knownList.value !== null }),
      loadUnknown({ silent: silent && unknownList.value !== null }),
    ])

  return {
    knownList,
    unknownList,
    knownLoading,
    unknownLoading,
    loadKnown,
    loadUnknown,
    refreshAll,
    syncPage,
    invalidateKnown: invalidateUsageConfigListCache,
    invalidateUnknown: invalidateUnknownUsagePendingCache,
    invalidateAll: invalidateUsageConfigPageCaches,
  }
}
