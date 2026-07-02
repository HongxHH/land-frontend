import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

/**
 * 宽表横向浏览：表体 Shift+滚轮、按步长滚动、边缘可滚动提示。
 */
export function useSummaryTableHorizontalScroll(tableRef, tableDataRef) {
  const showXScrollProxy = ref(false)
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)

  let bodyScrollEl = null
  let resizeObserver = null
  let resizeDebounce = null

  function getBodyScrollEl() {
    const root = tableRef.value?.$el
    if (!root) return null
    return (
      root.querySelector('.el-table__body-wrapper .el-scrollbar__wrap') ||
      root.querySelector('.el-table__body-wrapper')
    )
  }

  function updateScrollHints() {
    const el = bodyScrollEl || getBodyScrollEl()
    if (!el || el.scrollWidth <= el.clientWidth + 1) {
      canScrollLeft.value = false
      canScrollRight.value = false
      return
    }
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const left = el.scrollLeft
    canScrollLeft.value = left > 2
    canScrollRight.value = left < max - 2
  }

  function handleBodyScroll() {
    updateScrollHints()
  }

  function handleWheelShift(e) {
    if (!e.shiftKey) return
    const el = e.currentTarget
    if (el.scrollWidth <= el.clientWidth) return
    e.preventDefault()
    el.scrollLeft += e.deltaY
    updateScrollHints()
  }

  function detachBodyScroll() {
    if (bodyScrollEl) {
      bodyScrollEl.removeEventListener('scroll', handleBodyScroll)
      bodyScrollEl.removeEventListener('wheel', handleWheelShift)
      bodyScrollEl = null
    }
  }

  function measure() {
    nextTick(() => {
      try {
        detachBodyScroll()
        const el = getBodyScrollEl()
        if (!el) {
          showXScrollProxy.value = false
          canScrollLeft.value = false
          canScrollRight.value = false
          return
        }
        bodyScrollEl = el
        bodyScrollEl.addEventListener('scroll', handleBodyScroll, { passive: true })
        bodyScrollEl.addEventListener('wheel', handleWheelShift, { passive: false })
        const sw = el.scrollWidth
        const cw = el.clientWidth
        showXScrollProxy.value = sw > cw + 2
        updateScrollHints()
      } catch (e) {
        console.warn('[summary-table] horizontal scroll measure failed', e)
      }
    })
  }

  function scrollTableBy(dx) {
    const el = getBodyScrollEl()
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const next = Math.max(0, Math.min(max, el.scrollLeft + dx))
    el.scrollTo({ left: next, behavior: 'smooth' })
    nextTick(() => updateScrollHints())
  }

  onMounted(() => {
    nextTick(() => {
      measure()
      const root = tableRef.value?.$el
      if (root) {
        resizeObserver = new ResizeObserver(() => {
          if (resizeDebounce) clearTimeout(resizeDebounce)
          resizeDebounce = setTimeout(() => measure(), 80)
        })
        resizeObserver.observe(root)
      }
    })
  })

  if (tableDataRef) {
    watch(tableDataRef, () => nextTick(measure))
  }

  onBeforeUnmount(() => {
    if (resizeDebounce) clearTimeout(resizeDebounce)
    detachBodyScroll()
    resizeObserver?.disconnect()
  })

  return {
    showXScrollProxy,
    canScrollLeft,
    canScrollRight,
    scrollTableBy,
    measure
  }
}
