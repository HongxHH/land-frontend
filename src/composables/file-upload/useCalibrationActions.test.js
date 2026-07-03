import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useCalibrationActions } from '@/composables/file-upload/useCalibrationActions.js'

vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

describe('useCalibrationActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks the file audited only after a successful audit-pass response', async () => {
    axios.post.mockResolvedValueOnce({ status: 200, data: { code: 200 } })
    const showCalibration = ref(true)
    const currentFile = ref({ rawId: 12, status: 'PARSE_COMPLETE' })
    const resetCalibrationState = vi.fn()
    const refreshData = vi.fn()

    const { handleAuditPass } = useCalibrationActions({
      showCalibration,
      resetCalibrationState,
      refreshData,
      currentFile,
      realSurveyReportId: ref(34)
    })

    await handleAuditPass()

    expect(currentFile.value.status).toBe('AUDIT_PASS')
    expect(showCalibration.value).toBe(false)
    expect(resetCalibrationState).toHaveBeenCalledTimes(1)
    expect(refreshData).toHaveBeenCalledTimes(1)
    expect(ElMessage.success).toHaveBeenCalledWith('审核通过')
  })

  it('keeps the dialog open and status unchanged when audit-pass responses fail', async () => {
    axios.post.mockResolvedValue({ status: 200, data: { code: 500, msg: '审核失败' } })
    const showCalibration = ref(true)
    const currentFile = ref({ rawId: 12, status: 'PARSE_COMPLETE' })
    const resetCalibrationState = vi.fn()
    const refreshData = vi.fn()

    const { handleAuditPass } = useCalibrationActions({
      showCalibration,
      resetCalibrationState,
      refreshData,
      currentFile,
      realSurveyReportId: ref(34)
    })

    await handleAuditPass()

    expect(axios.post).toHaveBeenCalledTimes(4)
    expect(currentFile.value.status).toBe('PARSE_COMPLETE')
    expect(showCalibration.value).toBe(true)
    expect(resetCalibrationState).not.toHaveBeenCalled()
    expect(refreshData).not.toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith('审核通过提交失败，请稍后重试')
  })
})
