import { onBeforeUnmount, ref } from 'vue'

const LAYOUT_SLACK_PX = 4

/** 按 tab-content 内 toolbar 下方至底部的实际像素距离计算 explorer-split 高度 */
export function useArchiveExplorerHeight(getContainer) {
  const explorerHeight = ref(480)
  let resizeObserver = null

  const updateExplorerHeight = () => {
    const root = getContainer()
    if (!root) return
    const toolbar = root.querySelector('.archive-toolbar')
    if (!toolbar) return
    const rootRect = root.getBoundingClientRect()
    const toolbarRect = toolbar.getBoundingClientRect()
    const padBottom = Number.parseFloat(getComputedStyle(root).paddingBottom) || 0
    const next = Math.floor(rootRect.bottom - toolbarRect.bottom - padBottom - LAYOUT_SLACK_PX)
    explorerHeight.value = Math.max(420, next)
  }

  const bindExplorerHeightObserver = () => {
    const el = getContainer()
    if (!el || typeof ResizeObserver === 'undefined') {
      updateExplorerHeight()
      return
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    resizeObserver = new ResizeObserver(() => updateExplorerHeight())
    resizeObserver.observe(el)
    const toolbar = el.querySelector('.archive-toolbar')
    if (toolbar) resizeObserver.observe(toolbar)
    updateExplorerHeight()
  }

  const disconnectExplorerHeightObserver = () => {
    if (!resizeObserver) return
    try {
      resizeObserver.disconnect()
    } catch {
      /* ignore */
    }
    resizeObserver = null
  }

  onBeforeUnmount(disconnectExplorerHeightObserver)

  return {
    explorerHeight,
    updateExplorerHeight,
    bindExplorerHeightObserver,
    disconnectExplorerHeightObserver,
  }
}
