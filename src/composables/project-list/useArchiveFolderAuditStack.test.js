import { describe, expect, it, beforeEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useArchiveFolderAuditStack } from '@/composables/project-list/useArchiveFolderAuditStack.js'

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

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/file.service', () => ({
  downloadGridFsFile: vi.fn(),
  queryFiles: vi.fn(),
}))

vi.mock('@/services/project.service', async () => {
  const actual = await vi.importActual('@/services/project.service')
  return {
    ...actual,
    queryPlanningReviewForms: vi.fn(),
    queryCapacityIndicatorForms: vi.fn(),
  }
})

describe('useArchiveFolderAuditStack project context guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('closes an open calibration audit when project changes', async () => {
    const projectId = ref('1')
    const stack = useArchiveFolderAuditStack({
      projectId,
      active: () => true,
      refreshArchiveFiles: vi.fn(),
    })

    stack.showCalibration.value = true
    stack.currentFile.value = { rawId: 20, fileId: 'gridfs-1' }

    projectId.value = '2'
    await nextTick()

    expect(stack.showCalibration.value).toBe(false)
    expect(stack.currentFile.value).toBeNull()
    expect(ElMessage.warning).toHaveBeenCalledWith('项目已切换，已关闭原项目的审核窗口')
  })
})
