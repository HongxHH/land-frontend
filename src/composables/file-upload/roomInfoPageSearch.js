import { filterAndRankRoomRows } from '@/utils/textMatchRank.js'

export const ROOM_SEARCH_FIELDS = [
  'usageCategory',
  'roomUsage',
  'floorAreaType',
  'remark',
  'roomLevel',
  'roomNumber',
]

export const ROOM_SEARCH_PAGE_SIZE = 200
export const MAX_ROOM_SEARCH_PAGES = 50

/**
 * 按页拉取户室并在前端过滤；支持 AbortSignal 与进度回调。
 * @param {object} params
 * @param {number} params.projectId
 * @param {number} params.surveyReportInfoId
 * @param {string} params.keyword
 * @param {AbortSignal} [params.signal]
 * @param {(progress: { scannedPages: number, totalPages: number, matchCount: number, done: boolean }) => void} [params.onProgress]
 * @param {Function} params.queryRoomInfos
 * @param {Function} params.mapRoomInfoList
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function searchRoomInfosByPages({
  projectId,
  surveyReportInfoId,
  keyword,
  signal,
  onProgress,
  queryRoomInfos,
  mapRoomInfoList,
}) {
  const kw = String(keyword || '').trim()
  if (!kw || !projectId || !surveyReportInfoId) {
    onProgress?.({ scannedPages: 0, totalPages: 0, matchCount: 0, done: true })
    return []
  }

  const rawMatches = []
  let pageNum = 1
  let total = 0
  let totalPages = 1

  while (pageNum <= MAX_ROOM_SEARCH_PAGES) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const roomRes = await queryRoomInfos({
      projectId,
      surveyReportInfoId,
      pageNum,
      pageSize: ROOM_SEARCH_PAGE_SIZE,
      sortField: 'id',
      sortDirection: 'asc',
    })
    if (roomRes.data?.code !== 200) break

    const body = roomRes.data.data || {}
    const records = Array.isArray(body.records) ? body.records : []
    total = Number(body.total ?? 0)
    totalPages = Math.max(1, Math.ceil(total / ROOM_SEARCH_PAGE_SIZE))

    const mapped = mapRoomInfoList(records)
    const batchMatches = filterAndRankRoomRows(mapped, kw, ROOM_SEARCH_FIELDS)
    rawMatches.push(...batchMatches)

    onProgress?.({
      scannedPages: pageNum,
      totalPages,
      matchCount: rawMatches.length,
      done: false,
    })

    if (records.length === 0) break
    if (pageNum >= totalPages) break
    pageNum += 1
  }

  const ranked = filterAndRankRoomRows(rawMatches, kw, ROOM_SEARCH_FIELDS)
  onProgress?.({
    scannedPages: pageNum,
    totalPages,
    matchCount: ranked.length,
    done: true,
  })
  return ranked
}

/**
 * @param {object} params
 * @param {number|string} params.roomInfoId
 * @param {Function} params.queryRoomInfos
 * @param {Function} params.mapRoomInfoList
 */
export async function fetchRoomInfoById({ roomInfoId, queryRoomInfos, mapRoomInfoList }) {
  const id = Number(roomInfoId || 0)
  if (!id) return null

  const roomRes = await queryRoomInfos({
    roomInfoId: id,
    pageNum: 1,
    pageSize: 1,
  })
  if (roomRes.data?.code !== 200) return null

  const records = Array.isArray(roomRes.data?.data?.records) ? roomRes.data.data.records : []
  const mapped = mapRoomInfoList(records)
  return mapped[0] ?? null
}
