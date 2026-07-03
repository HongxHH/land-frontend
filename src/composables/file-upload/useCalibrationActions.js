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

  const isAuditPassResponseOk = (res) => {
    if (!res) return false
    const { data, status } = res
    const httpOk = status >= 200 && status < 300
    if (data == null || data === '') return httpOk
    if (typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'code')) {
      return Number(data.code) === 200
    }
    return httpOk
  }

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
        if (isAuditPassResponseOk(res)) {
          return
        }
        lastError = new Error(res?.data?.msg || res?.data?.message || 'audit_pass_request_failed')
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
      ElMessage.error('审核通过提交失败，请稍后重试')
    }
  }

  return {
    handleAuditPass
  }
}
