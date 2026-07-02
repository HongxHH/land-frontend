import { ElMessage, ElMessageBox } from 'element-plus'
import { cancelParseByFileId, parseFileById } from '@/services/file.service'

export function useParseActions({ startPolling }) {
  const startProcessing = (row) => {
    ElMessageBox.confirm(`确认对文件 "${row.name}" 开始智能解析吗？`, '启动解析', {
      confirmButtonText: '立即开始',
      cancelButtonText: '取消',
      type: 'primary'
    })
      .then(() => {
        parseFileById(row.rawId)
          .then((res) => {
            if (res.data.code === 200) {
              ElMessage.success('任务提交成功，系统正在后台解析')
              row.status = 'PENDING'
              startPolling()
            } else {
              ElMessage.error(res.data.msg || '解析请求被拒绝')
            }
          })
          .catch((err) => {
            console.error('启动解析失败:', err)
            ElMessage.error('无法连接到解析服务')
          })
      })
      .catch(() => {})
  }

  const cancelProcessing = (row) => {
    ElMessageBox.confirm(`确认取消文件 "${row.name}" 的解析任务吗？取消后可重新发起解析。`, '取消解析', {
      confirmButtonText: '确认取消',
      cancelButtonText: '再等等',
      type: 'warning'
    })
      .then(async () => {
        try {
          await cancelParseByFileId(row.rawId, 'user_cancel')
          ElMessage.success(`已取消文件 "${row.name}" 的解析任务`)
          row.status = 'WAITING_PARSE'
        } catch (err) {
          console.error('取消解析失败:', err)
          ElMessage.error(err.response?.data?.msg || '取消解析任务失败，请重试')
        }
      })
      .catch(() => {})
  }

  return {
    startProcessing,
    cancelProcessing
  }
}
