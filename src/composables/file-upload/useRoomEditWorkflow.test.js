import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import axios from 'axios'
import { queryRoomInfos } from '@/services/project.service'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow.js'

vi.mock('axios', () => ({
  default: {
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

vi.mock('@/services/project.service', () => ({
  queryRoomInfos: vi.fn(),
  updateSurveyReportInfo: vi.fn(),
}))

const makeRoom = (id, buildingArea) => ({
  id,
  roomLevel: `${id}层`,
  roomNumber: `${id}01`,
  buildingArea,
  innerArea: '0',
  balconyArea: '0',
  sharedArea: '0',
  isCalculate: 1,
  usageCategory: '未知',
  roomUsage: '未知',
  floorAreaType: '未知',
  remark: '',
})

const makeApiRoom = (id, buildingArea) => ({
  id,
  roomLevel: `${id}层`,
  roomNumber: `${id}01`,
  buildingArea,
  innerArea: 0,
  balconyArea: 0,
  sharedArea: 0,
  isCalculate: 1,
  usageCategory: 'UNKNOWN',
  roomUsage: '未知',
  floorAreaType: 'UNKNOWN',
  remark: '',
})

describe('useRoomEditWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    axios.post.mockResolvedValue({
      data: {
        data: {
          records: [{}],
        },
      },
    })
  })

  it('does not discard rows that were persisted before a batch save partially failed', async () => {
    const roomInfoData = ref([makeRoom(1, '10'), makeRoom(2, '20')])
    const workflow = useRoomEditWorkflow({
      currentProject: ref(100),
      realSurveyReportId: ref(200),
      currentFile: ref({ rawId: 300 }),
      roomInfoData,
      roomInfoLoading: ref(false),
      roomInfoTotal: ref(2),
      roomInfoPageNum: ref(1),
      roomInfoPageSize: ref(50),
      usageCategoryMap: {},
      usageCategoryReverseMap: {},
      auditSummaryData: {},
    })

    workflow.prepareRowForEdit(roomInfoData.value[0])
    roomInfoData.value[0].buildingArea = '11'
    workflow.notifyRowTouched(roomInfoData.value[0])

    workflow.prepareRowForEdit(roomInfoData.value[1])
    roomInfoData.value[1].buildingArea = '21'
    workflow.notifyRowTouched(roomInfoData.value[1])

    axios.put.mockImplementation((url, body) =>
      body.id === 1
        ? Promise.resolve({ data: { code: 200 } })
        : Promise.resolve({ data: { code: 400, msg: '校验失败' } })
    )
    queryRoomInfos.mockResolvedValue({
      data: {
        code: 200,
        data: {
          total: 2,
          records: [makeApiRoom(1, 11), makeApiRoom(2, 20)],
        },
      },
    })

    await expect(workflow.handleSaveDirtyRows()).resolves.toBe(false)
    expect(roomInfoData.value[0].buildingArea).toBe('11')

    workflow.discardAllChanges()

    expect(roomInfoData.value[0].buildingArea).toBe('11')
    expect(roomInfoData.value[1].buildingArea).toBe('20')
  })
})
