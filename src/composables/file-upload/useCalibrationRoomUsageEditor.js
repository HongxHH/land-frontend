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
  invalidateUsageConfigListCache,
} from '@/composables/usage-config/useUsageConfigPageCache.js'
import { isBlankRoomUsage } from '@/composables/file-upload/surveyUsagePending'

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
  const usageEditorDraft = reactive({ roomUsage: '' })

  const usageEditorDisplayOptions = computed(() =>
    filterAndRankUsageOptions(usagePickerOptions.value, usageEditorFilterQuery.value)
  )

  const onUsageEditorFilter = (query) => {
    usageEditorFilterQuery.value = query
  }

  const openUsageEditor = async (row) => {
    const rowId = String(row?.id || '')
    if (usageEditorVisibleRowId.value === rowId) {
      closeUsageEditor()
      return
    }
    usagePickerTargetRow.value = row
    usageEditorVisibleRowId.value = rowId
    usageEditorFilterQuery.value = ''
    usageEditorDraft.roomUsage = String(row?.roomUsage || '').trim()
    await ensureUsageOptionsLoaded()
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

  const confirmUsageEditor = (row) => {
    if (!usageEditorDraft.roomUsage) {
      ElMessage.warning('请选择用途')
      return
    }
    const matched = usagePickerOptions.value.find(
      (item) =>
        String(item.usagePattern || '').trim() === String(usageEditorDraft.roomUsage || '').trim()
    )
    if (!matched) {
      ElMessage.warning('未找到对应用途配置，请先新增用途')
      return
    }
    stageUsageOnRow(row, matched)
    closeUsageEditor()
    ElMessage.info('用途已更新，请点击「保存修改」提交')
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
    const draftUsage = String(usageEditorDraft.roomUsage || '').trim()
    if (draftUsage && !isBlankRoomUsage(draftUsage)) return draftUsage
    return ''
  }

  const openCreateUsageDialog = () => {
    resetCreateUsageForm()
    const keyword = String(usagePickerKeyword.value || '').trim()
    if (keyword) {
      createUsageForm.usagePattern = keyword
    }
    createUsageDialogVisible.value = true
  }

  const openCreateUsageDialogForRow = async (row) => {
    usagePickerTargetRow.value = row
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
      invalidateUsageConfigListCache()
      await loadUsagePickerOptions({ force: true })

      const created = usagePickerOptions.value.find(
        (item) =>
          String(item.usagePattern || '').trim() === usagePattern &&
          String(item.usageCategory || '')
            .trim()
            .toUpperCase() === usageCategory
      )
      if (created) {
        applyUsagePicker(created)
        ElMessage.info('已选用新用途，请点击「保存修改」提交')
      }
    } catch (error) {
      console.error('新增用途失败:', error)
      ElMessage.error('新增用途失败，请稍后重试')
    } finally {
      createUsageSubmitting.value = false
    }
  }

  const resetUsageEditorState = () => {
    closeUsageEditor()
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
    onUsageEditorFilter,
    openUsageEditor,
    handleUsageEditorVisibleChange,
    closeUsageEditor,
    confirmUsageEditor,
    openCreateUsageDialogForRow,
    resetUsageEditorState,
  }
}
