import { computed, ref, watch } from 'vue'

import { ElMessage } from 'element-plus'

import { filterAndRankRoomRows } from '@/utils/textMatchRank.js'
import { ROOM_SEARCH_FIELDS } from '@/composables/file-upload/roomInfoPageSearch.js'
import {
  FILTER_PRESET_MISSING_USAGE,
  isBlankRoomUsage,
} from '@/composables/file-upload/surveyUsagePending.js'

const SEARCH_FIELDS = ROOM_SEARCH_FIELDS

export const SEARCH_DISPLAY_PAGE_SIZE = 50

/** 搜索命中行优先复用已加载分页或离页编辑缓存中的同一对象引用，便于编辑/保存联动 */
export function resolveRoomRowReferences(rows, getRoomRows, resolveRowById) {
  const list = Array.isArray(rows) ? rows : []

  const loaded = getRoomRows?.() || []

  if (!loaded.length && typeof resolveRowById !== 'function') return list

  const loadedById = new Map(loaded.map((row) => [String(row.id), row]))

  return list.map((row) => {
    const id = String(row?.id ?? '')

    if (!id) return row

    const loadedRow = loadedById.get(id)
    if (loadedRow) return loadedRow

    if (typeof resolveRowById === 'function') {
      const resolved = resolveRowById(id, row)
      if (resolved) return resolved
    }

    return row
  })
}

export function useCalibrationRoomTableFilter(options) {
  const getRoomRows = typeof options === 'function' ? options : options?.getRoomRows

  const searchRoomPages = typeof options === 'function' ? undefined : options?.searchRoomPages

  const searchMissingUsagePages =
    typeof options === 'function' ? undefined : options?.searchMissingUsagePages

  const getTotal =
    typeof options === 'function'
      ? () => getRoomRows()?.length || 0
      : options?.getTotal || (() => getRoomRows()?.length || 0)

  const resolveRowById =
    typeof options === 'function' ? undefined : options?.resolveRowById

  const getEditRevision =
    typeof options === 'function' ? undefined : options?.getEditRevision

  const keyword = ref('')

  const filterPreset = ref('')

  const searchMatches = ref([])

  const searchProgress = ref(null)

  const searchScanning = ref(false)

  const searchDisplayPageNum = ref(1)

  let searchAbortController = null

  let debounceTimer = null

  let reloadSearchDebounceTimer = null

  let searchGeneration = 0

  const normalizedKeyword = computed(() =>
    String(keyword.value || '')
      .trim()
      .toLowerCase()
  )

  const isFiltering = computed(
    () =>
      normalizedKeyword.value.length > 0 ||
      filterPreset.value === FILTER_PRESET_MISSING_USAGE
  )

  const isMissingUsageFilter = computed(
    () => filterPreset.value === FILTER_PRESET_MISSING_USAGE
  )

  const searchMatchTotal = computed(() => {
    if (!isFiltering.value) return 0

    if (isMissingUsageFilter.value) {
      if (typeof searchMissingUsagePages === 'function') {
        return searchMatches.value.length
      }
      const rows = getRoomRows?.() || []
      return rows.filter((row) => isBlankRoomUsage(row?.roomUsage)).length
    }

    if (typeof searchRoomPages === 'function') {
      return searchMatches.value.length
    }

    const rows = getRoomRows?.() || []

    const kw = normalizedKeyword.value

    if (!kw) return rows.length

    return filterAndRankRoomRows(rows, kw, SEARCH_FIELDS).length
  })

  const runMissingUsageSearch = async () => {
    if (typeof searchMissingUsagePages !== 'function') return

    if (searchAbortController) {
      searchAbortController.abort()
    }

    searchAbortController = new AbortController()

    const { signal } = searchAbortController
    const generation = ++searchGeneration

    searchScanning.value = true

    searchProgress.value = null

    searchDisplayPageNum.value = 1

    searchMatches.value = []

    try {
      const matches = await searchMissingUsagePages({
        signal,
        onProgress: (progress) => {
          if (!signal.aborted) {
            searchProgress.value = progress
          }
        },
      })

      if (!signal.aborted) {
        searchMatches.value = Array.isArray(matches) ? matches : []
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('筛选用途缺失户室失败:', error)
        ElMessage.error('筛选用途缺失户室失败，请稍后重试')
        searchMatches.value = []
      }
    } finally {
      if (generation === searchGeneration) {
        searchScanning.value = false
      }
    }
  }

  const runSearch = async (kw) => {
    if (typeof searchRoomPages !== 'function') return

    if (searchAbortController) {
      searchAbortController.abort()
    }

    searchAbortController = new AbortController()

    const { signal } = searchAbortController
    const generation = ++searchGeneration

    searchScanning.value = true

    searchProgress.value = null

    searchDisplayPageNum.value = 1

    searchMatches.value = []

    try {
      const matches = await searchRoomPages(kw, {
        signal,

        onProgress: (progress) => {
          if (!signal.aborted) {
            searchProgress.value = progress
          }
        },
      })

      if (!signal.aborted) {
        searchMatches.value = Array.isArray(matches) ? matches : []
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('搜索户室失败:', error)

        ElMessage.error('搜索户室失败，请稍后重试')

        searchMatches.value = []
      }
    } finally {
      if (generation === searchGeneration) {
        searchScanning.value = false
      }
    }
  }

  watch(keyword, (value) => {
    if (debounceTimer != null) {
      clearTimeout(debounceTimer)

      debounceTimer = null
    }

    const trimmed = String(value || '').trim()

    if (trimmed) {
      filterPreset.value = ''
    }

    if (!trimmed) {
      if (filterPreset.value === FILTER_PRESET_MISSING_USAGE) {
        return
      }

      if (searchAbortController) {
        searchAbortController.abort()

        searchAbortController = null
      }

      searchMatches.value = []

      searchProgress.value = null

      searchScanning.value = false

      searchDisplayPageNum.value = 1

      return
    }

    if (typeof searchRoomPages !== 'function') {
      searchDisplayPageNum.value = 1

      return
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null

      runSearch(trimmed)
    }, 300)
  })

  watch(filterPreset, (preset) => {
    if (preset === FILTER_PRESET_MISSING_USAGE) {
      keyword.value = ''
      if (typeof searchMissingUsagePages === 'function') {
        runMissingUsageSearch()
        return
      }
      searchDisplayPageNum.value = 1
      searchMatches.value = []
      searchProgress.value = null
      searchScanning.value = false
      return
    }

    if (searchAbortController) {
      searchAbortController.abort()
      searchAbortController = null
    }
    searchMatches.value = []
    searchProgress.value = null
    searchScanning.value = false
    searchDisplayPageNum.value = 1
  })

  const resolvedSearchMatches = computed(() => {
    if (typeof getEditRevision === 'function') {
      void getEditRevision()
    }

    if (!isFiltering.value) return []

    if (isMissingUsageFilter.value) {
      if (typeof searchMissingUsagePages === 'function') {
        return resolveRoomRowReferences(searchMatches.value, getRoomRows, resolveRowById)
      }
      const rows = getRoomRows?.() || []
      return resolveRoomRowReferences(
        rows.filter((row) => isBlankRoomUsage(row?.roomUsage)),
        getRoomRows,
        resolveRowById
      )
    }

    if (typeof searchRoomPages === 'function') {
      return resolveRoomRowReferences(searchMatches.value, getRoomRows, resolveRowById)
    }

    const rows = getRoomRows?.() || []

    const kw = normalizedKeyword.value

    return resolveRoomRowReferences(
      filterAndRankRoomRows(rows, kw, SEARCH_FIELDS),
      getRoomRows,
      resolveRowById
    )
  })

  const filteredRoomInfoData = computed(() => {
    if (!isFiltering.value) {
      return getRoomRows?.() || []
    }

    const resolved = resolvedSearchMatches.value

    if (typeof searchRoomPages === 'function' || typeof searchMissingUsagePages === 'function') {
      const page = Math.max(1, searchDisplayPageNum.value)

      const start = (page - 1) * SEARCH_DISPLAY_PAGE_SIZE

      return resolved.slice(start, start + SEARCH_DISPLAY_PAGE_SIZE)
    }

    return resolved
  })

  const filteredCount = computed(() => searchMatchTotal.value)

  const searchDisplayPageCount = computed(() => {
    if (!isFiltering.value) return 0

    const usesPagedSearch =
      (isMissingUsageFilter.value && typeof searchMissingUsagePages === 'function') ||
      (!isMissingUsageFilter.value && typeof searchRoomPages === 'function')

    if (!usesPagedSearch) return 0

    const total = searchMatchTotal.value
    if (total <= 0) return 0
    return Math.ceil(total / SEARCH_DISPLAY_PAGE_SIZE)
  })

  const showSearchPagination = computed(
    () =>
      isFiltering.value &&
      searchMatchTotal.value > SEARCH_DISPLAY_PAGE_SIZE &&
      ((typeof searchRoomPages === 'function' && !isMissingUsageFilter.value) ||
        (isMissingUsageFilter.value && typeof searchMissingUsagePages === 'function'))
  )

  const clearKeyword = () => {
    keyword.value = ''
    filterPreset.value = ''
  }

  const setKeyword = (value) => {
    filterPreset.value = ''
    keyword.value = String(value ?? '')
  }

  const setFilterPreset = (preset) => {
    filterPreset.value = String(preset || '').trim()
  }

  const onSearchPageChange = (page) => {
    searchDisplayPageNum.value = Math.max(1, Number(page || 1))
  }

  const reloadSearchRows = ({ immediate = false } = {}) => {
    if (filterPreset.value === FILTER_PRESET_MISSING_USAGE) {
      if (typeof searchMissingUsagePages !== 'function') return
      if (searchScanning.value) return
      runMissingUsageSearch()
      return
    }

    const trimmed = String(keyword.value || '').trim()

    if (!trimmed || typeof searchRoomPages !== 'function') return
    if (searchScanning.value) return

    if (reloadSearchDebounceTimer != null) {
      clearTimeout(reloadSearchDebounceTimer)
      reloadSearchDebounceTimer = null
    }

    if (immediate) {
      runSearch(trimmed)
      return
    }

    reloadSearchDebounceTimer = setTimeout(() => {
      reloadSearchDebounceTimer = null
      if (searchScanning.value) return
      runSearch(trimmed)
    }, 600)
  }

  return {
    keyword,

    filterPreset,

    isFiltering,

    allRowsLoading: searchScanning,

    searchScanning,

    searchProgress,

    searchMatchTotal,

    searchDisplayPageNum,

    searchDisplayPageCount,

    showSearchPagination,

    filteredRoomInfoData,

    filteredCount,

    searchableTotal: computed(() => Number(getTotal() || 0)),

    clearKeyword,

    setKeyword,

    setFilterPreset,

    onSearchPageChange,

    reloadSearchRows,
  }
}
