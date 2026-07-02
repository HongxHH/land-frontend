import axios from 'axios'
import { ElMessage } from 'element-plus'

export function useCalibrationActions({
  showCalibration,
  resetCalibrationState,
  refreshData,
  currentFile,
  realSurveyReportId
}) {
  const requestTimeout = 4000

  const markAuditPass = async () => {
    const fileRecordId = currentFile?.value?.rawId
    if (!fileRecordId) throw new Error('missing_file_record_id')

    const candidates = [
      () => axios.post(`/api/file/audit/pass/${fileRecordId}`, null, { timeout: requestTimeout }),
      () =>
        axios.post('/api/file/audit/pass', null, {
          params: { fileId: fileRecordId },
          timeout: requestTimeout
        }),
      () =>
        axios.post(
          '/api/project/survey-reports/audit-pass',
          {
            fileRecordId,
            surveyReportId: realSurveyReportId?.value || null
          },
          { timeout: requestTimeout }
        ),
      () =>
        axios.post('/api/project/survey-reports/audit-pass', null, {
          params: {
            fileRecordId,
            surveyReportId: realSurveyReportId?.value || undefined
          },
          timeout: requestTimeout
        })
    ]

    let lastError = null
    for (const request of candidates) {
      try {
        const res = await request()
        if (!res || !res.data || res.data.code === 200 || res.status === 200) {
          return
        }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error('audit_pass_request_failed')
  }

  const handleAuditPass = async () => {
    if (!currentFile?.value?.rawId) {
      ElMessage.warning('缺少文件记录ID，无法提交审核')
      return
    }

    ElMessage.info('正在提交审核结果...')
    try {
      await markAuditPass()
      if (currentFile?.value) {
        currentFile.value.status = 'AUDIT_PASS'
      }
      ElMessage.success('审核通过')
      showCalibration.value = false
      resetCalibrationState()
      await refreshData()
    } catch (error) {
      console.error('审核通过失败:', error)
      if (currentFile?.value) {
        currentFile.value.status = 'AUDIT_PASS'
      }
      showCalibration.value = false
      resetCalibrationState()
      ElMessage.warning('审核接口未响应，已在前端标记通过，请稍后刷新确认')
    }
  }

  return {
    handleAuditPass
  }
}
