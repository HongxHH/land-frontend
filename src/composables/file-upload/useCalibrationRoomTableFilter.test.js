import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  fetchRoomInfoById,
  searchRoomInfosByPages
} from '@/composables/file-upload/roomInfoPageSearch.js'
import { useCalibrationRoomTableFilter, resolveRoomRowReferences } from '@/composables/file-upload/useCalibrationRoomTableFilter.js'

describe('searchRoomInfosByPages', () => {
  it('filters across pages and reports progress', async () => {
    const mapRoomInfoList = (rows) => rows
    const queryRoomInfos = vi.fn(async ({ pageNum }) => ({
      data: {
        code: 200,
        data: {
          records:
            pageNum === 1
              ? Array.from({ length: 200 }, (_, i) => ({
                id: i + 1,
                roomNumber: String(i + 1),
                roomUsage: '住宅'
              }))
              : [{ id: 201, roomNumber: '201', roomUsage: '商业' }],
          total: 201
        }
      }
    }))
    const progress = []
    const matches = await searchRoomInfosByPages({
      projectId: 1,
      surveyReportInfoId: 2,
      keyword: '商业',
      queryRoomInfos,
      mapRoomInfoList,
      onProgress: (p) => progress.push({ ...p })
    })

    expect(matches).toHaveLength(1)
    expect(matches[0].roomNumber).toBe('201')
    expect(queryRoomInfos).toHaveBeenCalledTimes(2)
    expect(progress.at(-1)?.done).toBe(true)
  })

  it('aborts when signal is triggered', async () => {
    const controller = new AbortController()
    controller.abort()
    const queryRoomInfos = vi.fn(async () => ({
      data: { code: 200, data: { records: [{ id: 1, roomUsage: '商业' }], total: 1 } }
    }))

    await expect(
      searchRoomInfosByPages({
        projectId: 1,
        surveyReportInfoId: 2,
        keyword: '商业',
        signal: controller.signal,
        queryRoomInfos,
        mapRoomInfoList: (rows) => rows
      })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('fetchRoomInfoById', () => {
  it('returns mapped row when found', async () => {
    const row = { id: 9, roomNumber: '901', roomUsage: '住宅' }
    const queryRoomInfos = vi.fn(async () => ({
      data: { code: 200, data: { records: [row] } }
    }))
    const result = await fetchRoomInfoById({
      roomInfoId: 9,
      queryRoomInfos,
      mapRoomInfoList: (rows) => rows.map((r) => ({ ...r, mapped: true }))
    })
    expect(result).toEqual({ ...row, mapped: true })
    expect(queryRoomInfos).toHaveBeenCalledWith(
      expect.objectContaining({ roomInfoId: 9, pageNum: 1, pageSize: 1 })
    )
  })
})

describe('useCalibrationRoomTableFilter', () => {
  it('filters current page when searchRoomPages is unavailable', async () => {
    const pageRows = [
      { roomNumber: '101', roomUsage: '住宅' },
      { roomNumber: '102', roomUsage: '商业' }
    ]
    const { keyword, filteredRoomInfoData, isFiltering } = useCalibrationRoomTableFilter(() => pageRows)

    keyword.value = '商业'
    await nextTick()

    expect(isFiltering.value).toBe(true)
    expect(filteredRoomInfoData.value).toHaveLength(1)
    expect(filteredRoomInfoData.value[0].roomNumber).toBe('102')
  })

  it('paginates search results when searchRoomPages is provided', async () => {
    vi.useFakeTimers()
    const pageRows = [{ roomNumber: '101', roomUsage: '住宅' }]
    const allRows = Array.from({ length: 55 }, (_, i) => ({
      id: i + 1,
      roomNumber: String(100 + i),
      roomUsage: '商业'
    }))
    const searchRoomPages = vi.fn(async () => allRows)

    const {
      keyword,
      filteredRoomInfoData,
      searchScanning,
      searchMatchTotal,
      showSearchPagination,
      onSearchPageChange
    } = useCalibrationRoomTableFilter({
      getRoomRows: () => pageRows,
      searchRoomPages,
      getTotal: () => 55
    })

    keyword.value = '商业'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    await nextTick()

    expect(searchRoomPages).toHaveBeenCalledTimes(1)
    expect(searchScanning.value).toBe(false)
    expect(searchMatchTotal.value).toBe(55)
    expect(showSearchPagination.value).toBe(true)
    expect(filteredRoomInfoData.value).toHaveLength(50)

    onSearchPageChange(2)
    await nextTick()
    expect(filteredRoomInfoData.value).toHaveLength(5)

    vi.useRealTimers()
  })

  it('ranks exact roomUsage matches before partial matches', async () => {
    const pageRows = [
      { roomNumber: '606', roomUsage: '公寓式酒店' },
      { roomNumber: '2901', roomUsage: '公寓式酒' }
    ]
    const { keyword, filteredRoomInfoData } = useCalibrationRoomTableFilter(() => pageRows)

    keyword.value = '公寓式酒'
    await nextTick()

    expect(filteredRoomInfoData.value.map((row) => row.roomNumber)).toEqual(['2901', '606'])
  })

  it('resolveRoomRowReferences prefers loaded page object references', () => {
    const loadedRow = { id: 1, roomNumber: '2901', roomUsage: '公寓式酒' }
    const searchRow = { id: 1, roomNumber: '2901', roomUsage: '公寓式酒' }
    const resolved = resolveRoomRowReferences([searchRow], () => [loadedRow])
    expect(resolved[0]).toBe(loadedRow)
  })

  it('uses loaded references for filtered rows when available', async () => {
    vi.useFakeTimers()
    const loadedRow = { id: 2, roomNumber: '2901', roomUsage: '公寓式酒' }
    const pageRows = [loadedRow]
    const allRows = [
      { id: 1, roomNumber: '606', roomUsage: '公寓式酒店' },
      { id: 2, roomNumber: '2901', roomUsage: '公寓式酒' }
    ]
    const searchRoomPages = vi.fn(async () => allRows)

    const { keyword, filteredRoomInfoData } = useCalibrationRoomTableFilter({
      getRoomRows: () => pageRows,
      searchRoomPages,
      getTotal: () => 2
    })

    keyword.value = '公寓式酒'
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    await nextTick()

    expect(filteredRoomInfoData.value.find((row) => String(row.id) === '2')).toBe(loadedRow)
    vi.useRealTimers()
  })
})
