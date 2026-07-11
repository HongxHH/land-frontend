import { ref, shallowRef } from 'vue'
import axios from 'axios'
import { floorAreaTypeLabel, usageCategoryLabel } from '@/constants/usageCategory.js'

/** @type {import('vue').ShallowRef<Array|null>} */
const knownList = shallowRef(null)
/** @type {import('vue').ShallowRef<Array|null>} */
const unknownList = shallowRef(null)

/** 模块级 loading，保证任意调用方触发加载时页面 v-loading 都能响应 */
const knownLoading = ref(false)
const unknownLoading = ref(false)

const knownInflightRef = { current: null }
const unknownInflightRef = { current: null }
/** 世代号：invalidate / 新 force 请求后丢弃过期响应，避免脏写 */
const knownGeneration = { value: 0 }
const unknownGeneration = { value: 0 }

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
  generation,
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
        generation,
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

  const requestGen = force ? ++generation.value : generation.value
  // 仅无缓存的首次加载展示 loading；force 刷新保留旧数据避免闪空
  const showLoading = !silent && cached === null
  if (showLoading) {
    loadingRef.value = true
  }

  const task = request(cacheBust)
    .then((rows) => {
      if (requestGen !== generation.value) {
        return cacheRef.value ?? rows
      }
      cacheRef.value = rows
      return rows
    })
    .finally(() => {
      if (inflightRef.current === task) {
        inflightRef.current = null
      }
      if (showLoading && requestGen === generation.value) {
        loadingRef.value = false
      }
    })

  inflightRef.current = task
  return task
}

export function invalidateUsageConfigListCache() {
  knownGeneration.value += 1
  knownList.value = null
  knownInflightRef.current = null
  knownLoading.value = false
}

export function invalidateUnknownUsagePendingCache() {
  unknownGeneration.value += 1
  unknownList.value = null
  unknownInflightRef.current = null
  unknownLoading.value = false
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
  const loadKnown = (options = {}) =>
    runCachedLoad({
      cacheRef: knownList,
      inflightRef: knownInflightRef,
      generation: knownGeneration,
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
      generation: unknownGeneration,
      request: requestUnknownList,
      loadingRef: unknownLoading,
      force: Boolean(options.force),
      silent: Boolean(options.silent),
      cacheBust: Boolean(options.cacheBust),
    })

  /** 强制刷新，保留旧数据直到新数据返回（避免列表闪空） */
  const refreshAll = ({ cacheBust = true } = {}) =>
    Promise.all([
      loadKnown({ force: true, cacheBust }),
      loadUnknown({ force: true, cacheBust }),
    ])

  const syncPage = ({ silent = false } = {}) =>
    Promise.all([
      loadKnown({ silent: silent && knownList.value !== null }),
      loadUnknown({ silent: silent && unknownList.value !== null }),
    ])

  const reload = (targets = ['known', 'unknown']) => {
    const jobs = []
    if (targets.includes('known')) jobs.push(loadKnown({ force: true }))
    if (targets.includes('unknown')) jobs.push(loadUnknown({ force: true }))
    return Promise.all(jobs)
  }

  return {
    knownList,
    unknownList,
    knownLoading,
    unknownLoading,
    loadKnown,
    loadUnknown,
    refreshAll,
    syncPage,
    reload,
    invalidateKnown: invalidateUsageConfigListCache,
    invalidateUnknown: invalidateUnknownUsagePendingCache,
    invalidateAll: invalidateUsageConfigPageCaches,
  }
}
