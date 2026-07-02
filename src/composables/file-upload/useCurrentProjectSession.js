import { onMounted, onUnmounted, watch } from 'vue'

export function useCurrentProjectSession({
  currentProject,
  fetchProjectList,
  refreshData,
  resetFilter,
  fileTableData,
  stopPolling,
  calibrationPdfUrl,
  clearUploadSelection
}) {
  onMounted(async () => {
    await fetchProjectList()
    const savedProjectId = localStorage.getItem('savedCurrentProject')
    if (savedProjectId) {
      currentProject.value = savedProjectId
      refreshData()
    }
  })

  watch(currentProject, (newProjectId) => {
    if (newProjectId) {
      localStorage.setItem('savedCurrentProject', newProjectId)
      resetFilter()
    } else {
      localStorage.removeItem('savedCurrentProject')
      fileTableData.value = []
    }
  })

  onUnmounted(() => {
    stopPolling()
    if (calibrationPdfUrl.value) {
      URL.revokeObjectURL(calibrationPdfUrl.value)
    }
    clearUploadSelection()
  })
}
