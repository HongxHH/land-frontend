import { computed, ref, watch } from 'vue'

import { ElMessage } from 'element-plus'

import { filterAndRankRoomRows } from '@/utils/textMatchRank.js'



const SEARCH_FIELDS = ['usageCategory', 'roomUsage', 'floorAreaType', 'remark', 'roomLevel', 'roomNumber']



export const SEARCH_DISPLAY_PAGE_SIZE = 50



/** 搜索命中行优先复用已加载分页中的同一对象引用，便于编辑/保存联动 */

export function resolveRoomRowReferences(rows, getRoomRows) {

  const list = Array.isArray(rows) ? rows : []

  const loaded = getRoomRows?.() || []

  if (!loaded.length) return list

  const loadedById = new Map(loaded.map((row) => [String(row.id), row]))

  return list.map((row) => {

    const id = String(row?.id ?? '')

    if (!id) return row

    return loadedById.get(id) ?? row

  })

}



export function useCalibrationRoomTableFilter(options) {

  const getRoomRows = typeof options === 'function' ? options : options?.getRoomRows

  const searchRoomPages = typeof options === 'function' ? undefined : options?.searchRoomPages

  const getTotal = typeof options === 'function'

    ? () => (getRoomRows()?.length || 0)

    : (options?.getTotal || (() => (getRoomRows()?.length || 0)))



  const keyword = ref('')

  const searchMatches = ref([])

  const searchProgress = ref(null)

  const searchScanning = ref(false)

  const searchDisplayPageNum = ref(1)

  let searchAbortController = null

  let debounceTimer = null



  const normalizedKeyword = computed(() => String(keyword.value || '').trim().toLowerCase())



  const isFiltering = computed(() => normalizedKeyword.value.length > 0)



  const searchMatchTotal = computed(() => {

    if (!isFiltering.value) return 0

    if (typeof searchRoomPages === 'function') {

      return searchMatches.value.length

    }

    const rows = getRoomRows?.() || []

    const kw = normalizedKeyword.value

    if (!kw) return rows.length

    return filterAndRankRoomRows(rows, kw, SEARCH_FIELDS).length

  })



  const runSearch = async (kw) => {

    if (typeof searchRoomPages !== 'function') return



    if (searchAbortController) {

      searchAbortController.abort()

    }

    searchAbortController = new AbortController()

    const { signal } = searchAbortController



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

        }

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

      if (!signal.aborted) {

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

    if (!trimmed) {

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



  const resolvedSearchMatches = computed(() => {

    if (!isFiltering.value) return []

    if (typeof searchRoomPages === 'function') {

      return resolveRoomRowReferences(searchMatches.value, getRoomRows)

    }

    const rows = getRoomRows?.() || []

    const kw = normalizedKeyword.value

    return resolveRoomRowReferences(filterAndRankRoomRows(rows, kw, SEARCH_FIELDS), getRoomRows)

  })



  const filteredRoomInfoData = computed(() => {

    if (!isFiltering.value) {

      return getRoomRows?.() || []

    }

    const resolved = resolvedSearchMatches.value

    if (typeof searchRoomPages === 'function') {

      const page = Math.max(1, searchDisplayPageNum.value)

      const start = (page - 1) * SEARCH_DISPLAY_PAGE_SIZE

      return resolved.slice(start, start + SEARCH_DISPLAY_PAGE_SIZE)

    }

    return resolved

  })



  const filteredCount = computed(() => searchMatchTotal.value)



  const searchDisplayPageCount = computed(() => {

    if (!isFiltering.value || typeof searchRoomPages !== 'function') return 0

    const total = searchMatchTotal.value

    if (total <= 0) return 0

    return Math.ceil(total / SEARCH_DISPLAY_PAGE_SIZE)

  })



  const showSearchPagination = computed(

    () => isFiltering.value && typeof searchRoomPages === 'function' && searchMatchTotal.value > SEARCH_DISPLAY_PAGE_SIZE

  )



  const clearKeyword = () => {

    keyword.value = ''

  }



  const setKeyword = (value) => {

    keyword.value = String(value ?? '')

  }



  const onSearchPageChange = (page) => {

    searchDisplayPageNum.value = Math.max(1, Number(page || 1))

  }



  const reloadSearchRows = () => {

    const trimmed = String(keyword.value || '').trim()

    if (trimmed && typeof searchRoomPages === 'function') {

      runSearch(trimmed)

    }

  }



  return {

    keyword,

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

    onSearchPageChange,

    reloadSearchRows

  }

}


