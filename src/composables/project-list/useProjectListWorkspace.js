import { onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { isProjectWorkspaceTab, resolveProjectWorkspaceTab } from '@/utils/fileContextTypeRegistry.js'

const PROJECT_FILTER_DISPLAY_META = 'projectFilterDisplayMeta'
const AUDIT_STACK_WAIT_MS = 8000
const AUDIT_STACK_POLL_MS = 32

/**
 * 项目信息页：路由同步、工作区 bootstrap、深链打开审核、filter 持久化。
 */
export function useProjectListWorkspace({
  route,
  router,
  activeTab,
  filterProject,
  currentProjectInfo,
  projectOptions,
  fetchProjectList,
  ensureProjectOption,
  applyProjectMeta,
  fetchSurveyReports,
  fetchContractListByProjectId,
  resetSummaryMetrics,
  restoreRefreshCdStatus,
  clearRefreshTimer,
  resetRefreshCdStatus,
  showCreateProjectDialog,
  workspaceAuditStackRef,
  workspaceQueryLoading,
}) {
  const initialArchiveId = ref(
    String(route.query.fromAuditReturn || '') === '1' ? String(route.query.archiveId || '') : ''
  )
  const initialReturnTab = ref(
    String(route.query.fromAuditReturn || '') === '1' ? String(route.query.tab || 'archives') : ''
  )

  const pageRouteActive = ref(true)
  const projectOptionsLoaded = ref(false)
  const projectOptionsLoading = ref(false)
  const projectWorkspaceBootstrapping = ref(false)
  let projectOptionsLoadingPromise = null
  let deepLinkAuditOpening = false
  let auditReturnNavigating = false
  let syncingWorkspaceRoute = false

  const buildWorkspaceRouteQuery = (projectId, tab) => {
    const nextQuery = { ...route.query }
    const pid = String(projectId || '').trim()
    if (pid) nextQuery.projectId = pid
    else delete nextQuery.projectId

    const tabName = String(tab || 'archives').trim()
    if (tabName && tabName !== 'archives') nextQuery.tab = tabName
    else delete nextQuery.tab

    return nextQuery
  }

  const isSameWorkspaceRouteQuery = (nextQuery) => {
    const sameProject =
      String(route.query.projectId || '') === String(nextQuery.projectId || '')
    const sameTab =
      String(route.query.tab || 'archives') === String(nextQuery.tab || 'archives')
    return sameProject && sameTab
  }

  const syncWorkspaceToRoute = () => {
    if (!pageRouteActive.value || projectWorkspaceBootstrapping.value || auditReturnNavigating) {
      return
    }
    const nextQuery = buildWorkspaceRouteQuery(filterProject.value, activeTab.value)
    if (isSameWorkspaceRouteQuery(nextQuery)) return

    syncingWorkspaceRoute = true
    router.replace({ query: nextQuery }).finally(() => {
      syncingWorkspaceRoute = false
    })
  }

  const handleAuditReturnNavigation = () => {
    const returnTo = String(route.query.returnTo || '').trim()
    if (!returnTo || auditReturnNavigating) return

    const returnRouteMap = {
      fields: { name: 'FieldManagement' },
    }
    const target = returnRouteMap[returnTo]
    if (!target) return

    auditReturnNavigating = true
    router.replace(target).finally(() => {
      auditReturnNavigating = false
    })
  }

  const ensureProjectOptionsLoaded = async () => {
    if (projectOptionsLoaded.value) return true
    if (projectOptionsLoadingPromise) return projectOptionsLoadingPromise
    projectOptionsLoading.value = true
    projectOptionsLoadingPromise = fetchProjectList()
      .then(() => {
        projectOptionsLoaded.value = true
        return true
      })
      .finally(() => {
        projectOptionsLoading.value = false
        projectOptionsLoadingPromise = null
      })
    return projectOptionsLoadingPromise
  }

  function persistProjectFilterDisplayMeta() {
    try {
      const id = String(currentProjectInfo.id || '')
      if (!id) return
      localStorage.setItem(
        PROJECT_FILTER_DISPLAY_META,
        JSON.stringify({
          id,
          name: currentProjectInfo.name || '',
          code: currentProjectInfo.code || '',
        })
      )
    } catch {
      /* ignore */
    }
  }

  function readProjectFilterDisplayMeta() {
    try {
      const raw = localStorage.getItem(PROJECT_FILTER_DISPLAY_META)
      if (!raw) return null
      const o = JSON.parse(raw)
      if (!o || typeof o !== 'object') return null
      return {
        id: String(o.id || ''),
        name: String(o.name || ''),
        code: String(o.code || ''),
      }
    } catch {
      return null
    }
  }

  function applyCachedProjectWorkspaceMeta(projectId) {
    const idStr = String(projectId || '')
    if (!idStr) return false
    const cached = readProjectFilterDisplayMeta()
    if (!cached || cached.id !== idStr) return false
    filterProject.value = idStr
    currentProjectInfo.id = idStr
    currentProjectInfo.name = cached.name || '…'
    currentProjectInfo.code = cached.code || `XM-${idStr.padStart(3, '0')}`
    currentProjectInfo.status = '已归档'
    return true
  }

  const loadActiveTabData = async (projectId) => {
    const pid = String(projectId || '')
    if (!pid) return
    if (activeTab.value !== 'contractLandEdit' && activeTab.value !== 'summary') return

    workspaceQueryLoading.value = true
    try {
      if (activeTab.value === 'contractLandEdit') {
        await fetchContractListByProjectId(pid)
        return
      }
      if (activeTab.value === 'summary') {
        await fetchSurveyReports(pid)
      }
    } finally {
      workspaceQueryLoading.value = false
    }
  }

  const handleGlobalSearch = async () => {
    const projectId = String(filterProject.value || '')
    if (!projectId) {
      ElMessage.warning('请先选择项目')
      return
    }
    await ensureProjectOptionsLoaded()
    await ensureProjectOption(projectId)
    const found = applyProjectMeta(projectId)
    if (!found) {
      ElMessage.warning('当前项目不存在或列表尚未同步，请稍后重试')
      return
    }
    persistProjectFilterDisplayMeta()
    await loadActiveTabData(projectId)
    if (activeTab.value === 'summary') {
      restoreRefreshCdStatus(projectId)
    } else {
      clearRefreshTimer()
      resetRefreshCdStatus()
    }
  }

  async function waitForWorkspaceAuditStack() {
    const deadline = Date.now() + AUDIT_STACK_WAIT_MS
    while (Date.now() < deadline) {
      if (
        currentProjectInfo.id &&
        typeof workspaceAuditStackRef.value?.openAuditByFileRecordId === 'function'
      ) {
        return workspaceAuditStackRef.value
      }
      await new Promise((resolve) => setTimeout(resolve, AUDIT_STACK_POLL_MS))
    }
    if (
      currentProjectInfo.id &&
      typeof workspaceAuditStackRef.value?.openAuditByFileRecordId === 'function'
    ) {
      return workspaceAuditStackRef.value
    }
    return null
  }

  const handleOpenAuditByFileRecordId = async (payload) => {
    const fileRecordId =
      typeof payload === 'object' && payload != null ? payload.fileRecordId : payload
    const focusUsageName = typeof payload === 'object' && payload != null ? payload.usageName : ''
    const focusMode = typeof payload === 'object' && payload != null ? payload.focusMode : ''
    const fid = String(fileRecordId || '').trim()
    if (!fid) {
      ElMessage.warning('缺少文件信息，无法打开审核')
      return false
    }
    const stack = await waitForWorkspaceAuditStack()
    if (!stack) {
      ElMessage.warning('审核组件尚未就绪，请稍后再试')
      return false
    }
    await stack.openAuditByFileRecordId(fid, {
      force: true,
      skipArchiveNavigation: true,
      focusUsageName: String(focusUsageName || '').trim(),
      focusMode: String(focusMode || '').trim(),
    })
    return true
  }

  const tryConsumeDeepLinkOpenAudit = async () => {
    const fid = String(route.query.openAuditFileId || '').trim()
    const expectPid = String(route.query.projectId || '').trim()
    if (!fid || !expectPid) return
    if (String(filterProject.value) !== expectPid) return
    if (!currentProjectInfo.id || String(currentProjectInfo.id) !== expectPid) return
    if (deepLinkAuditOpening) return
    deepLinkAuditOpening = true
    try {
      const ok = await handleOpenAuditByFileRecordId(fid)
      if (ok) {
        const q = { ...route.query }
        delete q.openAuditFileId
        await router.replace({ query: q })
      }
    } finally {
      deepLinkAuditOpening = false
    }
  }

  const handlePendingAuditConsumed = () => {
    const q = { ...route.query }
    if (q.openAuditFileId) {
      delete q.openAuditFileId
      router.replace({ query: q })
    }
  }

  watch(filterProject, (newVal, oldVal) => {
    if (newVal) {
      localStorage.setItem('projectFilterStatus', newVal)
      if (oldVal) {
        localStorage.removeItem(`refresh_cd_${oldVal}`)
      }
    } else if (!currentProjectInfo.id) {
      localStorage.removeItem('projectFilterStatus')
      localStorage.removeItem(PROJECT_FILTER_DISPLAY_META)
      resetSummaryMetrics()
      Object.assign(currentProjectInfo, {
        id: '',
        name: '请选择项目',
        code: '-',
        status: '-',
      })
      resetRefreshCdStatus()
    }
    if (!projectWorkspaceBootstrapping.value) {
      syncWorkspaceToRoute()
    }
  })

  watch(
    () => route.query.tab,
    async () => {
      const fromAuditReturn = String(route.query.fromAuditReturn || '') === '1'
      if (!fromAuditReturn) return

      const tabName = resolveProjectWorkspaceTab(String(route.query.tab || ''))
      if (isProjectWorkspaceTab(tabName)) {
        activeTab.value = tabName
        initialReturnTab.value = tabName
      }
      if (route.query.archiveId) {
        initialArchiveId.value = String(route.query.archiveId)
      }

      const cleanQuery = { ...route.query }
      delete cleanQuery.fromAuditReturn
      delete cleanQuery.tab
      await router.replace({ query: cleanQuery })
    },
    { immediate: true }
  )

  watch(
    () => route.query.projectId,
    async (projectId) => {
      if (syncingWorkspaceRoute) return
      const pid = String(projectId || '')
      if (!pid) return
      if (filterProject.value !== pid) {
        filterProject.value = pid
      }
      await handleGlobalSearch()
    }
  )

  watch(
    () => route.query.tab,
    (tab) => {
      if (syncingWorkspaceRoute) return
      if (String(route.query.fromAuditReturn || '') === '1') return
      const tabName = resolveProjectWorkspaceTab(String(tab || ''))
      if (!tab || !isProjectWorkspaceTab(tabName)) return
      if (activeTab.value !== tabName) {
        activeTab.value = tabName
      }
    }
  )

  watch(
    () => route.query.openCreate,
    async (openCreate) => {
      if (String(openCreate || '') !== '1') return
      showCreateProjectDialog.value = true
      const q = { ...route.query }
      delete q.openCreate
      await router.replace({ query: q })
    },
    { immediate: true }
  )

  watch(activeTab, async (tab) => {
    syncWorkspaceToRoute()
    if (!currentProjectInfo.id) return
    if (tab === 'contractLandEdit' || tab === 'summary') {
      await loadActiveTabData(currentProjectInfo.id)
    }
    if (tab === 'summary') {
      restoreRefreshCdStatus(currentProjectInfo.id)
    } else {
      clearRefreshTimer()
      resetRefreshCdStatus()
    }
  })

  watch(
    () => ({
      openFid: route.query.openAuditFileId,
      qPid: route.query.projectId,
      filterPid: filterProject.value,
      cid: currentProjectInfo.id,
      stackReady: Boolean(workspaceAuditStackRef.value?.openAuditByFileRecordId),
    }),
    () => {
      void tryConsumeDeepLinkOpenAudit()
    },
    { flush: 'post', immediate: true }
  )

  onActivated(() => {
    pageRouteActive.value = true
    void tryConsumeDeepLinkOpenAudit()
  })

  onDeactivated(() => {
    pageRouteActive.value = false
    clearRefreshTimer()
  })

  onUnmounted(() => {
    clearRefreshTimer()
  })

  onMounted(async () => {
    if (initialReturnTab.value && isProjectWorkspaceTab(initialReturnTab.value)) {
      activeTab.value = resolveProjectWorkspaceTab(initialReturnTab.value)
      initialReturnTab.value = ''
    } else if (String(route.query.tab || '').trim()) {
      activeTab.value = resolveProjectWorkspaceTab(String(route.query.tab))
    } else {
      activeTab.value = 'archives'
    }

    const queryProjectId = route.query.projectId
    const savedProjectId = localStorage.getItem('projectFilterStatus')
    let targetProjectId = ''

    projectWorkspaceBootstrapping.value = true
    try {
      if (queryProjectId) {
        targetProjectId = String(queryProjectId)
        if (!applyCachedProjectWorkspaceMeta(targetProjectId)) {
          filterProject.value = targetProjectId
        }
      } else if (savedProjectId) {
        applyCachedProjectWorkspaceMeta(savedProjectId)
      }

      await ensureProjectOptionsLoaded()

      if (queryProjectId) {
        targetProjectId = String(queryProjectId)
        filterProject.value = targetProjectId
        await handleGlobalSearch()
      } else if (savedProjectId) {
        const exists = projectOptions.value.some((p) => String(p.id) === String(savedProjectId))
        if (exists) {
          targetProjectId = String(savedProjectId)
          filterProject.value = targetProjectId
          await handleGlobalSearch()
        } else {
          localStorage.removeItem('projectFilterStatus')
          localStorage.removeItem(PROJECT_FILTER_DISPLAY_META)
          Object.assign(currentProjectInfo, {
            id: '',
            name: '请选择项目',
            code: '-',
            status: '-',
          })
          filterProject.value = ''
        }
      }

      if (targetProjectId && activeTab.value === 'summary') {
        restoreRefreshCdStatus(targetProjectId)
      }
    } finally {
      projectWorkspaceBootstrapping.value = false
      syncWorkspaceToRoute()
    }
  })

  return {
    initialArchiveId,
    pageRouteActive,
    projectOptionsLoading,
    projectWorkspaceBootstrapping,
    ensureProjectOptionsLoaded,
    handleGlobalSearch,
    loadActiveTabData,
    handleOpenAuditByFileRecordId,
    handlePendingAuditConsumed,
    handleAuditReturnNavigation,
  }
}
