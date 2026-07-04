import { nextTick, onUnmounted, watch } from 'vue'

function debounce(fn, ms) {
  let timer = 0
  return (...args) => {
    clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), ms)
  }
}

/** vue-office 内置 x-spreadsheet 只监听 window resize，容器变宽/变高不会重绘，需手动触发 */
export function useVueOfficeExcelLayout(containerRef, isActive) {
  let resizeObserver = null

  const fireSpreadsheetWindowResize = () => {
    window.dispatchEvent(new Event('resize'))
  }

  const debouncedSpreadsheetResize = debounce(fireSpreadsheetWindowResize, 80)

  const triggerSpreadsheetLayout = () => {
    nextTick(() => {
      requestAnimationFrame(() => {
        fireSpreadsheetWindowResize()
      })
    })
  }

  const unbindResizeObserver = () => {
    resizeObserver?.disconnect()
    resizeObserver = null
  }

  const bindResizeObserver = () => {
    unbindResizeObserver()
    const el = containerRef.value
    if (!el || typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(() => {
      debouncedSpreadsheetResize()
    })
    resizeObserver.observe(el)
  }

  const syncExcelLayout = () => {
    if (!isActive()) return
    bindResizeObserver()
    triggerSpreadsheetLayout()
  }

  watch(isActive, (active) => {
    if (!active) {
      unbindResizeObserver()
      return
    }
    syncExcelLayout()
  })

  onUnmounted(unbindResizeObserver)

  return {
    triggerSpreadsheetLayout,
    syncExcelLayout,
  }
}
