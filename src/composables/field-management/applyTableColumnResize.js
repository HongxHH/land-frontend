const HARD_MIN = 48

export function readColumnWidth(column) {
  const value = Number(column?.realWidth ?? column?.width ?? column?.minWidth ?? HARD_MIN)
  return Number.isFinite(value) ? Math.round(value) : HARD_MIN
}

export function readColumnMin(column) {
  const declared = Number(column?.minWidth)
  return Math.max(HARD_MIN, Number.isFinite(declared) ? Math.round(declared) : HARD_MIN)
}

function sum(widths) {
  return widths.reduce((total, width) => total + width, 0)
}

/**
 * 拖动结束后重算列宽：
 * 被拖列保持松手时的宽度（不低于 minWidth），差值只由右侧列消化，
 * 这样边线停在拖动位置，总宽不足容器时也不会在表格右侧留白。
 */
export function planColumnWidths({ columns, draggedIndex, newWidth, oldWidth, containerWidth }) {
  const widths = columns.map(readColumnWidth)
  const mins = columns.map(readColumnMin)
  const dragged = Math.max(mins[draggedIndex] ?? HARD_MIN, Math.round(Number(newWidth) || 0))
  const previous = Math.round(Number(oldWidth) || widths[draggedIndex])
  widths[draggedIndex] = dragged
  let delta = dragged - previous

  for (let index = draggedIndex + 1; index < widths.length && delta !== 0; index += 1) {
    if (delta > 0) {
      const room = Math.max(0, widths[index] - mins[index])
      const shrink = Math.min(delta, room)
      widths[index] -= shrink
      delta -= shrink
    } else {
      widths[index] -= delta
      delta = 0
    }
  }

  const unabsorbedWiden = delta > 0
  if (!unabsorbedWiden && containerWidth > 0) {
    const gap = containerWidth - sum(widths)
    if (gap !== 0) {
      const growIndex = draggedIndex < widths.length - 1 ? draggedIndex + 1 : draggedIndex
      const next = widths[growIndex] + gap
      if (next >= mins[growIndex]) widths[growIndex] = next
    }
  }
  return widths
}

/** 容器宽度变化时，把差额交给弹性列，避免再次出现右侧空白。 */
export function planContainerFill(columns, containerWidth, flexIndex) {
  const widths = columns.map(readColumnWidth)
  const mins = columns.map(readColumnMin)
  if (!containerWidth) return widths
  let delta = containerWidth - sum(widths)
  if (delta === 0) return widths

  const safeFlex = flexIndex >= 0 && flexIndex < widths.length ? flexIndex : 0
  if (delta > 0) {
    widths[safeFlex] += delta
    return widths
  }

  const order = [
    safeFlex,
    ...widths.map((_, index) => index).filter((index) => index !== safeFlex).reverse(),
  ]
  for (const index of order) {
    if (delta === 0) break
    const shrink = Math.min(widths[index] - mins[index], -delta)
    if (shrink <= 0) continue
    widths[index] -= shrink
    delta += shrink
  }
  return widths
}
