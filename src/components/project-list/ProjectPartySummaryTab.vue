<template>
  <div class="party-summary-tab workspace-tab-fill workspace-ui-scale">
    <section
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <ProjectPartySummaryHero
        :form-total="formTotal"
        :active-file-record-id="activeFileRecordId"
        :active-form-selection-text="activeFormSelectionText"
        :forms-loading="formsLoading"
        @refresh="fetchForms"
      />
      <ProjectPartySummaryDashboard
        :forms-loading="formsLoading"
        :forms="forms"
        :form-total="formTotal"
        :forms-loading-more="formsLoadingMore"
        :displayed-form="displayedForm"
        :active-file-record-id="activeFileRecordId"
        :displayed-form-file-title="displayedFormFileTitle"
        :displayed-form-file-label="displayedFormFileLabel"
        :parse-status-text="parseStatusText"
        :parse-status-tag-type="parseStatusTagType"
        :resolve-form-file-name="resolveFormFileName"
        :form-file-title="formFileTitle"
        :format-num="formatNum"
        @load-more="fetchMoreForms"
        @select-form="selectForm"
        @audit="openAudit"
      />
    </section>

    <ProjectPartySummaryAuditDialog
      v-model="auditDialogVisible"
      :project-id="projectId"
      :file-record-id="currentAuditFileRecordId"
      :initial-file="currentAuditFile"
      :main-form-draft="partySummaryMainFormDraft"
      @main-form-saved="onPartySummaryMainFormSaved"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import ProjectPartySummaryHero from '@/components/project-list/ProjectPartySummaryHero.vue'
import ProjectPartySummaryDashboard from '@/components/project-list/ProjectPartySummaryDashboard.vue'
import { queryProjectPartySummaryForms } from '@/services/project.service'
import '@/styles/project-party-summary-tab.css'

const ProjectPartySummaryAuditDialog = defineAsyncComponent(
  () => import('@/components/project-list/ProjectPartySummaryAuditDialog.vue')
)

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false },
})

const formsLoading = ref(false)
const formsLoadingMore = ref(false)
const forms = ref([])
const formTotal = ref(0)

const auditDialogVisible = ref(false)
const currentAuditFileRecordId = ref('')
const currentAuditFile = ref(null)
const activeFileRecordId = ref('')

const partySummaryMainFormDraft = ref(null)

const buildMainFormDraftFromRow = (row) => ({
  id: row?.id ?? null,
  isParsed: row?.isParsed ?? null,
  parseStatus: row?.parseStatus || '',
  remark: row?.remark || '',
  declaredTotals: {
    contractAgreedTotalBuildingArea: row?.declaredTotals?.contractAgreedTotalBuildingArea ?? null,
    buildableTotalBuildingArea: row?.declaredTotals?.buildableTotalBuildingArea ?? null,
    differenceTotalBuildingArea: row?.declaredTotals?.differenceTotalBuildingArea ?? null,
    contractAgreedCommercialArea: row?.declaredTotals?.contractAgreedCommercialArea ?? null,
    buildableCommercialArea: row?.declaredTotals?.buildableCommercialArea ?? null,
    differenceCommercialArea: row?.declaredTotals?.differenceCommercialArea ?? null,
    contractAgreedResidentialArea: row?.declaredTotals?.contractAgreedResidentialArea ?? null,
    buildableResidentialArea: row?.declaredTotals?.buildableResidentialArea ?? null,
    differenceResidentialArea: row?.declaredTotals?.differenceResidentialArea ?? null,
  },
})

const parseStatusText = {
  PENDING: '待解析',
  SUCCESS: '成功',
  PARTIAL: '成功',
  FAILED: '失败',
}

const parseStatusTagType = {
  PENDING: 'warning',
  SUCCESS: 'success',
  PARTIAL: 'success',
  FAILED: 'danger',
}

const formQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'updateTime',
  sortDirection: 'desc',
  projectId: '',
})

/** 当前展示的汇总主表（默认第一份或与 activeFileRecordId 对应） */
const displayedForm = computed(() => {
  const list = forms.value
  if (!list.length) return null
  const id = String(activeFileRecordId.value || '')
  if (!id) return list[0]
  return list.find((f) => String(f.fileRecordId) === id) || list[0]
})

const activeFormSelectionText = computed(() => {
  const list = forms.value
  if (!list.length) return '暂无主表'
  const row = displayedForm.value
  const name = resolveFormFileName(row)
  if (list.length === 1 && formTotal.value <= 1) {
    return name || '本项 1 份汇总表'
  }
  const id = String(activeFileRecordId.value || '')
  const idx = list.findIndex((f) => String(f.fileRecordId) === id)
  const n = idx >= 0 ? idx + 1 : 1
  if (name) {
    const short = name.length > 18 ? `${name.slice(0, 18)}…` : name
    return `#${n} ${short}`
  }
  return `第 ${n} 份 · 共 ${formTotal.value || list.length} 份`
})

const shortFileRecordId = (fid) => {
  const s = String(fid ?? '')
  if (!s) return '—'
  return s.length > 16 ? `${s.slice(0, 16)}…` : s
}

const resolveFormFileName = (row) => {
  const name = String(row?.fileOriginalName || row?.originalName || '').trim()
  return name || ''
}

const formFileTitle = (row, idx) => {
  const name = resolveFormFileName(row)
  const fid = row?.fileRecordId
  if (name && fid) return `${name}（fileRecordId ${fid}）`
  if (name) return name
  if (fid) return `fileRecordId ${fid}`
  return `第 ${idx + 1} 份`
}

const selectForm = (row) => {
  if (!row?.fileRecordId) return
  activeFileRecordId.value = String(row.fileRecordId)
}

const displayedFormFileTitle = computed(() => {
  const row = displayedForm.value
  if (!row) return ''
  return formFileTitle(row, 0)
})

const displayedFormFileLabel = computed(() => {
  const row = displayedForm.value
  if (!row) return '—'
  const name = resolveFormFileName(row)
  if (name) return name
  return `fileRecordId ${shortFileRecordId(row.fileRecordId)}`
})

function ensureActiveFormSelection() {
  const list = forms.value
  if (!list.length) {
    activeFileRecordId.value = ''
    return
  }
  const cur = String(activeFileRecordId.value || '')
  if (!list.some((f) => String(f.fileRecordId) === cur)) {
    activeFileRecordId.value = String(list[0].fileRecordId || '')
  }
}

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const value = Number(num)
  return Number.isNaN(value) ? '-' : value.toFixed(2)
}

const buildFormPayload = () => ({
  pageNum: formQuery.pageNum,
  pageSize: formQuery.pageSize,
  sortField: formQuery.sortField,
  sortDirection: formQuery.sortDirection,
  projectId: Number(formQuery.projectId),
})

const fetchForms = async () => {
  if (!formQuery.projectId) {
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    return
  }
  formQuery.pageNum = 1
  formsLoading.value = true
  try {
    const res = await queryProjectPartySummaryForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      ElMessage.warning(res.data?.msg || '项目方汇总主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
    await nextTick()
    ensureActiveFormSelection()
  } catch (error) {
    console.error('查询项目方汇总主表失败:', error)
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    ElMessage.error('查询项目方汇总主表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const fetchMoreForms = async () => {
  if (!formQuery.projectId) return
  if (formsLoading.value || formsLoadingMore.value) return
  if (forms.value.length >= formTotal.value) return
  const nextPage = formQuery.pageNum + 1
  formsLoadingMore.value = true
  try {
    const res = await queryProjectPartySummaryForms({
      ...buildFormPayload(),
      pageNum: nextPage,
    })
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '加载更多失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    formTotal.value = parsed.total
    if (parsed.records.length) {
      forms.value = [...forms.value, ...parsed.records]
      formQuery.pageNum = nextPage
    }
  } catch (error) {
    console.error('加载项目方汇总主表失败:', error)
    ElMessage.error('加载更多失败，请稍后重试')
  } finally {
    formsLoadingMore.value = false
  }
}

const openAudit = (row) => {
  partySummaryMainFormDraft.value = buildMainFormDraftFromRow(row)
  currentAuditFileRecordId.value = String(row?.fileRecordId || '')
  currentAuditFile.value = {
    id: row?.fileRecordId,
    fileRecordId: row?.fileRecordId,
    originalName: resolveFormFileName(row) || `项目方实测汇总表-${row?.fileRecordId || '-'}`,
    fileType: 'XLSX',
  }
  auditDialogVisible.value = true
}

const onPartySummaryMainFormSaved = () => {
  fetchForms()
}

watch(
  () => [props.projectId, props.active],
  async ([projectId, active]) => {
    const pid = projectId ? String(projectId) : ''
    formQuery.projectId = pid
    if (!pid) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      return
    }
    if (active) {
      formQuery.pageNum = 1
      activeFileRecordId.value = ''
      await fetchForms()
    }
  },
  { immediate: true }
)
</script>
