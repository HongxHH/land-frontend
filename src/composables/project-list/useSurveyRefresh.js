import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { refreshSurveyReportsByProject } from '@/services/project.service'
import { getApiErrorMessage } from '@/utils/apiErrorMessage'

export function useSurveyRefresh({ currentProjectInfo, fetchSurveyReports }) {
  const REFRESH_CD_SECONDS = 15
  const refreshBtnLoading = ref(false)
  const isRefreshCd = ref(false)
  const cdRemaining = ref(REFRESH_CD_SECONDS)

  let cdTimer = null

  const getRefreshCdStorageKey = (projectId) => {
    const id = projectId || currentProjectInfo.id
    return id ? `refresh_cd_${id}` : null
  }

  const clearRefreshTimer = () => {
    if (cdTimer) {
      clearInterval(cdTimer)
      cdTimer = null
    }
  }

  const resetRefreshCdStatus = () => {
    isRefreshCd.value = false
    cdRemaining.value = REFRESH_CD_SECONDS
    clearRefreshTimer()
    const cdStorageKey = getRefreshCdStorageKey()
    if (cdStorageKey) localStorage.removeItem(cdStorageKey)
  }

  const startRefreshCd = () => {
    const cdStorageKey = getRefreshCdStorageKey()
    if (!cdStorageKey) return

    isRefreshCd.value = true
    cdRemaining.value = REFRESH_CD_SECONDS

    const cdStartAt = Date.now()
    localStorage.setItem(
      cdStorageKey,
      JSON.stringify({
        startAt: cdStartAt,
        remaining: REFRESH_CD_SECONDS
      })
    )

    clearRefreshTimer()

    cdTimer = setInterval(() => {
      cdRemaining.value--

      const storedCd = JSON.parse(localStorage.getItem(cdStorageKey) || '{}')
      if (storedCd.startAt) {
        storedCd.remaining = cdRemaining.value
        localStorage.setItem(cdStorageKey, JSON.stringify(storedCd))
      }

      if (cdRemaining.value <= 0) {
        clearRefreshTimer()
        isRefreshCd.value = false
        localStorage.removeItem(cdStorageKey)
      }
    }, 1000)
  }

  const restoreRefreshCdStatus = (projectId) => {
    const cdStorageKey = getRefreshCdStorageKey(projectId)
    if (!cdStorageKey) return

    const storedCd = localStorage.getItem(cdStorageKey)
    if (!storedCd) return

    const { startAt, remaining } = JSON.parse(storedCd)
    const elapsedSeconds = Math.floor((Date.now() - startAt) / 1000)
    const currentRemaining = remaining - elapsedSeconds

    if (currentRemaining <= 0) {
      localStorage.removeItem(cdStorageKey)
      return
    }

    isRefreshCd.value = true
    cdRemaining.value = currentRemaining

    clearRefreshTimer()
    cdTimer = setInterval(() => {
      cdRemaining.value--

      const updatedStored = JSON.parse(localStorage.getItem(cdStorageKey) || '{}')
      if (updatedStored.startAt) {
        updatedStored.remaining = cdRemaining.value
        localStorage.setItem(cdStorageKey, JSON.stringify(updatedStored))
      }

      if (cdRemaining.value <= 0) {
        clearRefreshTimer()
        isRefreshCd.value = false
        localStorage.removeItem(cdStorageKey)
      }
    }, 1000)
  }

  const handleRefreshSurveyData = async () => {
    if (!currentProjectInfo.id) {
      ElMessage.warning('请先选择项目再进行刷新')
      return
    }

    if (isRefreshCd.value) {
      ElMessage.warning(`请等待 ${cdRemaining.value} 秒后再刷新`)
      return
    }

    startRefreshCd()

    try {
      refreshBtnLoading.value = true
      ElMessage.info('正在刷新项目实测报告数据，请稍候...')

      await refreshSurveyReportsByProject(currentProjectInfo.id)
      if (!(await fetchSurveyReports(currentProjectInfo.id))) {
        return
      }

      ElMessage.success('项目实测报告数据刷新完成，已重新加载汇总表')
    } catch (error) {
      console.error('刷新实测报告数据失败：', error)
      ElMessage.error(getApiErrorMessage(error, '刷新失败，请检查网络或稍后重试'))
    } finally {
      refreshBtnLoading.value = false
    }
  }

  return {
    refreshBtnLoading,
    isRefreshCd,
    cdRemaining,
    handleRefreshSurveyData,
    resetRefreshCdStatus,
    restoreRefreshCdStatus,
    clearRefreshTimer
  }
}
