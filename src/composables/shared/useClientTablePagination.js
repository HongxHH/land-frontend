import { computed, ref, unref, watch } from 'vue'

/**
 * 客户端表格分页：超过 threshold 时仅向 el-table 绑定当前页 slice。
 * @param {import('vue').MaybeRefOrGetter<unknown[]>} rowsSource
 * @param {{ threshold?: number, pageSize?: number }} [options]
 */
export function useClientTablePagination(rowsSource, options = {}) {
  const threshold = Number(options.threshold ?? 80)
  const pageSize = Number(options.pageSize ?? 80)

  const pageNum = ref(1)
  const rows = computed(() => {
    const source = typeof rowsSource === 'function' ? rowsSource() : unref(rowsSource)
    return Array.isArray(source) ? source : []
  })

  const total = computed(() => rows.value.length)
  const showPagination = computed(() => total.value > threshold)
  const pageCount = computed(() => {
    if (!showPagination.value) return 1
    return Math.max(1, Math.ceil(total.value / pageSize))
  })

  const pagedRows = computed(() => {
    if (!showPagination.value) return rows.value
    const page = Math.min(Math.max(1, pageNum.value), pageCount.value)
    const start = (page - 1) * pageSize
    return rows.value.slice(start, start + pageSize)
  })

  watch(rows, () => {
    pageNum.value = 1
  })

  watch(pageCount, (count) => {
    if (pageNum.value > count) {
      pageNum.value = count
    }
  })

  const onPageChange = (nextPage) => {
    pageNum.value = Math.max(1, Number(nextPage || 1))
  }

  return {
    pagedRows,
    pageNum,
    pageSize,
    total,
    showPagination,
    pageCount,
    onPageChange
  }
}
