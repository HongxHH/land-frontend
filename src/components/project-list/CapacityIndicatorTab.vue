<template>
  <div ref="tabRef" class="capacity-indicator-tab workspace-tab-fill workspace-ui-scale">
    <section
      ref="formsPanelRef"
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <ProjectTabHero
        eyebrow="容量指标核查"
        title="主表"
        :icon="Document"
        stat-grid-label="容量指标核查主表统计"
        actions-label="主表操作"
        :stats="heroStats"
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

      <div ref="formsTableWrapRef" class="planning-table-wrap">
        <el-table
          ref="formsTableRef"
          class="project-tab-el-table planning-el-table capacity-forms-table"
          :data="forms"
          border
          stripe
          row-key="fileRecordId"
          :max-height="formsTableHeight"
          scrollbar-always-on
          highlight-current-row
          empty-text="暂无容量指标核查表数据"
          @row-click="handleFormRowClick"
        >
          <el-table-column
            type="index"
            width="52"
            label="序号"
            align="center"
            fixed="left"
            :resizable="false"
          />
          <el-table-column
            label="核查文件"
            min-width="200"
            align="center"
            fixed="left"
            :resizable="false"
            show-overflow-tooltip
          >
            <template #default="{ row }">
              {{ resolveFormFileName(row) || `fileRecordId ${row.fileRecordId || '-'}` }}
            </template>
          </el-table-column>
          <el-table-column
            label="合计(㎡)"
            min-width="124"
            align="center"
            :resizable="false"
            class-name="col-area"
            label-class-name="col-area"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ formatNum(row.totalArea) }}</template>
          </el-table-column>
          <el-table-column
            label="商业类(㎡)"
            min-width="124"
            align="center"
            :resizable="false"
            class-name="col-area"
            label-class-name="col-area"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ formatNum(row.commercialArea) }}</template>
          </el-table-column>
          <el-table-column
            label="住宅类(㎡)"
            min-width="124"
            align="center"
            :resizable="false"
            class-name="col-area"
            label-class-name="col-area"
            show-overflow-tooltip
          >
            <template #default="{ row }">{{ formatNum(row.residentialArea) }}</template>
          </el-table-column>
          <el-table-column
            label="解析状态"
            min-width="108"
            align="center"
            :resizable="false"
            class-name="col-status"
            label-class-name="col-status"
          >
            <template #default="{ row }">
              <el-tag
                :type="Number(row.isParsed) === 1 ? 'success' : 'info'"
                size="small"
                effect="light"
              >
                {{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="88"
            align="center"
            fixed="right"
            :resizable="false"
            class-name="col-actions"
            label-class-name="col-actions"
          >
            <template #default="{ row }">
              <span class="tab-table-row-actions">
                <el-button
                  class="op-btn audit-btn"
                  type="primary"
                  size="small"
                  plain
                  @click.stop="openAudit(row)"
                >
                  审核
                </el-button>
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div
          v-show="formsShowXScroll"
          class="planning-table-x-float"
          role="presentation"
          aria-hidden="true"
        >
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--left"
            :class="{ 'is-active': formsCanScrollLeft }"
          />
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--right"
            :class="{ 'is-active': formsCanScrollRight }"
          />
          <el-tooltip content="向左" placement="left">
            <el-button
              v-show="formsCanScrollLeft"
              class="planning-table-x-float__fab planning-table-x-float__fab--left"
              circle
              type="primary"
              aria-label="向左查看更多列"
              @click="formsScrollBy(-300)"
            >
              <el-icon><DArrowLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="向右" placement="right">
            <el-button
              v-show="formsCanScrollRight"
              class="planning-table-x-float__fab planning-table-x-float__fab--right"
              circle
              type="primary"
              aria-label="向右查看更多列"
              @click="formsScrollBy(300)"
            >
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </section>

    <CapacityIndicatorAuditDialog
      v-model="auditDialogVisible"
      :project-id="projectId"
      :file-record-id="currentAuditFileRecordId"
      :initial-file="currentAuditFile"
      :main-form-draft="capacityMainFormDraft"
      @main-form-saved="onMainFormSaved"
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
import { Document, Files, Refresh, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { queryCapacityIndicatorForms } from '@/services/project.service'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'
import '@/styles/planning-review-tab.css'

const CapacityIndicatorAuditDialog = defineAsyncComponent(
  () => import('@/components/project-list/CapacityIndicatorAuditDialog.vue')
)

const CAPACITY_FORMS_PAGE_SIZE = 500

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false },
})

const formsLoading = ref(false)
const forms = ref([])
const formTotal = ref(0)

const auditDialogVisible = ref(false)
const currentAuditFileRecordId = ref('')
const currentAuditFile = ref(null)
const activeFileRecordId = ref('')
const capacityMainFormDraft = ref(null)

const tabRef = ref(null)
const formsPanelRef = ref(null)
const formsTableRef = ref(null)
const formsTableWrapRef = ref(null)
const formsTableCap = ref(260)

let tabResizeObserver = null

const formQuery = reactive({
  pageNum: 1,
  pageSize: CAPACITY_FORMS_PAGE_SIZE,
  sortField: 'updateTime',
  sortDirection: 'desc',
  projectId: '',
})

function measureFormsTableCap() {
  const panel = formsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.project-tab-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  formsTableCap.value = Math.max(100, Math.floor(ph - hh - 1))
}

const formsTableHeight = computed(() => {
  const rowCount = forms.value.length
  if (!rowCount) return clampTableBodyHeight(formsTableCap.value, 0)
  const panelBased = clampTableBodyHeight(formsTableCap.value, rowCount)
  const mainList = clampMainListTableHeight(rowCount)
  // 取较大值，避免表头估算偏小时把数据行裁到表头下方不可见
  return Math.min(formsTableCap.value, Math.max(panelBased, mainList))
})

const {
  showXScrollProxy: formsShowXScroll,
  canScrollLeft: formsCanScrollLeft,
  canScrollRight: formsCanScrollRight,
  scrollTableBy: formsScrollBy,
} = useSummaryTableHorizontalScroll(formsTableRef, forms)

onMounted(() => {
  nextTick(() => {
    measureFormsTableCap()
    if (typeof ResizeObserver === 'undefined') return
    tabResizeObserver = new ResizeObserver(() => {
      measureFormsTableCap()
    })
    if (tabRef.value) tabResizeObserver.observe(tabRef.value)
  })
})

onBeforeUnmount(() => {
  tabResizeObserver?.disconnect()
  tabResizeObserver = null
})

watch(
  () => forms.value.length,
  () => {
    nextTick(measureFormsTableCap)
  }
)

const buildMainFormDraftFromRow = (row) => ({
  id: row?.id ?? null,
  isParsed: row?.isParsed ?? null,
  totalArea: row?.totalArea ?? null,
  commercialArea: row?.commercialArea ?? null,
  residentialArea: row?.residentialArea ?? null,
  remark: row?.remark || '',
})

const displayedForm = computed(() => {
  const list = forms.value
  if (!list.length) return null
  const id = String(activeFileRecordId.value || '')
  if (!id) return list[0]
  return list.find((f) => String(f.fileRecordId) === id) || list[0]
})

const resolveFormFileName = (row) => String(row?.fileOriginalName || row?.originalName || '').trim()

const activeFormSelectionText = computed(() => {
  const list = forms.value
  if (!list.length) return '暂无主表'
  const row = displayedForm.value
  const name = resolveFormFileName(row)
  if (list.length === 1 && formTotal.value <= 1) {
    return name || '本项 1 份核查表'
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

const heroStats = computed(() => [
  { variant: 'slate', icon: Files, value: formTotal.value, unit: '条', label: '主表总数' },
  {
    variant: activeFileRecordId.value ? 'teal' : 'amber',
    status: activeFileRecordId.value ? 'ok' : 'warn',
    pick: activeFormSelectionText.value,
    wide: true,
    label: '当前主表',
  },
])

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
    const res = await queryCapacityIndicatorForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      ElMessage.warning(res.data?.msg || '容量指标核查表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
    await nextTick()
    ensureActiveFormSelection()
    syncTableCurrentRow()
  } catch (error) {
    console.error('查询容量指标核查表失败:', error)
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    ElMessage.error('查询容量指标核查表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

function syncTableCurrentRow() {
  nextTick(() => {
    const table = formsTableRef.value
    const row = displayedForm.value
    if (!table || !row) return
    table.setCurrentRow(row)
  })
}

const handleFormRowClick = (row) => {
  if (!row?.fileRecordId) return
  activeFileRecordId.value = String(row.fileRecordId)
}

const openAudit = (row) => {
  capacityMainFormDraft.value = buildMainFormDraftFromRow(row)
  currentAuditFileRecordId.value = String(row?.fileRecordId || '')
  currentAuditFile.value = {
    id: row?.fileRecordId,
    fileRecordId: row?.fileRecordId,
    originalName: resolveFormFileName(row) || `容量指标核查表-${row?.fileRecordId || '-'}`,
  }
  auditDialogVisible.value = true
}

const onMainFormSaved = () => {
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

<style scoped>
@import '@/styles/project-tab-tables.css';

.capacity-indicator-tab.workspace-tab-fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 12px;
}

.forms-panel {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

:deep(.planning-el-table th.el-table__cell .cell),
:deep(.planning-el-table td.el-table__cell .cell) {
  text-align: center;
}

:deep(.capacity-forms-table th.el-table__cell > .cell) {
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.capacity-forms-table td.el-table__cell.col-area > .cell),
:deep(.capacity-forms-table th.el-table__cell.col-area > .cell) {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

:deep(.capacity-forms-table td.el-table__cell.col-status > .cell),
:deep(.capacity-forms-table th.el-table__cell.col-status > .cell) {
  white-space: nowrap;
}

:deep(.capacity-forms-table td.el-table__cell.col-actions > .cell) {
  overflow: visible;
  text-overflow: clip;
}

:deep(.planning-el-table th.el-table__cell.is-center.el-table-fixed-column--left .cell),
:deep(.planning-el-table td.el-table__cell.is-center.el-table-fixed-column--left .cell),
:deep(.planning-el-table th.el-table__cell.is-center.el-table-fixed-column--right .cell),
:deep(.planning-el-table td.el-table__cell.is-center.el-table-fixed-column--right .cell) {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
