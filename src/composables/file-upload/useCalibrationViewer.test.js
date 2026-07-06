import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import axios from 'axios'
import { downloadGridFsFile } from '@/services/file.service'
import { queryRoomInfos } from '@/services/project.service'
import { useCalibrationViewer } from './useCalibrationViewer.js'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('@/services/file.service', () => ({
  downloadGridFsFile: vi.fn(),
}))

vi.mock('@/services/project.service', () => ({
  queryRoomInfos: vi.fn(),
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const summaryResponse = (summary) => ({
  data: {
    code: 200,
    data: {
      records: summary ? [summary] : [],
    },
  },
})

const roomResponse = (surveyReportInfoId, roomId) => ({
  data: {
    code: 200,
    data: {
      records: [
        {
          id: roomId,
          surveyReportInfoId,
          buildingArea: 10,
          innerArea: 8,
          balconyArea: 1,
          sharedArea: 1,
          usageCategory: 'RESIDENTIAL',
        },
      ],
      total: 1,
    },
  },
})

const createViewer = () => {
  const options = {
    currentProject: ref(1),
    showCalibration: ref(false),
    currentFile: ref(null),
    calibrationLoading: ref(false),
    roomInfoLoading: ref(false),
    roomInfoData: ref([]),
    roomInfoTotal: ref(0),
    roomInfoPageNum: ref(1),
    roomInfoPageSize: ref(50),
    roomSumInfo: reactive({}),
    auditSummaryData: reactive({}),
    usageCategoryMap: { RESIDENTIAL: '住宅' },
  }

  return {
    options,
    viewer: useCalibrationViewer(options),
  }
}

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

describe('useCalibrationViewer', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test-pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    downloadGridFsFile.mockResolvedValue({ data: new Uint8Array([1]) })
    queryRoomInfos.mockImplementation(({ surveyReportInfoId }) =>
      Promise.resolve(roomResponse(surveyReportInfoId, surveyReportInfoId + 1000))
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears prior report id and rooms when the next file has no survey summary', async () => {
    const { options, viewer } = createViewer()
    axios.post
      .mockResolvedValueOnce(summaryResponse({ id: 11, roomInfoBuildingAreaSum: 10 }))
      .mockResolvedValueOnce(summaryResponse(null))

    await viewer.openCalibration({ rawId: 101, fileId: 'gridfs-a' })
    expect(viewer.realSurveyReportId.value).toBe(11)
    expect(options.roomInfoData.value).toHaveLength(1)

    await viewer.openCalibration({ rawId: 202, fileId: 'gridfs-b' })

    expect(viewer.realSurveyReportId.value).toBeNull()
    expect(options.roomInfoData.value).toEqual([])
    expect(options.roomInfoTotal.value).toBe(0)
  })

  it('ignores stale async results from an older calibration open', async () => {
    const { options, viewer } = createViewer()
    const firstSummary = deferred()
    axios.post.mockImplementation(({ fileRecordId }) => {
      if (fileRecordId === 101) return firstSummary.promise
      return Promise.resolve(summaryResponse({ id: 22, roomInfoBuildingAreaSum: 10 }))
    })

    const firstOpen = viewer.openCalibration({ rawId: 101, fileId: 'gridfs-a' })
    const secondOpen = viewer.openCalibration({ rawId: 202, fileId: 'gridfs-b' })

    await secondOpen
    firstSummary.resolve(summaryResponse({ id: 11, roomInfoBuildingAreaSum: 10 }))
    await firstOpen

    expect(viewer.realSurveyReportId.value).toBe(22)
    expect(options.roomInfoData.value).toHaveLength(1)
    expect(options.roomInfoData.value[0].id).toBe(1022)
    expect(queryRoomInfos).not.toHaveBeenCalledWith(
      expect.objectContaining({ surveyReportInfoId: 11 })
    )
  })
})
