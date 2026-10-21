import { onBeforeUnmount, onMounted, watch } from 'vue'
import { planColumnWidths, planContainerFill, readColumnWidth } from './applyTableColumnResize.js'

function columnList(tableRef) {
  return tableRef.value?.store?.states?.columns?.value ?? null
}

function containerWidthOf(table) {
  return table?.$el?.clientWidth || 0
}

function widthsMatch(columns, widths) {
  return widths.every((width, index) => width === readColumnWidth(columns[index]))
}

/**
 * Element Plus 在 fit 模式下会把拖动差额分给所有弹性列（包括左侧列），
 * 边线因此对不上松手位置；弹性列被拖完后总宽又小于容器，表格右侧留白。
 * 这里在 header-dragend 之后改写列宽，让边线跟手并铺满容器。
 */
export function useAdminTableColumnResize(tableRef, flexKey) {
  let observer = null

  const applyWidths = (widths) => {
    const table = tableRef.value
    const columns = columnList(tableRef)
    if (!table || !columns) return
    columns.forEach((column, index) => {
      column.width = widths[index]
      column.realWidth = widths[index]
    })
    table.doLayout?.()
  }

  const fillContainer = () => {
    const table = tableRef.value
    const columns = columnList(tableRef)
    if (!table || !columns?.length) return
    if (!columns.every((column) => column.realWidth || column.width)) return
    const containerWidth = containerWidthOf(table)
    if (!containerWidth) return
    const flexIndex = columns.findIndex(
      (column) => column.columnKey === flexKey || column.property === flexKey
    )
    const widths = planContainerFill(columns, containerWidth, flexIndex)
    if (widthsMatch(columns, widths)) return
    applyWidths(widths)
  }

  const onHeaderDragend = (newWidth, oldWidth, column) => {
    const table = tableRef.value
    const columns = columnList(tableRef)
    if (!table || !columns?.length) return
    const draggedIndex = columns.findIndex((item) => item.id === column.id)
    if (draggedIndex < 0) return
    applyWidths(
      planColumnWidths({
        columns,
        draggedIndex,
        newWidth,
        oldWidth,
        containerWidth: containerWidthOf(table),
      })
    )
  }

  const bindObserver = () => {
    observer?.disconnect()
    observer = null
    const el = tableRef.value?.$el
    if (!el || typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(() => fillContainer())
    observer.observe(el)
  }

  onMounted(bindObserver)
  watch(tableRef, bindObserver)
  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  return { onHeaderDragend }
}
