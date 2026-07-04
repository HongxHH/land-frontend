<template>
  <div ref="planningTabRef" class="planning-tab workspace-tab-fill workspace-ui-scale">
    <section
      ref="formsPanelRef"
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <ProjectTabHero
        eyebrow="规划复核"
        title="主表"
        :icon="Document"
        stat-grid-label="规划复核主表统计"
        actions-label="主表操作"
        :stats="formsHeroStats"
      >
        <template #actions>
          <el-button
            class="project-tab-hero__btn project-tab-hero__btn--ghost"
            size="small"
            :loading="formsLoading"
            @click="fetchForms"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </template>
      </ProjectTabHero>

      <PlanningReviewFormsBody
        :forms="forms"
        :table-height="formsTableHeight"
        @row-click="handleFormRowClick"
        @audit="openAudit"
      />
    </section>

    <section
      ref="rowsPanelRef"
      class="rows-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="rowsLoading"
    >
      <ProjectTabHero
        eyebrow="明细"
        title="规划复核表行"
        :icon="Grid"
        icon-tone="teal"
        stat-grid-label="规划复核行统计"
        actions-label="行表操作"
        stat-layout="single"
        :stats="rowsHeroStats"
      >
        <template #actions>
          <el-button
            class="project-tab-hero__btn project-tab-hero__btn--ghost"
            size="small"
            :loading="rowsLoading"
            :disabled="!rowQuery.projectId"
            @click="fetchRows"
          >
            <el-icon><Refresh /></el-icon>
            刷新明细
          </el-button>
        </template>
      </ProjectTabHero>

      <PlanningReviewRowsBody :rows="rows" :table-height="rowsTableHeight" />
    </section>

    <PlanningReviewAuditDialog
      v-model="auditDialogVisible"
      :project-id="currentAuditProjectId"
      :form-data="currentAuditForm"
    />
  </div>
</template>

<script setup>
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  defineAsyncComponent,
} from 'vue'
import {
  clampTableBodyHeight,
  clampMainListTableHeight,
} from '@/composables/project-list/useElTableHeightClamp.js'
import { ElMessage } from 'element-plus'
import { Document, Files, Refresh, Grid } from '@element-plus/icons-vue'
import { queryPlanningReviewForms, queryPlanningReviewRows } from '@/services/project.service'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'
import PlanningReviewFormsBody from '@/components/project-list/PlanningReviewFormsBody.vue'
import PlanningReviewRowsBody from '@/components/project-list/PlanningReviewRowsBody.vue'
import '@/styles/planning-review-tab.css'

const PlanningReviewAuditDialog = defineAsyncComponent(
  () => import('@/components/project-list/PlanningReviewAuditDialog.vue')
)

const PLANNING_FORMS_PAGE_SIZE = 500
const PLANNING_ROWS_PAGE_SIZE = 80

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: '',
  },
  active: {
    type: Boolean,
    default: false,
  },
})

const formsLoading = ref(false)
const rowsLoading = ref(false)
const forms = ref([])
const rows = ref([])
const formTotal = ref(0)
const rowTotal = ref(0)
const auditDialogVisible = ref(false)
const currentAuditForm = ref(null)
const activeFileRecordId = ref('')

const planningTabRef = ref(null)
const formsPanelRef = ref(null)
const rowsPanelRef = ref(null)
const formsTableCap = ref(260)
const rowsTableCap = ref(260)

let planningResizeObserver = null

function measureFormsTableCap() {
  const panel = formsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.project-tab-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  formsTableCap.value = Math.max(100, Math.floor(ph - hh - 1))
}

function measureRowsTableCap() {
  const panel = rowsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.project-tab-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  rowsTableCap.value = Math.max(100, Math.floor(ph - hh - 1))
}

function measureAllPlanningCaps() {
  measureFormsTableCap()
  measureRowsTableCap()
}

const formsTableHeight = computed(() => {
  const rowCount = forms.value.length
  if (!rowCount) return clampTableBodyHeight(formsTableCap.value, 0)
  const panelBased = clampTableBodyHeight(formsTableCap.value, rowCount)
  const mainList = clampMainListTableHeight(rowCount)
  return Math.min(formsTableCap.value, Math.max(panelBased, mainList))
})
const rowsTableHeight = computed(() => clampTableBodyHeight(rowsTableCap.value, rows.value.length))

const activeFormSelectionText = computed(() => {
  if (!activeFileRecordId.value) return '未选择'
  const id = activeFileRecordId.value
  return id.length > 22 ? `${id.slice(0, 22)}…` : id
})

const formsHeroStats = computed(() => [
  { variant: 'slate', icon: Files, value: formTotal.value, unit: '条', label: '主表总数' },
  {
    variant: activeFileRecordId.value ? 'teal' : 'amber',
    status: activeFileRecordId.value ? 'ok' : 'warn',
    pick: activeFormSelectionText.value,
    wide: true,
    label: '当前主表',
  },
])

const rowsHeroStats = computed(() => [
  {
    variant: 'slate',
    icon: Files,
    value: rows.value.length,
    unit: '条',
    label:
      rowTotal.value > rows.value.length ? `共 ${rowTotal.value} 条（当前展示）` : '行数据总数',
  },
])

const currentAuditProjectId = computed(() => currentAuditForm.value?.projectId || props.projectId)

onMounted(() => {
  nextTick(() => {
    measureAllPlanningCaps()
    if (typeof ResizeObserver === 'undefined') return
    planningResizeObserver = new ResizeObserver(() => measureAllPlanningCaps())
    if (planningTabRef.value) planningResizeObserver.observe(planningTabRef.value)
  })
})

onBeforeUnmount(() => {
  planningResizeObserver?.disconnect()
  planningResizeObserver = null
})

watch([() => forms.value.length, () => rows.value.length], () => {
  nextTick(measureAllPlanningCaps)
})

const formQuery = reactive({
  projectId: '',
  sortField: 'updateTime',
  sortDirection: 'desc',
})

const rowQuery = reactive({
  projectId: '',
  fileRecordId: '',
  sortField: 'rowIndex',
  sortDirection: 'asc',
})

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const buildFormPayload = () => ({
  pageNum: 1,
  pageSize: PLANNING_FORMS_PAGE_SIZE,
  sortField: formQuery.sortField,
  sortDirection: formQuery.sortDirection,
  projectId: Number(formQuery.projectId),
})

const buildRowsPayload = () => {
  const payload = {
    pageNum: 1,
    pageSize: PLANNING_ROWS_PAGE_SIZE,
    sortField: rowQuery.sortField,
    sortDirection: rowQuery.sortDirection,
    projectId: Number(rowQuery.projectId),
  }
  if (rowQuery.fileRecordId) payload.fileRecordId = Number(rowQuery.fileRecordId)
  return payload
}

const fetchForms = async () => {
  if (!formQuery.projectId) {
    forms.value = []
    formTotal.value = 0
    return
  }
  formsLoading.value = true
  try {
    const res = await queryPlanningReviewForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      ElMessage.warning(res.data?.msg || '规划复核主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
  } catch (error) {
    console.error('查询规划复核主表失败:', error)
    forms.value = []
    formTotal.value = 0
    ElMessage.error('查询规划复核主表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const fetchRows = async () => {
  if (!rowQuery.projectId) {
    rows.value = []
    rowTotal.value = 0
    return
  }
  rowsLoading.value = true
  try {
    const res = await queryPlanningReviewRows(buildRowsPayload())
    if (res.data?.code !== 200) {
      rows.value = []
      rowTotal.value = 0
      ElMessage.warning(res.data?.msg || '规划复核表行查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    rows.value = parsed.records
    rowTotal.value = parsed.total
  } catch (error) {
    console.error('查询规划复核表行失败:', error)
    rows.value = []
    rowTotal.value = 0
    ElMessage.error('查询规划复核表行失败，请稍后重试')
  } finally {
    rowsLoading.value = false
  }
}

const handleFormRowClick = (row) => {
  activeFileRecordId.value = String(row?.fileRecordId || '')
  rowQuery.fileRecordId = activeFileRecordId.value
  fetchRows()
}

const openAudit = (row) => {
  currentAuditForm.value = row
  auditDialogVisible.value = true
}

watch(
  () => [props.projectId, props.active],
  async ([projectId, active]) => {
    const pid = projectId ? String(projectId) : ''
    formQuery.projectId = pid
    rowQuery.projectId = pid
    if (!pid) {
      forms.value = []
      formTotal.value = 0
      rows.value = []
      rowTotal.value = 0
      return
    }
    if (active) {
      rowQuery.fileRecordId = ''
      activeFileRecordId.value = ''
      await Promise.all([fetchForms(), fetchRows()])
    }
  },
  { immediate: true }
)
</script>
