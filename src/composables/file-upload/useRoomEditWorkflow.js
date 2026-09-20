import { computed, ref } from 'vue'
import axios from 'axios'
import {
  enrichAuditSummaryFromVerificationReason,
  isAuditSummaryFieldDerivedFromVerificationReason,
  OCR_SUM_FIELD_KEYS,
} from '@/composables/file-upload/auditSummaryMetrics'
import { isBlankRoomUsage } from '@/composables/file-upload/surveyUsagePending'
import { ElMessage, ElMessageBox } from 'element-plus'
import { queryRoomInfos, updateSurveyReportInfo } from '@/services/project.service'
import {
  fetchRoomInfoById as fetchRoomInfoByIdRaw,
  searchMissingUsageByPages as searchMissingUsageByPagesRaw,
  searchRoomInfosByPages as searchRoomInfosByPagesRaw,
} from '@/composables/file-upload/roomInfoPageSearch.js'
import {
  normalizeRoomField,
  validateRoomForCreate,
  validateRoomForUpdate,
  validateChangedRoomAreaFields,
  getChangedRoomAreaFields,
  getRoomAreaNumericError,
  getRoomAreaFieldError,
  normalizeRoomAreaForCommit,
  ROOM_AREA_FIELDS,
  formatRoomAreaFromApi,
} from '@/utils/roomInfoValidation.js'
import { normalizeVerifiedFlag } from '@/utils/fileStatePresent.js'

const OCR_SUM_FIELD_SET = new Set(OCR_SUM_FIELD_KEYS)

const SAVE_CONCURRENCY = 5
const MAX_DIRTY_ROWS = 200

export const EDITABLE_CELL_FIELDS = [
  'roomLevel',
  'roomNumber',
  'buildingArea',
  'innerArea',
  'balconyArea',
  'sharedArea',
  'remark',
]

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let index = 0
  const runWorker = async () => {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await worker(items[current], current)
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runWorker()
  )
  await Promise.all(workers)
  return results
}

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
    batchUpdateLoading,
    usageCategoryMap,
    usageCategoryReverseMap,
    auditSummaryData,
  } = options

  const localBatchUpdateLoading = batchUpdateLoading || ref(false)

  const activeCell = ref({ rowId: '', field: '' })
  const originalByRowId = new Map()
  /** 不在当前已加载分页中的编辑行，避免 push 污染 roomInfoData */
  const offPageRowEdits = new Map()
  const dirtyVersion = ref(0)

  const roomCreateLoading = ref(false)
  const roomDeleteLoading = ref(false)
  const reportRefreshLoading = ref(false)
  const roomInfoLoadingMore = ref(false)

  const bumpDirty = () => {
    dirtyVersion.value += 1
  }

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
      sortDirection: 'asc',
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

  const resolveFloorAreaTypeForUpdate = (row, preset) => {
    const text = String(row.floorAreaType || '').trim()
    if (text === '计容') return 'BUILDABLE'
    if (text === '不计容') return 'NON_BUILDABLE'
    return preset.floorAreaType
  }

  const buildRoomInfoUpdateDTO = (row) => {
    const preset = resolveUsagePresetByCategory(row.usageCategory)
    const roomUsage = isBlankRoomUsage(row.roomUsage)
      ? preset.roomUsage || ''
      : String(row.roomUsage).trim()

    return {
      id: Number(row.id),
      roomLevel: normalizeRoomField(row.roomLevel),
      roomNumber: normalizeRoomField(row.roomNumber),
      buildingArea: Number(row.buildingArea || 0),
      innerArea: Number(row.innerArea || 0),
      balconyArea: Number(row.balconyArea || 0),
      sharedArea: Number(row.sharedArea || 0),
      roomUsage,
      remark: normalizeRoomField(row.remark),
      isCalculate: Number(row.isCalculate || 0),
      usageCategory: preset.usageCategory,
      floorAreaType: resolveFloorAreaTypeForUpdate(row, preset),
    }
  }

  const collectKnownRoomRows = () => {
    const rows = [...(roomInfoData?.value || [])]
    for (const row of offPageRowEdits.values()) {
      if (!rows.some((item) => String(item.id) === String(row.id))) {
        rows.push(row)
      }
    }
    return rows
  }

  const validateRoomRowForUpdate = (row) => validateRoomForUpdate(row, collectKnownRoomRows())

  const persistRoomRow = async (
    row,
    { refreshReport = true, silentRefresh = true, skipReload = false, silentError = false } = {}
  ) => {
    const sourceRow = ensureEditableRow(row)
    if (!sourceRow?.id) {
      const message = '缺少户室ID，无法保存'
      if (!silentError) ElMessage.warning(message)
      return { ok: false, message }
    }

    const validation = validateRoomRowForUpdate(sourceRow)
    if (!validation.ok) {
      if (!silentError) ElMessage.warning(validation.message)
      return { ok: false, message: validation.message }
    }

    try {
      const res = await axios.put(
        '/api/project/room-info/update',
        buildRoomInfoUpdateDTO(sourceRow)
      )
      if (res.data?.code !== 200) {
        const message = res.data?.msg || '保存失败'
        if (!silentError) ElMessage.error(message)
        return { ok: false, message }
      }
      if (skipReload) return { ok: true }
      const reloadOk = await reloadRoomAndSummaryData({
        refreshReport,
        silentRefresh,
      })
      if (!reloadOk) {
        const message = '保存成功但刷新列表失败'
        if (!silentError) ElMessage.error(message)
        return { ok: false, message }
      }
      return { ok: true }
    } catch (error) {
      console.error('保存户室数据失败:', error)
      const message = error?.response?.data?.msg || '保存失败，请重试'
      if (!silentError) ElMessage.error(message)
      return { ok: false, message }
    }
  }

  const mapRoomInfoList = (list = []) =>
    list.map((item) => ({
      id: item.id,
      roomLevel: item.roomLevel || '-',
      roomNumber: item.roomNumber || '-',
      buildingArea: formatRoomAreaFromApi(item.buildingArea),
      innerArea: formatRoomAreaFromApi(item.innerArea),
      balconyArea: formatRoomAreaFromApi(item.balconyArea),
      sharedArea: formatRoomAreaFromApi(item.sharedArea),
      isCalculate: Number(item.isCalculate ?? 0),
      usageCategory: usageCategoryMap?.[item.usageCategory] || '未知',
      roomUsage: item.roomUsage || '-',
      floorAreaType:
        item.floorAreaType === 'BUILDABLE'
          ? '计容'
          : item.floorAreaType === 'NON_BUILDABLE'
            ? '不计容'
            : '未知',
      remark: item.remark || '',
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
      UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN' },
    }
    return { usageCategory: normalized, ...(presetMap[normalized] || presetMap.UNKNOWN) }
  }

  const snapshotRow = (row) => JSON.parse(JSON.stringify(row))

  const clearDirtyState = () => {
    activeCell.value = { rowId: '', field: '' }
    originalByRowId.clear()
    offPageRowEdits.clear()
    bumpDirty()
  }

  const markRowsPersisted = (rowIds = []) => {
    let changed = false
    for (const rowId of rowIds) {
      const id = String(rowId || '')
      if (!id) continue
      changed = originalByRowId.delete(id) || changed
      changed = offPageRowEdits.delete(id) || changed
    }
    if (changed) bumpDirty()
  }

  const ensureContext = () => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportId = Number(realSurveyReportId?.value || 0)
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    return {
      projectId,
      surveyReportId,
      fileRecordId,
      ok: Boolean(projectId && surveyReportId && fileRecordId),
    }
  }

  const reloadRoomOnly = async ({ pageNum, preserveDirty = true } = {}) => {
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

      for (
        let guard = 0;
        guard < 8 && result.records.length === 0 && result.total > 0 && page > 1;
        guard += 1
      ) {
        page -= 1
        result = await fetchRoomInfoPage(page)
        if (!result.ok) break
      }

      if (roomInfoPageNum) roomInfoPageNum.value = page
      if (roomInfoTotal) roomInfoTotal.value = result.total
      applyRoomPageReload(result.records, { preserveDirty })
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

    const pageSize = getRoomPageSize()
    let nextPage = Math.max(1, Number(roomInfoPageNum?.value || 1)) + 1
    const maxPage = Math.max(1, Math.ceil(total / pageSize))
    const startPage = nextPage

    roomInfoLoadingMore.value = true
    try {
      while (nextPage <= maxPage && nextPage - startPage < 8) {
        const result = await fetchRoomInfoPage(nextPage)
        if (!result.ok) return false
        if (roomInfoTotal) roomInfoTotal.value = result.total
        if (result.records.length === 0) return false

        const existingIds = new Set(roomInfoData.value.map((row) => String(row.id)))
        const appendRows = result.records.filter((row) => !existingIds.has(String(row.id)))

        if (roomInfoPageNum) roomInfoPageNum.value = nextPage

        if (appendRows.length > 0) {
          roomInfoData.value = roomInfoData.value.concat(appendRows)
          return syncRoomInfoHasMore(roomInfoData.value.length, result.total)
        }

        if (nextPage >= maxPage) return false
        nextPage += 1
      }
      return syncRoomInfoHasMore(roomInfoData.value.length, total)
    } catch (error) {
      console.error('加载更多户室数据失败:', error)
      ElMessage.error('加载更多户室失败，请稍后重试')
      return false
    } finally {
      roomInfoLoadingMore.value = false
    }
  }

  const roomInfoHasMore = computed(() =>
    syncRoomInfoHasMore(roomInfoData.value.length, Number(roomInfoTotal?.value || 0))
  )

  const reloadSummaryOnly = async () => {
    const fileRecordId = Number(currentFile?.value?.rawId || 0)
    if (!fileRecordId) return

    try {
      const summaryRes = await axios.post('/api/project/survey-reports/query', {
        fileRecordId,
      })
      const currentSummary = summaryRes?.data?.data?.records?.[0]
      if (!currentSummary || !auditSummaryData) return

      auditSummaryData.pendingConfirmArea = Number(currentSummary.pendingConfirmArea || 0).toFixed(
        2
      )
      auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]'
      auditSummaryData.unknownUsageCount = Number(currentSummary.unknownUsageCount || 0)
      auditSummaryData.isVerified = normalizeVerifiedFlag(currentSummary.isVerified)
      auditSummaryData.hasUnknownUsage = Number(currentSummary.hasUnknownUsage || 0)
      auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-'
      auditSummaryData.roomInfoBuildingAreaSum = Number(
        currentSummary.roomInfoBuildingAreaSum || 0
      ).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSum = Number(
        currentSummary.roomInfoInnerAreaSum || 0
      ).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSum = Number(
        currentSummary.roomInfoBalconyAreaSum || 0
      ).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSum = Number(
        currentSummary.roomInfoSharedAreaSum || 0
      ).toFixed(2)
      auditSummaryData.roomInfoBuildingAreaSumFromOcr = Number(
        currentSummary.roomInfoBuildingAreaSumFromOcr || 0
      ).toFixed(2)
      auditSummaryData.roomInfoInnerAreaSumFromOcr = Number(
        currentSummary.roomInfoInnerAreaSumFromOcr || 0
      ).toFixed(2)
      auditSummaryData.roomInfoBalconyAreaSumFromOcr = Number(
        currentSummary.roomInfoBalconyAreaSumFromOcr || 0
      ).toFixed(2)
      auditSummaryData.roomInfoSharedAreaSumFromOcr = Number(
        currentSummary.roomInfoSharedAreaSumFromOcr || 0
      ).toFixed(2)
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

  const reloadRoomAndSummaryData = async ({
    refreshReport = false,
    silentRefresh = true,
    resetToFirstPage = false,
  } = {}) => {
    if (refreshReport) {
      const refreshOk = await triggerSurveyReportRefresh({ silent: silentRefresh })
      if (!refreshOk) return false
    }

    try {
      if (resetToFirstPage && roomInfoPageNum) {
        roomInfoPageNum.value = 1
      }
      await Promise.all([
        reloadSummaryOnly(),
        reloadRoomOnly({
          pageNum: resetToFirstPage ? 1 : undefined,
          preserveDirty: !resetToFirstPage,
        }),
      ])
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
    return (
      roomInfoData.value.find((item) => String(item.id) === id) ??
      offPageRowEdits.get(id) ??
      null
    )
  }

  const ensureEditableRow = (row) => {
    if (!row?.id) return row
    const rowId = String(row.id)
    const idx = roomInfoData.value.findIndex((item) => String(item.id) === rowId)
    if (idx >= 0) {
      copyRoomRowFields(row, roomInfoData.value[idx])
      return roomInfoData.value[idx]
    }

    let cached = offPageRowEdits.get(rowId)
    if (!cached) {
      cached = { ...row }
      offPageRowEdits.set(rowId, cached)
    } else {
      copyRoomRowFields(row, cached)
    }
    return cached
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

  const ensureRowSnapshot = (row) => {
    const rowId = String(row?.id ?? '')
    if (!rowId) return
    if (!originalByRowId.has(rowId)) {
      originalByRowId.set(rowId, snapshotRow(row))
      bumpDirty()
    }
  }

  const prepareRowForEdit = (row) => {
    if (!row?.id) return null
    const target = ensureEditableRow(row)
    ensureRowSnapshot(target)
    return target
  }

  const markRowDirtyIfChanged = (rowId) => {
    const id = String(rowId || '')
    if (!id || !originalByRowId.has(id)) return
    const row = findRoomRowById(id)
    const snapshot = originalByRowId.get(id)
    if (!row || !isRowModified(row, snapshot)) {
      originalByRowId.delete(id)
    }
    bumpDirty()
  }

  const getDirtyRowIds = () => {
    const ids = []
    for (const [id, snapshot] of originalByRowId) {
      const row = findRoomRowById(id)
      if (row && isRowModified(row, snapshot)) {
        ids.push(id)
      }
    }
    return ids
  }

  const dirtyRowCount = computed(() => {
    dirtyVersion.value
    return getDirtyRowIds().length
  })

  const hasUnsavedChanges = computed(() => dirtyRowCount.value > 0)

  const isCellActive = (row, field) => {
    const rowId = String(row?.id ?? '')
    return (
      rowId &&
      activeCell.value.rowId === rowId &&
      activeCell.value.field === field
    )
  }

  const isRowDirty = (row) => {
    dirtyVersion.value
    const rowId = String(row?.id ?? '')
    if (!rowId || !originalByRowId.has(rowId)) return false
    const snapshot = originalByRowId.get(rowId)
    const canonical = findRoomRowById(rowId) || row
    return isRowModified(canonical, snapshot)
  }

  const commitActiveCell = () => {
    const { rowId, field } = activeCell.value
    if (rowId && ROOM_AREA_FIELDS.includes(field)) {
      const row = findRoomRowById(rowId)
      const snapshot = originalByRowId.get(rowId)
      const numericError = getRoomAreaNumericError(field, row?.[field])
      if (numericError) {
        ElMessage.warning(numericError)
        if (row && snapshot) {
          row[field] = snapshot[field]
        }
        activeCell.value = { rowId: '', field: '' }
        return
      }
      const normalized = normalizeRoomAreaForCommit(row?.[field])
      if (normalized === null) {
        ElMessage.warning('面积格式无效')
        if (row && snapshot) {
          row[field] = snapshot[field]
        }
        activeCell.value = { rowId: '', field: '' }
        return
      }
      if (row) {
        row[field] = normalized
      }
    }
    if (rowId) markRowDirtyIfChanged(rowId)
    activeCell.value = { rowId: '', field: '' }
  }

  const startCellEdit = (row, field) => {
    if (!row?.id) {
      ElMessage.warning('缺少户室ID，无法编辑')
      return
    }
    if (!EDITABLE_CELL_FIELDS.includes(field)) return

    commitActiveCell()
    ensureEditableRow(row)
    ensureRowSnapshot(findRoomRowById(row.id))
    activeCell.value = { rowId: String(row.id), field }
  }

  const notifyRowTouched = (row) => {
    if (!row?.id) return
    prepareRowForEdit(row)
    markRowDirtyIfChanged(String(row.id))
    bumpDirty()
  }

  const discardAllChanges = () => {
    commitActiveCell()
    for (const [id, snapshot] of originalByRowId) {
      const row = findRoomRowById(id)
      if (row) copyRoomRowFields(snapshot, row)
    }
    clearDirtyState()
  }

  const confirmDiscardUnsavedChanges = async () => {
    commitActiveCell()
    if (!hasUnsavedChanges.value) return true
    try {
      await ElMessageBox.confirm(
        '有未保存的户室修改，继续将丢失这些修改。',
        '未保存的修改',
        {
          confirmButtonText: '放弃修改',
          cancelButtonText: '继续编辑',
          type: 'warning',
        }
      )
      discardAllChanges()
      return true
    } catch {
      return false
    }
  }

  const applyRoomPageReload = (records, { preserveDirty = true } = {}) => {
    const nextRecords = Array.isArray(records) ? records : []
    if (!preserveDirty) {
      roomInfoData.value = nextRecords
      return
    }

    const dirtyIds = getDirtyRowIds()
    if (!dirtyIds.length) {
      roomInfoData.value = nextRecords
      return
    }

    const pageIds = new Set(nextRecords.map((row) => String(row.id)))
    const preserveIds = new Set(dirtyIds.filter((id) => !pageIds.has(id)))
    const preserved = roomInfoData.value.filter((row) => preserveIds.has(String(row.id)))
    roomInfoData.value = [...nextRecords, ...preserved]
  }

  const fetchRoomInfoById = async (roomInfoId) => {
    const fresh = await fetchRoomInfoByIdRaw({
      roomInfoId,
      queryRoomInfos,
      mapRoomInfoList,
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
      mapRoomInfoList,
    })
  }

  const searchMissingUsageByPages = async ({ signal, onProgress } = {}) => {
    const projectId = Number(currentProject?.value || 0)
    const surveyReportInfoId = Number(realSurveyReportId?.value || 0)
    if (!projectId || !surveyReportInfoId) return []

    return searchMissingUsageByPagesRaw({
      projectId,
      surveyReportInfoId,
      signal,
      onProgress,
      queryRoomInfos,
      mapRoomInfoList,
    })
  }

  const handleSaveDirtyRows = async () => {
    commitActiveCell()
    const dirtyIds = getDirtyRowIds()
    if (!dirtyIds.length) {
      ElMessage.info('无修改')
      return false
    }
    if (dirtyIds.length > MAX_DIRTY_ROWS) {
      ElMessage.warning(`单次最多保存 ${MAX_DIRTY_ROWS} 条，请分批操作`)
      return false
    }

    for (const id of dirtyIds) {
      const row = findRoomRowById(id)
      const snapshot = originalByRowId.get(id)
      if (!row) {
        ElMessage.warning('户室数据不存在')
        return false
      }
      const identityValidation = validateRoomRowForUpdate(row)
      if (!identityValidation.ok) {
        const level = normalizeRoomField(row?.roomLevel) || '-'
        const number = normalizeRoomField(row?.roomNumber) || '-'
        ElMessage.warning(`${identityValidation.message}（${level} / ${number}）`)
        return false
      }
      const validation = validateChangedRoomAreaFields(row, snapshot)
      if (!validation.ok) {
        const level = normalizeRoomField(row?.roomLevel) || '-'
        const number = normalizeRoomField(row?.roomNumber) || '-'
        ElMessage.warning(`${validation.message}（${level} / ${number}）`)
        return false
      }
      for (const field of getChangedRoomAreaFields(row, snapshot)) {
        const normalized = normalizeRoomAreaForCommit(row?.[field])
        if (normalized === null) {
          const level = normalizeRoomField(row?.roomLevel) || '-'
          const number = normalizeRoomField(row?.roomNumber) || '-'
          ElMessage.warning(`面积格式无效（${level} / ${number}）`)
          return false
        }
        row[field] = normalized
      }
    }

    localBatchUpdateLoading.value = true
    try {
      const results = await runPool(dirtyIds, SAVE_CONCURRENCY, async (id) => {
        const row = findRoomRowById(id)
        if (!row) return { ok: false, message: '户室数据不存在' }
        return persistRoomRow(row, {
          refreshReport: false,
          skipReload: true,
          silentError: true,
        })
      })

      const failures = results.filter((result) => !result?.ok)
      if (failures.length > 0) {
        const persistedIds = dirtyIds.filter((id, index) => results[index]?.ok)
        markRowsPersisted(persistedIds)
        await reloadRoomAndSummaryData({
          refreshReport: false,
          silentRefresh: true,
          resetToFirstPage: true,
        })
        const reasons = [...new Set(failures.map((item) => item.message).filter(Boolean))]
        const detail = reasons.slice(0, 3).join('；')
        ElMessage.error(
          detail
            ? `${failures.length} 条保存失败：${detail}${reasons.length > 3 ? '…' : ''}`
            : `${failures.length} 条保存失败，请检查后重试`
        )
        return false
      }

      const reloadOk = await reloadRoomAndSummaryData({
        refreshReport: true,
        silentRefresh: true,
        resetToFirstPage: true,
      })
      if (!reloadOk) {
        ElMessage.error('已保存但刷新列表失败，请点击「重新计算」同步数据')
        return false
      }

      clearDirtyState()

      ElMessage.success(`已保存 ${dirtyIds.length} 条，已刷新实测报告`)
      return true
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
      const validation = validateRoomForCreate(payload, collectKnownRoomRows())
      if (!validation.ok) {
        ElMessage.warning(validation.message)
        return false
      }

      const preset = resolveUsagePresetByCategory(payload.usageCategory)
      const body = {
        projectId,
        fileRecordId,
        surveyReportInfoId: surveyReportId,
        usageCategory: preset.usageCategory,
        roomLevel: normalizeRoomField(payload.roomLevel),
        roomNumber: normalizeRoomField(payload.roomNumber),
        buildingArea: Number(payload.buildingArea || 0),
        innerArea: Number(payload.innerArea || 0),
        balconyArea: Number(payload.balconyArea || 0),
        sharedArea: Number(payload.sharedArea || 0),
        roomUsage: preset.roomUsage,
        remark: payload.remark || '',
        floorAreaType: preset.floorAreaType,
      }

      const res = await axios.post('/api/project/room-info/create', body)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '新增户室失败')
        return false
      }

      clearDirtyState()
      const reloadOk = await reloadRoomAndSummaryData({
        refreshReport: true,
        silentRefresh: true,
        resetToFirstPage: true,
      })
      if (!reloadOk) {
        ElMessage.warning('新增成功但列表刷新失败，请点击「重新计算」')
        return true
      }
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
        type: 'warning',
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

      originalByRowId.delete(String(roomId))
      bumpDirty()
      clearDirtyState()
      await reloadRoomAndSummaryData({
        refreshReport: true,
        silentRefresh: true,
        resetToFirstPage: true,
      })
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
    commitActiveCell()
    if (hasUnsavedChanges.value) {
      const canProceed = await confirmDiscardUnsavedChanges()
      if (!canProceed) return false
    }

    const ok = await reloadRoomAndSummaryData({
      refreshReport: true,
      silentRefresh: false,
      resetToFirstPage: true,
    })
    if (ok) {
      ElMessage.success('数据已刷新')
    }
    return ok
  }

  /** 校正 OCR 合计：落库后由后端重跑校验，前端只刷新汇总 */
  const handleSaveOcrSum = async (field, rawValue) => {
    if (!OCR_SUM_FIELD_SET.has(field)) return false

    const surveyReportId = Number(realSurveyReportId?.value || 0)
    if (!surveyReportId) {
      ElMessage.warning('缺少实测报告ID，无法保存 OCR 合计')
      return false
    }

    const text = String(rawValue ?? '').trim()
    if (text === '') {
      ElMessage.warning('OCR 合计不能为空')
      return false
    }

    const areaError = getRoomAreaFieldError('buildingArea', text)
    if (areaError) {
      ElMessage.warning(areaError.replaceAll('建筑面积', 'OCR 合计'))
      return false
    }

    const normalized = normalizeRoomAreaForCommit(text)
    if (normalized === null || normalized === '') {
      ElMessage.warning('OCR 合计格式无效')
      return false
    }
    const nextValue = Number(normalized)
    if (!Number.isFinite(nextValue)) {
      ElMessage.warning('OCR 合计格式无效')
      return false
    }
    const currentValue = Number(auditSummaryData?.[field] || 0)
    const currentValueIsDerived = isAuditSummaryFieldDerivedFromVerificationReason(
      auditSummaryData,
      field
    )
    if (
      !currentValueIsDerived &&
      Number.isFinite(currentValue) &&
      Math.abs(currentValue - nextValue) < 0.00005
    ) {
      return true
    }

    try {
      const res = await updateSurveyReportInfo({
        id: surveyReportId,
        [field]: nextValue,
      })
      if (res?.data?.code !== 200) {
        ElMessage.error(res?.data?.msg || '保存 OCR 合计失败')
        return false
      }
      await reloadSummaryOnly()
      ElMessage.success('OCR 合计已保存并重新校验')
      return true
    } catch (error) {
      console.error('保存 OCR 合计失败:', error)
      ElMessage.error(error?.response?.data?.msg || '保存 OCR 合计失败')
      return false
    }
  }

  const syncRoomRow = (row) => ensureEditableRow(row)

  const getRoomRowById = (rowId) => findRoomRowById(rowId)

  return {
    activeCell,
    dirtyRowCount,
    hasUnsavedChanges,
    isCellActive,
    isRowDirty,
    startCellEdit,
    commitActiveCell,
    prepareRowForEdit,
    notifyRowTouched,
    discardAllChanges,
    confirmDiscardUnsavedChanges,
    handleSaveDirtyRows,
    syncRoomRow,
    getRoomRowById,
    clearDirtyState,
    handleRefreshSurveyReport,
    handleSaveOcrSum,
    handleCreateRoom,
    handleDeleteRoom,
    roomCreateLoading,
    roomDeleteLoading,
    reportRefreshLoading,
    batchUpdateLoading: localBatchUpdateLoading,
    roomInfoLoadingMore,
    loadMoreRoomInfo,
    roomInfoHasMore,
    searchRoomInfosByPages,
    searchMissingUsageByPages,
    fetchRoomInfoById,
  }
}
