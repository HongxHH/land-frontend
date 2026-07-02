import { onBeforeUnmount, ref } from 'vue'

const LAYOUT_SLACK_PX = 4

/** 归档文件表：按 table-body-host 与 pager 之间的实际像素距离计算 el-table height */
export function useArchiveFileTableHeight() {
  const tableWrapRef = ref(null)
  const tableBodyHostRef = ref(null)
  const tableBodyHeight = ref(360)
  let tableWrapResizeObserver = null

  const updateTableBodyHeight = () => {
    const host = tableBodyHostRef.value
    const wrap = tableWrapRef.value
    if (!host || !wrap) return
    requestAnimationFrame(() => {
      const hostEl = tableBodyHostRef.value
      const wrapEl = tableWrapRef.value
      if (!hostEl || !wrapEl) return
      const pager = wrapEl.querySelector('.pager-row')
      let next
      if (pager) {
        const hostTop = hostEl.getBoundingClientRect().top
        const pagerTop = pager.getBoundingClientRect().top
        next = Math.floor(pagerTop - hostTop - LAYOUT_SLACK_PX)
      } else {
        next = Math.floor(hostEl.clientHeight - LAYOUT_SLACK_PX)
      }
      tableBodyHeight.value = Math.max(120, next)
    })
  }

  const bindTableWrapResizeObserver = () => {
    const wrap = tableWrapRef.value
    const host = tableBodyHostRef.value
    if (!wrap || !host || typeof ResizeObserver === 'undefined') return
    if (tableWrapResizeObserver) {
      tableWrapResizeObserver.disconnect()
      tableWrapResizeObserver = null
    }
    tableWrapResizeObserver = new ResizeObserver(() => updateTableBodyHeight())
    tableWrapResizeObserver.observe(wrap)
    tableWrapResizeObserver.observe(host)
    const pager = wrap.querySelector('.pager-row')
    if (pager) tableWrapResizeObserver.observe(pager)
    updateTableBodyHeight()
  }

  const disconnectTableWrapObserver = () => {
    if (!tableWrapResizeObserver) return
    try {
      tableWrapResizeObserver.disconnect()
    } catch {
      /* ignore */
    }
    tableWrapResizeObserver = null
  }

  onBeforeUnmount(disconnectTableWrapObserver)

  return {
    tableWrapRef,
    tableBodyHostRef,
    tableBodyHeight,
    updateTableBodyHeight,
    bindTableWrapResizeObserver,
    disconnectTableWrapObserver
  }
}
