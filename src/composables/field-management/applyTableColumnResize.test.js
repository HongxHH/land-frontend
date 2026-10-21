import { describe, expect, it } from 'vitest'
import { planColumnWidths, planContainerFill } from './applyTableColumnResize.js'

const columns = [
  { label: '序号', width: 60, minWidth: 48 },
  { label: '用途匹配模式', realWidth: 260, minWidth: 150 },
  { label: '用途类别', width: 180, minWidth: 80 },
  { label: '面积类型', width: 140, minWidth: 80 },
  { label: '状态', width: 100, minWidth: 80 },
  { label: '备注', realWidth: 242, minWidth: 140 },
  { label: '操作', width: 320, minWidth: 320, fixed: 'right' },
]

const containerWidth = 60 + 260 + 180 + 140 + 100 + 242 + 320

describe('planColumnWidths', () => {
  it('缩小列时边线左移，宽度由右侧列补上，总宽不变', () => {
    const widths = planColumnWidths({
      columns,
      draggedIndex: 5,
      newWidth: 180,
      oldWidth: 242,
      containerWidth,
    })
    expect(widths[5]).toBe(180)
    expect(widths[6]).toBe(382)
    expect(widths[1]).toBe(260)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth)
  })

  it('加宽列时只压缩右侧列，左侧弹性列保持不动', () => {
    const widths = planColumnWidths({
      columns,
      draggedIndex: 3,
      newWidth: 220,
      oldWidth: 140,
      containerWidth,
    })
    expect(widths[1]).toBe(260)
    expect(widths[3]).toBe(220)
    expect(widths[4]).toBe(80)
    expect(widths[5]).toBe(182)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth)
  })

  it('拖得比最小宽度更窄时停在最小宽度，并补满容器', () => {
    const widths = planColumnWidths({
      columns,
      draggedIndex: 5,
      newWidth: 30,
      oldWidth: 242,
      containerWidth,
    })
    expect(widths[5]).toBe(140)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth)
  })

  it('右侧列无法再压缩时允许总宽超出容器，被拖列仍保持拖动宽度', () => {
    const widths = planColumnWidths({
      columns,
      draggedIndex: 5,
      newWidth: 400,
      oldWidth: 242,
      containerWidth,
    })
    expect(widths[5]).toBe(400)
    expect(widths[6]).toBe(320)
    expect(widths.reduce((total, width) => total + width, 0)).toBeGreaterThan(containerWidth)
  })

  it('拖动回调到达时被拖列已被写成新宽度，仍按旧宽度计算差值', () => {
    const afterDrag = columns.map((column, index) =>
      index === 5 ? { ...column, width: 180, realWidth: 180 } : column
    )
    const widths = planColumnWidths({
      columns: afterDrag,
      draggedIndex: 5,
      newWidth: 180,
      oldWidth: 242,
      containerWidth,
    })
    expect(widths[5]).toBe(180)
    expect(widths[1]).toBe(260)
    expect(widths[6]).toBe(382)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth)
  })

  it('已经留白时把缺口补到右侧列，被拖列宽度不变', () => {
    const widths = planColumnWidths({
      columns,
      draggedIndex: 1,
      newWidth: 200,
      oldWidth: 260,
      containerWidth: containerWidth + 80,
    })
    expect(widths[1]).toBe(200)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth + 80)
  })
})

describe('planContainerFill', () => {
  it('容器变宽时把多出来的宽度交给弹性列', () => {
    const widths = planContainerFill(columns, containerWidth + 40, 1)
    expect(widths[1]).toBe(300)
    expect(widths[5]).toBe(242)
  })

  it('容器变窄时先压缩弹性列，且不低于最小宽度', () => {
    const widths = planContainerFill(columns, containerWidth - 40, 1)
    expect(widths[1]).toBe(220)
    expect(widths.reduce((total, width) => total + width, 0)).toBe(containerWidth - 40)
  })
})
