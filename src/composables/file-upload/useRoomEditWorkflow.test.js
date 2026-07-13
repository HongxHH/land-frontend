import { describe, expect, it, beforeEach, vi } from 'vitest'
import { reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRoomEditWorkflow } from '@/composables/file-upload/useRoomEditWorkflow.js'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
}))

describe('useRoomEditWorkflow project context guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks room creation when the active project changed after audit opened', async () => {
    const workflow = useRoomEditWorkflow({
      currentProject: ref('2'),
      auditProjectId: ref('1'),
      realSurveyReportId: ref(10),
      currentFile: ref({ rawId: 20 }),
      roomInfoData: ref([]),
      roomInfoLoading: ref(false),
      roomInfoTotal: ref(0),
      roomInfoPageNum: ref(1),
      roomInfoPageSize: ref(50),
      batchUpdateLoading: ref(false),
      usageCategoryMap: {},
      usageCategoryReverseMap: {},
      auditSummaryData: reactive({}),
    })

    const result = await workflow.handleCreateRoom({})

    expect(result).toBe(false)
    expect(axios.post).not.toHaveBeenCalled()
    expect(ElMessage.warning).toHaveBeenCalledWith('项目已切换，当前审核上下文已失效，请重新打开审核')
  })
})
