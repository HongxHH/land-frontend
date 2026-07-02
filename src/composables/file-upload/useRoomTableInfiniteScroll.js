import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const SCROLL_THRESHOLD_PX = 48
const MAX_VIEWPORT_FILL_ATTEMPTS = 8

export function useRoomTableInfiniteScroll({
  tableRef,
  enabled,
  hasMore,
  loading,
  loadingMore,
  onLoadMore
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

  const tryLoadMore = () => {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (!enabled?.value) return
      if (!hasMore?.value) return
      if (loading?.value || loadingMore?.value) return
      const body = resolveBodyWrapper()
      if (!body) return
      const remaining = body.scrollHeight - body.scrollTop - body.clientHeight
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
    const body = resolveBodyWrapper()
    if (!body) return
    if (body.scrollHeight <= body.clientHeight + 1) {
      const loaded = await onLoadMore?.()
      if (loaded === false) return
      await tryFillViewport(attempt + 1)
    }
  }

  const onScroll = () => {
    tryLoadMore()
  }

  const bindScroll = () => {
    unbindScroll()
    const body = resolveBodyWrapper()
    if (!body) return
    body.addEventListener('scroll', onScroll, { passive: true })
    scrollBound.value = true
  }

  const unbindScroll = () => {
    const body = resolveBodyWrapper()
    if (body) {
      body.removeEventListener('scroll', onScroll)
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
    rebindScroll: bindScroll
  }
}
