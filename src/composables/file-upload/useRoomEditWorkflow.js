import { computed, ref } from 'vue'
import axios from 'axios'
import { enrichAuditSummaryFromVerificationReason } from '@/composables/file-upload/auditSummaryMetrics'
import { isBlankRoomUsage } from '@/composables/file-upload/surveyUsagePending'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryRoomInfos } from '@/services/project.service'
import {
  fetchRoomInfoById as fetchRoomInfoByIdRaw,
  searchRoomInfosByPages as searchRoomInfosByPagesRaw
} from '@/composables/file-upload/roomInfoPageSearch.js'

export function useRoomEditWorkflow(options = {}) {
  const {
    currentProject,
    realSurveyReportId,
    currentFile,
    roomInfoData,
    roomInfoLoading,
    roomInfoTotal,
    roomInfoPageNum,
    roomInfoPageSize,
    isEditing,
    editingRowId,
    batchUpdateLoading,
    usageCategoryMap,
    usageCategoryReverseMap,
    auditSummaryData
  } = options

  const localIsEditing = isEditing || ref(false)
  const localEditingRowId = editingRowId || ref('')
  const localBatchUpdateLoading = batchUpdateLoading || ref(false)

  const originalEditingRow = ref(null)
  const roomCreateLoading = ref(false)
  const roomDeleteLoading = ref(false)
  const reportRefreshLoading = ref(false)
  const roomInfoLoadingMore = ref(false)

  const getRoomPageSize = () => Math.max(10, Math.min(200, Number(roomInfoPageSize?.value || 50)))

  const fetchRoomInfoPage = async (pageNum) => {
    const { projectId, surveyReportId } = ensureContext()
    if (!projectId || !surveyReportId) {
      return { records: [], total: 0, ok: false }
    }

    const roomRes = await queryRoomInfos({
      projectId,
      surveyReportInfoId: surveyReportId,
      pageNum,
      pageSize: getRoomPageSize(),
      sortField: 'id',
      sortDirection: 'asc'
    })
    if (roomRes.data?.code !== 200) {
      return { records: [], total: 0, ok: false }
    }
    const body = roomRes.data.data || {}
    const records = Array.isArray(body.records) ? body.records : []
    const total = Number(body.total ?? 0)
    return { records: mapRoomInfoList(records), total, ok: true }
  }

  const syncRoomInfoHasMore = (loadedCount, total) => loadedCount < total

  const normalizeDisplayField = (value) => {
    const text = String(value ?? '').trim()
    return text === '-' ? '' : text
  }

  const buildRoomInfoUpdateDTO = (row) => {
    const preset = resolveUsagePresetByCategory(row.usageCategory)
    const roomUsage = isBlankRoomUsage(row.roomUsage)
      ? preset.roomUsage || ''
      : String(row.roomUsage).trim()

    return {
      id: Number(row.id),
      roomLevel: normalizeDisplayField(row.roomLevel),
      roomNumber: normalizeDisplayField(row.roomNumber),
      buildingArea: Number(row.buildingArea || 0),
      innerArea: Number(row.innerArea || 0),
      balconyArea: Number(row.balconyArea || 0),
      sharedArea: Number(row.sharedArea || 0),
      roomUsage,
      remark: normalizeDisplayField(row.remark),
      isCalculate: Number(row.isCalculate || 0),
      usageCategory: preset.usageCategory,
      floorAreaType: preset.floorAreaType
    }
  }

  const persistRoomRow = async (row, { refreshReport = true, silentRefresh = true } = {}) => {
    const sourceRow = ensureEditableRow(row)
    if (!sourceRow?.id) {
      ElMessage.warning('缺少户室ID，无法保存')
      return false
    }

    try {
      const res = await axios.put('/api/project/room-info/update', buildRoomInfoUpdateDTO(sourceRow))
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '保存失败')
        return false
      }
      return reloadRoomAndSummaryData({
        refreshReport,
        silentRefresh,
        savedRowId: sourceRow.id
      })
    } catch (error) {
      console.error('保存户室数据失败:', error)
      ElMessage.error(error?.response?.data?.msg || '保存失败，请重试')
      return false
    }
  }

  const mapRoomInfoList = (list = []) =>
    list.map((item) => ({
      id: item.id,
      roomLevel: item.roomLevel || '-',
      roomNumber: item.roomNumber || '-',
      buildingArea: Number(item.buildingArea || 0).toFixed(2),
      innerArea: Number(item.innerArea || 0).toFixed(2),
      balconyArea: Number(item.balconyArea || 0).toFixed(2),
      sharedArea: Number(item.sharedArea || 0).toFixed(2),
      isCalculate: Number(item.isCalculate ?? 0),
      usageCategory: usageCategoryMap?.[item.usageCategory] || '未知',
      roomUsage: item.roomUsage || '-',
      floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : item.floorAreaType === 'NON_BUILDABLE' ? '不计容' : '未知',
      remark: item.remark || ''
    }))

  const resolveUsageCategoryForUpdate = (value) => {
    if (!value) return 'UNKNOWN'
    const text = String(value)
    if (
      text === 'RESIDENTIAL' ||
      text === 'COMMERCIAL' ||
      text === 'MANAGEMENT' ||
      text === 'COMMUNITY' ||
      text === 'OTHER_BUILDABLE' ||
      text === 'OTHER_PUBLIC' ||
      text === 'UNKNOWN'
    ) {
      return text
    }
    return usageCategoryReverseMap?.[text] || 'UNKNOWN'
  }

  const resolveUsagePresetByCategory = (category) => {
    const normalized = resolveUsageCategoryForUpdate(category)
    const presetMap = {
      RESIDENTIAL: { roomUsage: '住宅', floorAreaType: 'BUILDABLE' },
      COMMERCIAL: { roomUsage: '商业', floorAreaType: 'BUILDABLE' },
      MANAGEMENT: { roomUsage: '物管', floorAreaType: 'BUILDABLE' },
      OTHER_BUILDABLE: { roomUsage: '其他计容', floorAreaType: 'BUILDABLE' },
      COMMUNITY: { roomUsage: '社区用房', floorAreaType: 'NON_BUILDABLE' },
      OTHER_PUBLIC: { roomUsage: '其他公用', floorAreaType: 'NON_BUILDABLE' },
      UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN' }
    }
    return { usageCategory: normalized, ...(presetMap[normalized] || presetMap.UNKNOWN) }
  }

  const clearEditingState = () => {
    localIsEditing.value = false
    localEditingRowId.value = ''
    originalEditingRow.value = null
  }

  const ensureContext = () => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportId = Number(realSurveyReportId?.value || 0)
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    return {
      projectId,
      surveyReportId,
      fileRecordId,
      ok: Boolean(projectId && surveyReportId && fileRecordId)
    }
  }

  const reloadRoomOnly = async ({ pageNum } = {}) => {
    const { projectId, surveyReportId } = ensureContext()
    if (!projectId || !surveyReportId) return

    roomInfoLoading.value = true
    try {
      let page = Math.max(1, Number(pageNum ?? roomInfoPageNum?.value ?? 1))
      let result = await fetchRoomInfoPage(page)
      if (!result.ok) {
        roomInfoData.value = []
        if (roomInfoTotal) roomInfoTotal.value = 0
        if (roomInfoPageNum) roomInfoPageNum.value = 1
        return
      }

      for (let guard = 0; guard < 8 && result.records.length === 0 && result.total > 0 && page > 1; guard += 1) {
        page -= 1
        result = await fetchRoomInfoPage(page)
        if (!result.ok) break
      }

      if (roomInfoPageNum) roomInfoPageNum.value = page
      if (roomInfoTotal) roomInfoTotal.value = result.total
      applyRoomPageReload(result.records)
    } catch (error) {
      console.error('重新加载户室数据失败:', error)
      throw error
    } finally {
      roomInfoLoading.value = false
    }
  }

  const loadMoreRoomInfo = async () => {
    const { projectId, surveyReportId } = ensureContext()
    if (!projectId || !surveyReportId) return false
    if (roomInfoLoading.value || roomInfoLoadingMore.value) return false

    const total = Number(roomInfoTotal?.value || 0)
    const loaded = roomInfoData.value.length
    if (!syncRoomInfoHasMore(loaded, total)) return false

    const nextPage = Math.max(1, Number(roomInfoPageNum?.value || 1)) + 1
    roomInfoLoadingMore.value = true
    try {
      const result = await fetchRoomInfoPage(nextPage)
      if (!result.ok) return false
      if (roomInfoTotal) roomInfoTotal.value = result.total
      if (result.records.length === 0) return false

      const existingIds = new Set(roomInfoData.value.map((row) => String(row.id)))
      const appendRows = result.records.filter((row) => !existingIds.has(String(row.id)))
      roomInfoData.value = roomInfoData.value.concat(appendRows)
      if (roomInfoPageNum) roomInfoPageNum.value = nextPage
      return syncRoomInfoHasMore(roomInfoData.value.length, result.total)
    } catch (error) {
      console.error('加载更多户室数据失败:', error)
      ElMessage.error('加载更多户室失败，请稍后重试')
      return false
    } finally {
      roomInfoLoadingMore.value = false
    }
  }

  const reloadAllRoomInfoPages = async () => {
    const { projectId, surveyReportId } = ensureContext()
    if (!projectId || !surveyReportId) return

    roomInfoLoading.value = true
    try {
      const pageSize = getRoomPageSize()
      let pageNum = 1
      let allRecords = []
      let total = 0

      while (pageNum <= 50) {
        const result = await fetchRoomInfoPage(pageNum)
        if (!result.ok) break
        total = result.total
        allRecords = allRecords.concat(result.records)
        if (allRecords.length >= total || result.records.length === 0) break
        pageNum += 1
      }

      if (roomInfoTotal) roomInfoTotal.value = total
      if (roomInfoPageNum) {
        roomInfoPageNum.value = total === 0 ? 1 : Math.max(1, Math.ceil(total / pageSize))
      }
      roomInfoData.value = allRecords
    } catch (error) {
      console.error('加载全部户室数据失败:', error)
      throw error
    } finally {
      roomInfoLoading.value = false
    }
  }

  const goRoomInfoPage = async (nextPage) => {
    if (!roomInfoPageNum) return
    roomInfoPageNum.value = Math.max(1, Number(nextPage || 1))
    await reloadRoomOnly()
  }

  const goRoomInfoPageSizeChange = async (nextSize) => {
    if (!roomInfoPageSize || !roomInfoPageNum) return
    roomInfoPageSize.value = Math.max(10, Math.min(200, Number(nextSize || 50)))
    roomInfoPageNum.value = 1
    await reloadRoomOnly()
  }

  const roomInfoHasMore = computed(() =>
    syncRoomInfoHasMore(roomInfoData.value.length, Number(roomInfoTotal?.value || 0))
  )

  const fetchAllRoomInfoRows = async () => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportInfoId = Number(realSurveyReportId?.value || 0)
    if (!projectId || !surveyReportInfoId) return []

    const pageSize = 200
    let pageNum = 1
    let allRecords = []
    let total = 0

    while (pageNum <= 50) {
      const roomRes = await queryRoomInfos({
        projectId,
        surveyReportInfoId,
        pageNum,
        pageSize,
        sortField: 'id',
        sortDirection: 'asc'
      })
      if (roomRes.data?.code !== 200) break

      const body = roomRes.data.data || {}
      const records = Array.isArray(body.records) ? body.records : []
      total = Number(body.total ?? 0)
      allRecords = allRecords.concat(records)

      if (allRecords.length >= total || records.length === 0) break
      pageNum += 1
    }

    return mapRoomInfoList(allRecords)
  }

  /** 新增户室后加载全部户室，便于滚动定位到底部 */
  const goLastRoomInfoPageAfterMutation = async () => {
    await reloadAllRoomInfoPages()
  }

  const reloadSummaryOnly = async () => {
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    if (!fileRecordId) return

    try {
      const summaryRes = await axios.post('/api/project/survey-reports/query', {
        fileRecordId
      })
      const currentSummary = summaryRes?.data?.data?.records?.[0]
      if (!currentSummary || !auditSummaryData) return

      auditSummaryData.pendingConfirmArea = Number(currentSummary.pendingConfirmArea || 0).toFixed(2)
      auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]'
      auditSummaryData.unknownUsageCount = Number(currentSummary.unknownUsageCount || 0)
      auditSummaryData.isVerified = Number(currentSummary.isVerified || 0)
      auditSummaryData.hasUnknownUsage = Number(currentSummary.hasUnknownUsage || 0)
      auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-'
      auditSummaryData.roomInfoBuildingAreaSum = Number(currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSum = Number(currentSummary.roomInfoInnerAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSum = Number(currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSum = Number(currentSummary.roomInfoSharedAreaSum || 0).toFixed(2)
      auditSummaryData.roomInfoBuildingAreaSumFromOcr = Number(currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSumFromOcr = Number(currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSumFromOcr = Number(currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSumFromOcr = Number(currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2)
      enrichAuditSummaryFromVerificationReason(auditSummaryData)
    } catch (error) {
      console.error('重新加载汇总数据失败:', error)
      throw error
    }
  }

  const triggerSurveyReportRefresh = async ({ silent = false } = {}) => {
    const surveyReportId = Number(realSurveyReportId?.value || 0)
    if (!surveyReportId) {
      if (!silent) ElMessage.warning('缺少实测报告ID，无法刷新')
      return false
    }

    reportRefreshLoading.value = true
    try {
      const res = await axios.post(`/api/project/survey-report/${surveyReportId}/refresh`)
      if (res.data?.code !== 200) {
        if (!silent) ElMessage.warning(res.data?.msg || '刷新失败')
        return false
      }
      if (!silent) ElMessage.success(res.data?.msg || '刷新成功')
      return true
    } catch (error) {
      console.error('刷新实测报告失败:', error)
      if (!silent) ElMessage.error(error?.response?.data?.msg || '刷新实测报告失败')
      return false
    } finally {
      reportRefreshLoading.value = false
    }
  }

  const reloadRoomAndSummaryData = async ({ refreshReport = false, silentRefresh = true, savedRowId } = {}) => {
    if (refreshReport) {
      const refreshOk = await triggerSurveyReportRefresh({ silent: silentRefresh })
      if (!refreshOk) return false
    }

    try {
      await Promise.all([reloadSummaryOnly(), reloadRoomOnly()])
      await reconcileAfterRoomReload({ savedRowId })
      return true
    } catch {
      ElMessage.error('刷新页面数据失败，请重试')
      return false
    }
  }

  const isRowModified = (currentRow, originalRow) => {
    if (!currentRow || !originalRow) return false
    return (
      currentRow.roomLevel !== originalRow.roomLevel ||
      currentRow.roomNumber !== originalRow.roomNumber ||
      currentRow.buildingArea !== originalRow.buildingArea ||
      currentRow.innerArea !== originalRow.innerArea ||
      currentRow.balconyArea !== originalRow.balconyArea ||
      currentRow.sharedArea !== originalRow.sharedArea ||
      currentRow.isCalculate !== originalRow.isCalculate ||
      currentRow.usageCategory !== originalRow.usageCategory ||
      currentRow.roomUsage !== originalRow.roomUsage ||
      currentRow.floorAreaType !== originalRow.floorAreaType ||
      currentRow.remark !== originalRow.remark
    )
  }

  const findRoomRowById = (rowId) => {
    if (rowId == null || rowId === '') return null
    const id = String(rowId)
    return roomInfoData.value.find((item) => String(item.id) === id) ?? null
  }

  const copyRoomRowFields = (from, to) => {
    if (!from || !to) return to
    to.roomLevel = from.roomLevel
    to.roomNumber = from.roomNumber
    to.buildingArea = from.buildingArea
    to.innerArea = from.innerArea
    to.balconyArea = from.balconyArea
    to.sharedArea = from.sharedArea
    to.isCalculate = from.isCalculate
    to.usageCategory = from.usageCategory
    to.roomUsage = from.roomUsage
    to.floorAreaType = from.floorAreaType
    to.remark = from.remark
    return to
  }

  const ensureEditableRow = (row) => {
    const rowId = String(row.id)
    let idx = roomInfoData.value.findIndex((item) => String(item.id) === rowId)
    if (idx < 0) {
      roomInfoData.value.push({ ...row })
      idx = roomInfoData.value.length - 1
    } else {
      copyRoomRowFields(row, roomInfoData.value[idx])
    }
    return roomInfoData.value[idx]
  }

  /** 分页刷新后保留仍在编辑、但不在当前页的数据行 */
  const applyRoomPageReload = (records) => {
    const pageIds = new Set((records || []).map((row) => String(row.id)))
    const preserveId = String(localEditingRowId.value || '')
    const preserved = preserveId
      ? roomInfoData.value.filter((row) => String(row.id) === preserveId && !pageIds.has(String(row.id)))
      : []
    roomInfoData.value = [...(records || []), ...preserved]
  }

  const fetchRoomInfoById = async (roomInfoId) => {
    const fresh = await fetchRoomInfoByIdRaw({
      roomInfoId,
      queryRoomInfos,
      mapRoomInfoList
    })
    if (!fresh) return null
    return ensureEditableRow(fresh)
  }

  const searchRoomInfosByPages = async (keyword, { signal, onProgress } = {}) => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportInfoId = Number(realSurveyReportId?.value || 0)
    if (!projectId || !surveyReportInfoId) return []

    return searchRoomInfosByPagesRaw({
      projectId,
      surveyReportInfoId,
      keyword,
      signal,
      onProgress,
      queryRoomInfos,
      mapRoomInfoList
    })
  }

  const refreshRowFromServer = async (rowId) => fetchRoomInfoById(rowId)

  const reconcileAfterRoomReload = async ({ savedRowId } = {}) => {
    const savedId = savedRowId != null ? String(savedRowId) : ''
    const editingId = String(localEditingRowId.value || '')

    if (savedId) {
      await refreshRowFromServer(savedId)
    }

    if (editingId && editingId !== savedId) {
      const stillLoaded = findRoomRowById(editingId)
      if (!stillLoaded) {
        const refreshed = await refreshRowFromServer(editingId)
        if (!refreshed) {
          clearEditingState()
        }
      }
    }

    if (savedId && editingId === savedId) {
      clearEditingState()
      return
    }

    if (editingId) {
      const current = findRoomRowById(editingId)
      if (!current) {
        clearEditingState()
      } else {
        originalEditingRow.value = JSON.parse(JSON.stringify(current))
      }
    }
  }

  const enterEditMode = (row) => {
    if (!row?.id) {
      ElMessage.warning('缺少户室ID，无法编辑')
      return
    }

    const target = ensureEditableRow(row)
    originalEditingRow.value = JSON.parse(JSON.stringify(target))
    localEditingRowId.value = String(target.id)
    localIsEditing.value = true
  }

  const exitEditMode = () => {
    if (!localIsEditing.value || !localEditingRowId.value) {
      clearEditingState()
      return
    }

    const row = findRoomRowById(localEditingRowId.value)
    if (row && originalEditingRow.value) {
      copyRoomRowFields(originalEditingRow.value, row)
    }
    clearEditingState()
  }

  const handleSaveData = async () => {
    if (!localIsEditing.value || !localEditingRowId.value) {
      ElMessage.warning('请先选择一行进入编辑')
      return
    }

    let targetRow = findRoomRowById(localEditingRowId.value)
    if (!targetRow?.id) {
      targetRow = await refreshRowFromServer(localEditingRowId.value)
    }
    if (!targetRow?.id) {
      clearEditingState()
      ElMessage.warning('未找到当前编辑行，已退出编辑')
      return
    }

    if (!isRowModified(targetRow, originalEditingRow.value)) {
      ElMessage.info('当前行无修改')
      clearEditingState()
      return
    }

    try {
      await ElMessageBox.confirm('确认保存当前户室修改吗？', '提示', {
        confirmButtonText: '确认保存',
        cancelButtonText: '取消',
        type: 'primary'
      })
    } catch {
      return
    }

    localBatchUpdateLoading.value = true
    try {
      const ok = await persistRoomRow(targetRow, { refreshReport: true, silentRefresh: true })
      if (!ok) return

      clearEditingState()
      ElMessage.success('保存成功，已刷新实测报告')
    } finally {
      localBatchUpdateLoading.value = false
    }
  }

  const handleCreateRoom = async (payload = {}) => {
    const { projectId, surveyReportId, fileRecordId, ok } = ensureContext()
    if (!ok) {
      ElMessage.warning('缺少项目/文件/报告信息，无法新增户室')
      return false
    }

    roomCreateLoading.value = true
    try {
      const preset = resolveUsagePresetByCategory(payload.usageCategory)
      const body = {
        projectId,
        fileRecordId,
        surveyReportInfoId: surveyReportId,
        usageCategory: preset.usageCategory,
        roomLevel: payload.roomLevel || '',
        roomNumber: payload.roomNumber || '',
        buildingArea: Number(payload.buildingArea || 0),
        innerArea: Number(payload.innerArea || 0),
        balconyArea: Number(payload.balconyArea || 0),
        sharedArea: Number(payload.sharedArea || 0),
        roomUsage: preset.roomUsage,
        remark: payload.remark || '',
        floorAreaType: preset.floorAreaType
      }

      const res = await axios.post('/api/project/room-info/create', body)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '新增户室失败')
        return false
      }

      clearEditingState()
      await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: true })
      await goLastRoomInfoPageAfterMutation()
      ElMessage.success('新增户室成功，已刷新实测报告')
      return true
    } catch (error) {
      console.error('新增户室失败:', error)
      ElMessage.error(error?.response?.data?.msg || '新增户室失败')
      return false
    } finally {
      roomCreateLoading.value = false
    }
  }

  const handleDeleteRoom = async (row) => {
    const roomId = Number(row?.id || 0)
    if (!roomId) {
      ElMessage.warning('缺少户室ID，无法删除')
      return false
    }

    try {
      await ElMessageBox.confirm('确定删除该户室吗？删除后不可恢复。', '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return false
    }

    roomDeleteLoading.value = true
    try {
      const res = await axios.delete(`/api/project/room-info/${roomId}`)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '删除户室失败')
        return false
      }

      clearEditingState()
      await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: true })
      ElMessage.success('删除户室成功，已刷新实测报告')
      return true
    } catch (error) {
      console.error('删除户室失败:', error)
      ElMessage.error(error?.response?.data?.msg || '删除户室失败')
      return false
    } finally {
      roomDeleteLoading.value = false
    }
  }

  const handleRefreshSurveyReport = async () => {
    const ok = await reloadRoomAndSummaryData({ refreshReport: true, silentRefresh: false })
    if (ok) {
      ElMessage.success('数据已刷新')
    }
    return ok
  }

  const syncRoomRow = (row) => ensureEditableRow(row)

  return {
    enterEditMode,
    exitEditMode,
    handleSaveData,
    syncRoomRow,
    clearEditingState,
    handleRefreshSurveyReport,
    handleCreateRoom,
    handleDeleteRoom,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading,
    roomInfoLoadingMore,
    loadMoreRoomInfo,
    roomInfoHasMore,
    goRoomInfoPage,
    goRoomInfoPageSizeChange,
    fetchAllRoomInfoRows,
    searchRoomInfosByPages,
    fetchRoomInfoById
  }
}
