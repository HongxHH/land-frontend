import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const SCROLL_THRESHOLD_PX = 48
const MAX_VIEWPORT_FILL_ATTEMPTS = 8

export function useRoomTableInfiniteScroll({
  tableRef,
  enabled,
  hasMore,
  loading,
  loadingMore,
  onLoadMore,
}) {
  const scrollBound = ref(false)
  let rafId = null

  const resolveBodyWrapper = () => {
    const table = tableRef.value
    if (!table) return null
    if (table.$refs?.bodyWrapper) return table.$refs.bodyWrapper
    const root = table.$el
    if (!root) return null
    return root.querySelector('.el-table__body-wrapper')
  }

  /** Element Plus 表格实际滚动在 bodyWrapper 内的 el-scrollbar__wrap 上 */
  const resolveScrollContainer = () => {
    const bodyWrapper = resolveBodyWrapper()
    if (!bodyWrapper) return null
    return bodyWrapper.querySelector('.el-scrollbar__wrap') || bodyWrapper
  }

  const tryLoadMore = () => {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!enabled?.value) return
      if (!hasMore?.value) return
      if (loading?.value || loadingMore?.value) return
      const scrollEl = resolveScrollContainer()
      if (!scrollEl) return
      const remaining = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight
      if (remaining <= SCROLL_THRESHOLD_PX) {
        onLoadMore?.()
      }
    })
  }

  const tryFillViewport = async (attempt = 0) => {
    await nextTick()
    if (!enabled?.value || !hasMore?.value) return
    if (loading?.value || loadingMore?.value) return
    if (attempt >= MAX_VIEWPORT_FILL_ATTEMPTS) return
    const scrollEl = resolveScrollContainer()
    if (!scrollEl) return
    if (scrollEl.scrollHeight <= scrollEl.clientHeight + 1) {
      const loaded = await onLoadMore?.()
      if (loaded === false) return
      await tryFillViewport(attempt + 1)
    }
  }

  const onScroll = () => {
    tryLoadMore()
  }

  let boundScrollEl = null

  const bindScroll = () => {
    unbindScroll()
    const scrollEl = resolveScrollContainer()
    if (!scrollEl) return
    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    boundScrollEl = scrollEl
    scrollBound.value = true
  }

  const unbindScroll = () => {
    if (boundScrollEl) {
      boundScrollEl.removeEventListener('scroll', onScroll)
      boundScrollEl = null
    }
    scrollBound.value = false
  }

  watch(
    [enabled, tableRef],
    async ([isEnabled]) => {
      await nextTick()
      unbindScroll()
      if (isEnabled) {
        bindScroll()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    unbindScroll()
  })

  return {
    tryFillViewport,
    rebindScroll: bindScroll,
  }
}
