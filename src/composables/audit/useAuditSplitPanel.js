import { computed, onUnmounted, ref } from 'vue'

const MIN_PCT = 22
const MAX_PCT = 78
const BODY_DRAGGING_CLASS = 'audit-split-panel-dragging'

/**
 * 审核类全屏弹窗左右分栏可拖拽调节宽度（与 window.resize 无联动，PDF/表格需各自处理 onSplitEnd）。
 * @param {{ defaultLeftPercent?: number, onSplitEnd?: () => void }} [options]
 */
export function useAuditSplitPanel(options = {}) {
  const { defaultLeftPercent = 45, onSplitEnd } = options

  const auditLayoutRef = ref(null)
  const leftPanelPercent = ref(defaultLeftPercent)
  const isSplitterDragging = ref(false)

  const leftPanelStyle = computed(() => ({
    width: `${leftPanelPercent.value}%`,
    flexShrink: 0
  }))

  let splitterListenersCleanup = null

  const setIframePointerEvents = (layout, enabled) => {
    if (!layout) return
    layout.querySelectorAll('iframe').forEach((iframe) => {
      if (enabled) {
        iframe.style.pointerEvents = iframe.dataset.auditSplitPrevPe ?? ''
        delete iframe.dataset.auditSplitPrevPe
      } else if (iframe.dataset.auditSplitPrevPe === undefined) {
        iframe.dataset.auditSplitPrevPe = iframe.style.pointerEvents
        iframe.style.pointerEvents = 'none'
      }
    })
  }

  const clampPercent = (pct) => Math.max(MIN_PCT, Math.min(MAX_PCT, pct))

  const applyDragDelta = (layout, startX, startPct, clientX) => {
    const rect = layout.getBoundingClientRect()
    const totalW = rect.width || 1
    const deltaPct = ((clientX - startX) / totalW) * 100
    leftPanelPercent.value = clampPercent(startPct + deltaPct)
  }

  const onSplitterMouseDown = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()

    const layout = auditLayoutRef.value
    const splitter = e.currentTarget
    if (!layout || !splitter) return

    splitterListenersCleanup?.()

    const startX = e.clientX
    const startPct = leftPanelPercent.value
    const pointerId = e.pointerId

    if (typeof splitter.setPointerCapture === 'function' && pointerId != null) {
      try {
        splitter.setPointerCapture(pointerId)
      } catch {
        // ignore unsupported capture
      }
    }

    isSplitterDragging.value = true
    document.body.classList.add(BODY_DRAGGING_CLASS)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    setIframePointerEvents(layout, false)

    const onMove = (ev) => {
      if (ev.pointerId != null && pointerId != null && ev.pointerId !== pointerId) return
      applyDragDelta(layout, startX, startPct, ev.clientX)
    }

    const onUp = (ev) => {
      if (ev?.pointerId != null && pointerId != null && ev.pointerId !== pointerId) return

      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      splitter.removeEventListener('pointermove', onMove)
      splitter.removeEventListener('pointerup', onUp)
      splitter.removeEventListener('pointercancel', onUp)

      if (typeof splitter.releasePointerCapture === 'function' && pointerId != null) {
        try {
          if (splitter.hasPointerCapture?.(pointerId)) {
            splitter.releasePointerCapture(pointerId)
          }
        } catch {
          // ignore
        }
      }

      setIframePointerEvents(layout, true)
      document.body.classList.remove(BODY_DRAGGING_CLASS)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      isSplitterDragging.value = false
      splitterListenersCleanup = null
      onSplitEnd?.()
    }

    splitterListenersCleanup = onUp

    splitter.addEventListener('pointermove', onMove)
    splitter.addEventListener('pointerup', onUp)
    splitter.addEventListener('pointercancel', onUp)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  onUnmounted(() => {
    splitterListenersCleanup?.()
    document.body.classList.remove(BODY_DRAGGING_CLASS)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    setIframePointerEvents(auditLayoutRef.value, true)
  })

  return {
    auditLayoutRef,
    leftPanelPercent,
    leftPanelStyle,
    isSplitterDragging,
    onSplitterMouseDown
  }
}
