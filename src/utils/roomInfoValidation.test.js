import { describe, expect, it } from 'vitest'
import { validateRoomForCreate, validateRoomForUpdate } from '@/utils/roomInfoValidation.js'

describe('roomInfoValidation', () => {
  it('rejects update rows whose area parts do not equal building area', () => {
    const result = validateRoomForUpdate(
      {
        id: 1,
        roomLevel: '1',
        roomNumber: '101',
        buildingArea: 10,
        innerArea: 6,
        balconyArea: 1,
        sharedArea: 1,
      },
      []
    )

    expect(result.ok).toBe(false)
    expect(result.message).toContain('建筑面积')
  })

  it('checks duplicate room identity while excluding the row being updated', () => {
    const existingRows = [
      { id: 1, roomLevel: '1', roomNumber: '101' },
      { id: 2, roomLevel: '1', roomNumber: '102' },
    ]

    expect(
      validateRoomForUpdate(
        {
          id: 1,
          roomLevel: '1',
          roomNumber: '101',
          buildingArea: 10,
          innerArea: 8,
          balconyArea: 1,
          sharedArea: 1,
        },
        existingRows
      ).ok
    ).toBe(true)

    const duplicate = validateRoomForCreate(
      {
        roomLevel: '1',
        roomNumber: '102',
        buildingArea: 10,
        innerArea: 8,
        balconyArea: 1,
        sharedArea: 1,
      },
      existingRows
    )

    expect(duplicate.ok).toBe(false)
    expect(duplicate.message).toContain('已存在相同楼层+房号')
  })
})
