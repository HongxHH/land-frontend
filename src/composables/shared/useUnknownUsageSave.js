import axios from 'axios'
import { ElMessage } from 'element-plus'
import { TARGET_CATEGORY_MAP } from '@/constants/usageCategory.js'
import { refreshSurveyReportsByProject } from '@/services/project.service'

export async function saveUnknownUsageRule(row, { projectId, onAfterSave } = {}) {
  if (!row?.id) {
    ElMessage.warning('该未知用途尚未入库，请刷新页面后重试')
    return false
  }
  if (!row?.selectedTarget) {
    ElMessage.warning('请先选择归属分类')
    return false
  }
  const mapping = TARGET_CATEGORY_MAP[row.selectedTarget]
  if (!mapping) {
    ElMessage.error('归属分类无效')
    return false
  }
  try {
    const res = await axios.post('/api/usage-config/create-from-unknown', null, {
      params: {
        unknownUsageId: row.id,
        usageCategory: mapping.usageCategory,
        floorAreaType: mapping.floorAreaType,
        isRegex: 0,
        priority: 1000
      }
    })
    if (res.data?.code !== 200) {
      ElMessage.error(res.data?.msg || '保存失败')
      return false
    }
    const pid = String(projectId || '').trim()
    if (pid) {
      await refreshSurveyReportsByProject(pid)
    }
    await onAfterSave?.()
    ElMessage.success(`已纳入已知用途：${row.usageName || ''}`)
    return true
  } catch (error) {
    console.error(error)
    ElMessage.error(error?.response?.data?.msg || '保存失败')
    return false
  }
}

export async function saveUnknownUsageRules(rows, options = {}) {
  const pendingWithoutId = (rows || []).filter((row) => row?.selectedTarget && !row?.id)
  if (pendingWithoutId.length) {
    ElMessage.warning('部分未知用途尚未入库，请刷新页面后重试')
    return false
  }
  const validRules = (rows || []).filter((row) => row?.selectedTarget && row?.id)
  if (!validRules.length) {
    ElMessage.warning('请至少指定一项归属规则')
    return false
  }
  try {
    await Promise.all(
      validRules.map((row) => {
        const mapping = TARGET_CATEGORY_MAP[row.selectedTarget]
        return axios.post('/api/usage-config/create-from-unknown', null, {
          params: {
            unknownUsageId: row.id,
            usageCategory: mapping.usageCategory,
            floorAreaType: mapping.floorAreaType,
            isRegex: 0,
            priority: 1000
          }
        })
      })
    )
    ElMessage.success(`成功保存 ${validRules.length} 条规则，正在刷新数据...`)
    const pid = String(options.projectId || '').trim()
    if (pid) {
      await refreshSurveyReportsByProject(pid)
    }
    await options.onAfterSave?.()
    return true
  } catch (error) {
    console.error(error)
    ElMessage.error('保存规则失败')
    return false
  }
}
