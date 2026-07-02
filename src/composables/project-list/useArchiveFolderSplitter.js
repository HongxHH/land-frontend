import { nextTick, ref } from 'vue'

/** 归档资源管理器：左侧树宽度拖拽 */
export function useArchiveFolderSplitter({ onResize }) {
  const splitContainerRef = ref(null)
  const treePanelWidth = ref(340)
  const minTreePanelWidth = 300
  const minTablePanelWidth = 620
  let isDraggingSplitter = false

  const clampTreePanelWidth = (targetWidth) => {
    const container = splitContainerRef.value
    if (!container) return Math.max(minTreePanelWidth, targetWidth)
    const maxWidth = Math.max(minTreePanelWidth, container.clientWidth - minTablePanelWidth - 12)
    return Math.min(Math.max(minTreePanelWidth, targetWidth), maxWidth)
  }

  const handleSplitterMouseMove = (event) => {
    if (!isDraggingSplitter) return
    const containerRect = splitContainerRef.value?.getBoundingClientRect()
    if (!containerRect) return
    treePanelWidth.value = clampTreePanelWidth(event.clientX - containerRect.left)
  }

  const stopSplitterDrag = () => {
    if (!isDraggingSplitter) return
    isDraggingSplitter = false
    window.removeEventListener('mousemove', handleSplitterMouseMove)
    window.removeEventListener('mouseup', stopSplitterDrag)
    document.body.classList.remove('resizing-splitter')
    nextTick(() => onResize?.())
  }

  const handleSplitterMouseDown = () => {
    isDraggingSplitter = true
    document.body.classList.add('resizing-splitter')
    window.addEventListener('mousemove', handleSplitterMouseMove)
    window.addEventListener('mouseup', stopSplitterDrag)
  }

  const handleWindowResize = () => {
    treePanelWidth.value = clampTreePanelWidth(treePanelWidth.value)
    onResize?.()
  }

  const cleanupSplitter = () => {
    stopSplitterDrag()
  }

  return {
    splitContainerRef,
    treePanelWidth,
    handleSplitterMouseDown,
    handleWindowResize,
    cleanupSplitter
  }
}
