import { computed, reactive, ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { filterAndRankUsageOptions } from '@/utils/textMatchRank.js'
import {
  USAGE_CATEGORY_BUILDABLE_OPTIONS as usageCategoryCreateBuildableOptions,
  USAGE_CATEGORY_NON_BUILDABLE_OPTIONS as usageCategoryCreateNonBuildableOptions,
  normalizeUsageCategoryCode,
  resolveFloorAreaTypeByCategory,
  usageCategoryLabel,
} from '@/constants/usageCategory.js'
import {
  mapUsageConfigToPickerOptions,
  useUsageConfigPageCache,
  invalidateUsageConfigPageCaches,
} from '@/composables/usage-config/useUsageConfigPageCache.js'
import { isBlankRoomUsage } from '@/composables/file-upload/surveyUsagePending'
import { validateRoomAreaFields, normalizeRoomAreaForCommit, ROOM_AREA_FIELDS } from '@/utils/roomInfoValidation.js'
import { matchUsageConfig } from '@/utils/usageConfigMatch.js'

const usagePresetMap = {
  RESIDENTIAL: { roomUsage: '住宅', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMERCIAL: { roomUsage: '商业', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  MANAGEMENT: { roomUsage: '物管', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  OTHER_BUILDABLE: { roomUsage: '其他计容', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMUNITY: { roomUsage: '社区用房', floorAreaType: 'NON_BUILDABLE', floorAreaTypeText: '不计容' },
  OTHER_PUBLIC: {
    roomUsage: '其他公用',
    floorAreaType: 'NON_BUILDABLE',
    floorAreaTypeText: '不计容',
  },
  UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN', floorAreaTypeText: '未知' },
}

export function useCalibrationRoomUsageEditor({
  syncRoomRow,
  prepareRowForEdit,
  notifyRowTouched,
  handleCreateRoom,
  handleDeleteRoom,
}) {
  const { knownList, loadKnown } = useUsageConfigPageCache()

  const createRoomDialogVisible = ref(false)
  const createRoomFormRef = ref(null)
  const createRoomForm = reactive({
    usageCategory: '',
    roomLevel: '',
    roomNumber: '',
    buildingArea: '',
    innerArea: '',
    balconyArea: '',
    sharedArea: '',
    remark: '',
    roomUsage: '',
    floorAreaType: '',
  })

  const derivedRoomPreset = computed(() => {
    return (
      usagePresetMap[createRoomForm.usageCategory] || {
        roomUsage: '-',
        floorAreaType: 'UNKNOWN',
        floorAreaTypeText: '-',
      }
    )
  })

  const resetCreateRoomForm = () => {
    createRoomForm.usageCategory = ''
    createRoomForm.roomLevel = ''
    createRoomForm.roomNumber = ''
    createRoomForm.buildingArea = ''
    createRoomForm.innerArea = ''
    createRoomForm.balconyArea = ''
    createRoomForm.sharedArea = ''
    createRoomForm.remark = ''
    createRoomForm.roomUsage = ''
    createRoomForm.floorAreaType = ''
  }

  const openCreateRoomDialog = () => {
    resetCreateRoomForm()
    createRoomDialogVisible.value = true
  }

  const handleSubmitCreateRoom = async () => {
    if (!createRoomForm.usageCategory) {
      ElMessage.warning('请先选择用途类别')
      return
    }
    for (const field of ROOM_AREA_FIELDS) {
      const normalized = normalizeRoomAreaForCommit(createRoomForm[field])
      if (normalized === null && createRoomForm[field] !== '' && createRoomForm[field] != null) {
        ElMessage.warning('面积格式无效')
        return
      }
      createRoomForm[field] = normalized
    }
    const areaValidation = validateRoomAreaFields(createRoomForm)
    if (!areaValidation.ok) {
      ElMessage.warning(areaValidation.message)
      return
    }
    if (typeof handleCreateRoom !== 'function') return
    const ok = await handleCreateRoom({
      ...createRoomForm,
      roomUsage: derivedRoomPreset.value.roomUsage,
      floorAreaType: derivedRoomPreset.value.floorAreaType,
    })
    if (ok) {
      createRoomDialogVisible.value = false
      resetCreateRoomForm()
    }
  }

  const handleDeleteRoomRow = async (row) => {
    if (typeof handleDeleteRoom !== 'function') return
    await handleDeleteRoom(row)
  }

  const usagePickerVisible = ref(false)
  const usagePickerLoading = ref(false)
  const usagePickerKeyword = ref('')
  const usagePickerOptions = ref([])
  const usagePickerTargetRow = ref(null)
  const createUsageDialogVisible = ref(false)
  const createUsageSubmitting = ref(false)
  const createUsageFormRef = ref(null)
  const createUsageForm = reactive({
    usagePattern: '',
    usageCategory: '',
  })
  const createUsageFormRules = {
    usagePattern: [{ required: true, message: '请输入用途名称', trigger: 'blur' }],
    usageCategory: [{ required: true, message: '请选择用途类别', trigger: 'change' }],
  }

  const normalizeUsageCategoryText = (value) => usageCategoryLabel(value, '未知')

  const ensureUsageOptionsLoaded = async () => {
    if (usagePickerLoading.value) return
    await loadUsagePickerOptions()
  }

  const usageEditorVisibleRowId = ref('')
  const usageEditorFilterQuery = ref('')
  const usageEditorDraft = reactive({ usageConfigId: '' })
  const usageApplyTargetRows = ref([])
  const batchUsageDialogVisible = ref(false)
  const batchUsageFilterQuery = ref('')
  const batchUsageDraft = reactive({ usageConfigId: '' })

  const usageEditorDisplayOptions = computed(() =>
    filterAndRankUsageOptions(usagePickerOptions.value, usageEditorFilterQuery.value)
  )

  const batchUsageDisplayOptions = computed(() =>
    filterAndRankUsageOptions(usagePickerOptions.value, batchUsageFilterQuery.value)
  )

  const findUsageOptionById = (configId) =>
    usagePickerOptions.value.find((item) => String(item.id) === String(configId ?? '')) || null

  const resolveUsageMatchPreview = (configId) => {
    const selected = findUsageOptionById(configId)
    if (!selected) return null
    const winner = matchUsageConfig(selected.usagePattern, usagePickerOptions.value)
    if (!winner || String(winner.id) === String(selected.id)) return null
    return winner
  }

  const usageEditorMatchPreview = computed(() =>
    resolveUsageMatchPreview(usageEditorDraft.usageConfigId)
  )

  const batchUsageMatchPreview = computed(() =>
    resolveUsageMatchPreview(batchUsageDraft.usageConfigId)
  )

  const onUsageEditorFilter = (query) => {
    usageEditorFilterQuery.value = query
  }

  const onBatchUsageFilter = (query) => {
    batchUsageFilterQuery.value = query
  }

  const openUsageEditor = async (row) => {
    const rowId = String(row?.id || '')
    if (usageEditorVisibleRowId.value === rowId) {
      closeUsageEditor()
      return
    }
    batchUsageDialogVisible.value = false
    usagePickerTargetRow.value = row
    usageEditorVisibleRowId.value = rowId
    usageEditorFilterQuery.value = ''
    usageEditorDraft.usageConfigId = ''
    await ensureUsageOptionsLoaded()
    if (usageEditorVisibleRowId.value !== rowId) return
    const currentUsage = String(row?.roomUsage || '').trim()
    const initial = isBlankRoomUsage(currentUsage)
      ? null
      : usagePickerOptions.value.find(
          (item) => String(item.usagePattern || '').trim() === currentUsage
        )
    usageEditorDraft.usageConfigId = initial ? String(initial.id) : ''
  }

  const handleUsageEditorVisibleChange = (visible, row) => {
    if (visible) return
    if (usageEditorVisibleRowId.value === String(row?.id || '')) {
      closeUsageEditor()
    }
  }

  const closeUsageEditor = () => {
    usageEditorVisibleRowId.value = ''
    usageEditorFilterQuery.value = ''
  }

  const closeBatchUsageDialog = () => {
    batchUsageDialogVisible.value = false
    batchUsageFilterQuery.value = ''
    batchUsageDraft.usageConfigId = ''
  }

  const openBatchUsageDialog = async () => {
    closeUsageEditor()
    batchUsageFilterQuery.value = ''
    batchUsageDraft.usageConfigId = ''
    batchUsageDialogVisible.value = true
    await ensureUsageOptionsLoaded()
  }

  const stageUsageOnRow = (row, matched) => {
    let target = typeof syncRoomRow === 'function' ? syncRoomRow(row) : row
    if (typeof prepareRowForEdit === 'function') {
      target = prepareRowForEdit(target) || target
    }
    target.usageCategory = normalizeUsageCategoryText(matched.usageCategory)
    target.roomUsage = matched.usagePattern || target.roomUsage
    target.floorAreaType = matched.floorAreaTypeText || target.floorAreaType
    if (typeof notifyRowTouched === 'function') notifyRowTouched(target)
    return target
  }

  const applyUsageToRows = (rows, matched) => {
    const pattern = String(matched?.usagePattern || '').trim()
    let updated = 0
    let skipped = 0
    for (const row of rows || []) {
      if (!row?.id || !matched) continue
      const current = String(row.roomUsage || '').trim()
      if (pattern && current === pattern) {
        skipped += 1
        continue
      }
      stageUsageOnRow(row, matched)
      updated += 1
    }
    return { updated, skipped }
  }

  const formatUsageApplyMessage = ({ updated, skipped }, rowCount) => {
    if (rowCount <= 1) {
      return updated === 0 ? '用途未变化' : '用途已更新，请点击「保存修改」提交'
    }
    return `已更新 ${updated} 户，跳过 ${skipped} 户，请点击「保存修改」提交`
  }

  const confirmUsageEditor = (row) => {
    if (!usageEditorDraft.usageConfigId) {
      ElMessage.warning('请选择用途')
      return
    }
    const matched = findUsageOptionById(usageEditorDraft.usageConfigId)
    if (!matched) {
      ElMessage.warning('未找到对应用途配置，请先新增用途')
      return
    }
    const result = applyUsageToRows([row], matched)
    closeUsageEditor()
    ElMessage.info(formatUsageApplyMessage(result, 1))
  }

  const confirmBatchUsage = (rows) => {
    const list = Array.isArray(rows) ? rows.filter((row) => row?.id) : []
    if (!list.length) {
      ElMessage.warning('请先选择户室')
      return
    }
    if (!batchUsageDraft.usageConfigId) {
      ElMessage.warning('请选择用途')
      return
    }
    const matched = findUsageOptionById(batchUsageDraft.usageConfigId)
    if (!matched) {
      ElMessage.warning('未找到对应用途配置，请先新增用途')
      return
    }
    const result = applyUsageToRows(list, matched)
    closeBatchUsageDialog()
    ElMessage.info(formatUsageApplyMessage(result, list.length))
  }

  const filteredUsagePickerOptions = computed(() =>
    filterAndRankUsageOptions(usagePickerOptions.value, usagePickerKeyword.value)
  )

  const loadUsagePickerOptions = async ({ force = false } = {}) => {
    if (!force && knownList.value !== null) {
      usagePickerOptions.value = mapUsageConfigToPickerOptions(knownList.value)
      return
    }

    usagePickerLoading.value = true
    try {
      await loadKnown({ force })
      usagePickerOptions.value = mapUsageConfigToPickerOptions(knownList.value ?? [])
    } catch (error) {
      console.error('获取用途映射失败:', error)
      ElMessage.error('获取用途映射失败，请稍后重试')
      usagePickerOptions.value = []
    } finally {
      usagePickerLoading.value = false
    }
  }

  const applyUsagePicker = (item) => {
    const target = usagePickerTargetRow.value
    if (!target || !item) return
    stageUsageOnRow(target, item)
    usagePickerVisible.value = false
  }

  const handleUsagePickerRowClick = (row) => {
    applyUsagePicker(row)
  }

  const resetCreateUsageForm = () => {
    if (createUsageFormRef.value) {
      createUsageFormRef.value.clearValidate()
    }
    createUsageForm.usagePattern = ''
    createUsageForm.usageCategory = ''
  }

  const resolveUsageEditorCreatePatternSeed = () => {
    const filterQuery = String(usageEditorFilterQuery.value || '').trim()
    if (filterQuery) return filterQuery
    const selected = findUsageOptionById(usageEditorDraft.usageConfigId)
    const pattern = String(selected?.usagePattern || '').trim()
    if (pattern && !isBlankRoomUsage(pattern)) return pattern
    return ''
  }

  const openCreateUsageDialog = () => {
    usageApplyTargetRows.value = []
    resetCreateUsageForm()
    const keyword = String(usagePickerKeyword.value || '').trim()
    if (keyword) {
      createUsageForm.usagePattern = keyword
    }
    createUsageDialogVisible.value = true
  }

  const openCreateUsageDialogForRow = async (row) => {
    usagePickerTargetRow.value = row
    usageApplyTargetRows.value = row?.id ? [row] : []
    await ensureUsageOptionsLoaded()
    resetCreateUsageForm()
    createUsageForm.usagePattern =
      resolveUsageEditorCreatePatternSeed() || String(row?.roomUsage || '').trim()
    createUsageForm.usageCategory =
      normalizeUsageCategoryCode(row?.usageCategory) === 'UNKNOWN'
        ? ''
        : normalizeUsageCategoryCode(row?.usageCategory)
    createUsageDialogVisible.value = true
  }

  const openCreateUsageDialogForRows = async (rows) => {
    const list = Array.isArray(rows) ? rows.filter((row) => row?.id) : []
    if (!list.length) {
      ElMessage.warning('请先选择户室')
      return
    }
    usageApplyTargetRows.value = list
    await ensureUsageOptionsLoaded()
    resetCreateUsageForm()
    const filterQuery = String(batchUsageFilterQuery.value || '').trim()
    const selected = findUsageOptionById(batchUsageDraft.usageConfigId)
    const selectedPattern = String(selected?.usagePattern || '').trim()
    if (filterQuery) {
      createUsageForm.usagePattern = filterQuery
    } else if (selectedPattern && !isBlankRoomUsage(selectedPattern)) {
      createUsageForm.usagePattern = selectedPattern
    } else {
      const names = [
        ...new Set(
          list
            .map((row) => String(row?.roomUsage || '').trim())
            .filter((name) => name && !isBlankRoomUsage(name))
        ),
      ]
      if (names.length === 1) createUsageForm.usagePattern = names[0]
    }
    createUsageDialogVisible.value = true
  }

  const handleSubmitCreateUsage = async () => {
    if (!createUsageFormRef.value || createUsageSubmitting.value) return
    try {
      await createUsageFormRef.value.validate()
    } catch {
      return
    }

    createUsageSubmitting.value = true
    try {
      const usageCategory = String(createUsageForm.usageCategory || '').toUpperCase()
      const usagePattern = String(createUsageForm.usagePattern || '').trim()
      const floorAreaType = resolveFloorAreaTypeByCategory(usageCategory)

      const payload = {
        usagePattern,
        usageCategory,
        floorAreaType,
        isRegex: 0,
        priority: 100,
        status: 1,
        remark: '审核界面新增',
        collectionName: '',
      }
      const res = await axios.post('/api/usage-config', payload)
      if (res.data?.code !== 200) {
        ElMessage.error(res.data?.msg || '新增用途失败')
        return
      }

      ElMessage.success('新增用途成功')
      createUsageDialogVisible.value = false
      // 后端会关闭同名 pending；清空两端缓存后再拉已知列表
      invalidateUsageConfigPageCaches()
      await loadUsagePickerOptions({ force: true })

      const created = usagePickerOptions.value.find(
        (item) =>
          String(item.usagePattern || '').trim() === usagePattern &&
          String(item.usageCategory || '')
            .trim()
            .toUpperCase() === usageCategory
      )
      if (!created) return
      const targets = usageApplyTargetRows.value
      if (targets.length) {
        const result = applyUsageToRows(targets, created)
        const rowCount = targets.length
        usageApplyTargetRows.value = []
        closeUsageEditor()
        closeBatchUsageDialog()
        ElMessage.info(formatUsageApplyMessage(result, rowCount))
        return
      }
      applyUsagePicker(created)
      ElMessage.info('已选用新用途，请点击「保存修改」提交')
    } catch (error) {
      console.error('新增用途失败:', error)
      ElMessage.error('新增用途失败，请稍后重试')
    } finally {
      createUsageSubmitting.value = false
    }
  }

  const resetUsageEditorState = () => {
    closeUsageEditor()
    closeBatchUsageDialog()
    usageApplyTargetRows.value = []
    usagePickerVisible.value = false
    createRoomDialogVisible.value = false
    createUsageDialogVisible.value = false
    resetCreateRoomForm()
    resetCreateUsageForm()
  }

  return {
    usageCategoryCreateBuildableOptions,
    usageCategoryCreateNonBuildableOptions,
    normalizeUsageCategoryText,
    createRoomDialogVisible,
    createRoomFormRef,
    createRoomForm,
    openCreateRoomDialog,
    handleSubmitCreateRoom,
    handleDeleteRoomRow,
    usagePickerVisible,
    usagePickerLoading,
    usagePickerKeyword,
    filteredUsagePickerOptions,
    loadUsagePickerOptions,
    handleUsagePickerRowClick,
    applyUsagePicker,
    openCreateUsageDialog,
    createUsageDialogVisible,
    createUsageFormRef,
    createUsageForm,
    createUsageFormRules,
    createUsageSubmitting,
    resetCreateUsageForm,
    handleSubmitCreateUsage,
    usageEditorVisibleRowId,
    usageEditorDraft,
    usageEditorDisplayOptions,
    usageEditorMatchPreview,
    onUsageEditorFilter,
    openUsageEditor,
    handleUsageEditorVisibleChange,
    closeUsageEditor,
    confirmUsageEditor,
    openCreateUsageDialogForRow,
    openCreateUsageDialogForRows,
    batchUsageDialogVisible,
    batchUsageDraft,
    batchUsageDisplayOptions,
    batchUsageMatchPreview,
    onBatchUsageFilter,
    openBatchUsageDialog,
    closeBatchUsageDialog,
    confirmBatchUsage,
    resetUsageEditorState,
  }
}
