import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

/**
 * 从 useRoomEditWorkflow 抽出的分页合并逻辑，便于单测。
 */
export function applyRoomPageReload(roomInfoData, records, editingRowId = '') {
  const pageIds = new Set((records || []).map((row) => String(row.id)))
  const preserveId = String(editingRowId || '')
  const preserved = preserveId
    ? roomInfoData.filter((row) => String(row.id) === preserveId && !pageIds.has(String(row.id)))
    : []
  return [...(records || []), ...preserved]
}

describe('applyRoomPageReload', () => {
  it('keeps editing row when it is not on the reloaded page', () => {
    const editingRow = { id: 2901, roomNumber: '2901', roomUsage: '公寓式酒' }
    const roomInfoData = [editingRow]
    const pageRecords = [
      { id: 1, roomNumber: '101', roomUsage: '住宅' },
      { id: 2, roomNumber: '102', roomUsage: '商业' }
    ]

    const next = applyRoomPageReload(roomInfoData, pageRecords, '2901')
    expect(next).toHaveLength(3)
    expect(next[2]).toBe(editingRow)
  })

  it('does not duplicate row when editing row is on the reloaded page', () => {
    const roomInfoData = [{ id: 2, roomNumber: '102', roomUsage: '商业' }]
    const pageRecords = [
      { id: 1, roomNumber: '101', roomUsage: '住宅' },
      { id: 2, roomNumber: '102', roomUsage: '商业' }
    ]

    const next = applyRoomPageReload(roomInfoData, pageRecords, '2')
    expect(next).toHaveLength(2)
    expect(next.map((row) => row.id)).toEqual([1, 2])
  })
})

describe('ensureEditableRow pattern', () => {
  it('merges fields into existing row reference', () => {
    const roomInfoData = ref([{ id: 1, roomUsage: '公寓式酒', usageCategory: '未知' }])
    const incoming = { id: 1, roomUsage: '公寓式酒店', usageCategory: '商业' }

    const idx = roomInfoData.value.findIndex((row) => String(row.id) === '1')
    Object.assign(roomInfoData.value[idx], incoming)

    expect(roomInfoData.value[0].roomUsage).toBe('公寓式酒店')
    expect(roomInfoData.value[0].usageCategory).toBe('商业')
  })
})
