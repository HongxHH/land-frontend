import { saveUnknownUsageRules } from '@/composables/shared/useUnknownUsageSave'

export function useUnknownUsagePolicy({
  unknownUsages,
  isSavingPolicy,
  currentProjectInfo,
  fetchSurveyReports
}) {
  const savePolicy = async () => {
    isSavingPolicy.value = true
    try {
      const ok = await saveUnknownUsageRules(unknownUsages.value, {
        projectId: currentProjectInfo.id,
        onAfterSave: async () => {
          await fetchSurveyReports(currentProjectInfo.id)
        }
      })
      return ok
    } finally {
      isSavingPolicy.value = false
    }
  }

  return {
    savePolicy
  }
}
