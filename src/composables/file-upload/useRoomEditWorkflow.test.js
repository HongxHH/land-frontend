import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow.js'

vi.mock('axios', () => ({
  default: {
    delete: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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
}))

function createWorkflow(roomInfoData) {
  return useRoomEditWorkflow({
    currentProject: ref(1),
    realSurveyReportId: ref(10),
    currentFile: ref({ rawId: 100 }),
    roomInfoData,
    roomInfoLoading: ref(false),
    roomInfoTotal: ref(roomInfoData.value.length),
    roomInfoPageNum: ref(1),
    roomInfoPageSize: ref(50),
    batchUpdateLoading: ref(false),
    usageCategoryMap: {},
    usageCategoryReverseMap: {
      住宅: 'RESIDENTIAL',
    },
    auditSummaryData: {},
  })
}

describe('useRoomEditWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks invalid dirty room updates before sending PUT requests', async () => {
    const roomInfoData = ref([
      {
        id: 1,
        roomLevel: '1',
        roomNumber: '101',
        buildingArea: '10.00',
        innerArea: '8.00',
        balconyArea: '1.00',
        sharedArea: '1.00',
        isCalculate: 1,
        usageCategory: '住宅',
        roomUsage: '住宅',
        floorAreaType: '计容',
        remark: '',
      },
    ])
    const workflow = createWorkflow(roomInfoData)

    workflow.prepareRowForEdit(roomInfoData.value[0])
    roomInfoData.value[0].innerArea = '6.00'
    workflow.notifyRowTouched(roomInfoData.value[0])

    const result = await workflow.handleSaveDirtyRows()

    expect(result).toBe(false)
    expect(axios.put).not.toHaveBeenCalled()
    expect(axios.post).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith(expect.stringContaining('保存校验失败'))
  })
})
