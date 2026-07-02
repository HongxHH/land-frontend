<template>
  <div ref="tabRef" class="capacity-indicator-tab workspace-tab-fill workspace-ui-scale">
    <section
      ref="formsPanelRef"
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <header class="planning-hero">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Document /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">容量指标核查</span>
            <h2 class="planning-hero__title">主表</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="容量指标核查主表统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ formTotal }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">主表总数</span>
            </div>
          </div>
          <div
            class="planning-stat-tile"
            :class="activeFileRecordId ? 'planning-stat-tile--teal' : 'planning-stat-tile--amber'"
          >
            <div class="planning-stat-tile__icon">
              <el-icon><CircleCheck v-if="activeFileRecordId" /><Warning v-else /></el-icon>
            </div>
            <div class="planning-stat-tile__text planning-stat-tile__text--wide">
              <div class="planning-stat-tile__line planning-stat-tile__line--single">
                <span class="planning-stat-tile__pick">{{ activeFormSelectionText }}</span>
              </div>
              <span class="planning-stat-tile__label">当前主表</span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="主表操作">
          <el-button class="pr-btn pr-btn--ghost" size="small" :loading="formsLoading" @click="fetchForms">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </header>

      <div ref="formsTableWrapRef" class="planning-table-wrap">
        <el-table
          ref="formsTableRef"
          class="project-tab-el-table planning-el-table"
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
          <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
          <el-table-column label="核查文件" min-width="220" align="center" fixed="left" show-overflow-tooltip>
            <template #default="{ row }">
              {{ resolveFormFileName(row) || `fileRecordId ${row.fileRecordId || '-'}` }}
            </template>
          </el-table-column>
          <el-table-column label="合计(㎡)" min-width="140" align="center">
            <template #default="{ row }">{{ formatNum(row.totalArea) }}</template>
          </el-table-column>
          <el-table-column label="商业类(㎡)" min-width="140" align="center">
            <template #default="{ row }">{{ formatNum(row.commercialArea) }}</template>
          </el-table-column>
          <el-table-column label="住宅类(㎡)" min-width="140" align="center">
            <template #default="{ row }">{{ formatNum(row.residentialArea) }}</template>
          </el-table-column>
          <el-table-column label="解析状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="Number(row.isParsed) === 1 ? 'success' : 'info'" size="small" effect="light">
                {{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="88"
            align="center"
            fixed="right"
            class-name="col-actions"
            label-class-name="col-actions"
          >
            <template #default="{ row }">
              <span class="tab-table-row-actions">
                <el-button class="op-btn audit-btn" type="primary" size="small" plain @click.stop="openAudit(row)">
                  审核
                </el-button>
              </span>
            </template>
          </el-table-column>
        </el-table>

        <div v-show="formsShowXScroll" class="planning-table-x-float" role="presentation" aria-hidden="true">
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
  defineAsyncComponent
} from 'vue'
import { clampTableBodyHeight, clampMainListTableHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import { ElMessage } from 'element-plus'
import {
  Document,
  Files,
  CircleCheck,
  Warning,
  Refresh,
  DArrowLeft,
  DArrowRight
} from '@element-plus/icons-vue'
import { queryCapacityIndicatorForms } from '@/services/project.service'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'

const CapacityIndicatorAuditDialog = defineAsyncComponent(() =>
  import('@/components/project-list/CapacityIndicatorAuditDialog.vue')
)

const CAPACITY_FORMS_PAGE_SIZE = 500

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false }
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
  projectId: ''
})

function measureFormsTableCap() {
  const panel = formsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.planning-hero')
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
  scrollTableBy: formsScrollBy
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
  remark: row?.remark || ''
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
  projectId: Number(formQuery.projectId)
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
    originalName: resolveFormFileName(row) || `容量指标核查表-${row?.fileRecordId || '-'}`
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

.planning-panel--modern.project-tab-panel {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 40px -22px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.planning-hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.92) 45%, rgba(241, 245, 249, 0.88) 100%);
  flex-shrink: 0;
  min-height: 64px;
  box-sizing: border-box;
}

.planning-hero::after {
  content: '';
  position: absolute;
  right: -16%;
  top: -50%;
  width: 40%;
  height: 180%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.08), transparent 72%);
  pointer-events: none;
}

.planning-hero__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 200px;
  min-width: 0;
  z-index: 1;
}

.planning-hero__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow:
    0 8px 18px -10px rgba(29, 78, 216, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.planning-hero__icon {
  font-size: 21px;
  color: #fff;
}

.planning-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.planning-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.planning-stat-grid {
  position: relative;
  z-index: 1;
  flex: 1 1 260px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.planning-stat-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.planning-stat-tile--slate .planning-stat-tile__icon {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.planning-stat-tile--teal .planning-stat-tile__icon {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.planning-stat-tile--amber .planning-stat-tile__icon {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.planning-stat-tile__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.planning-stat-tile__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.planning-stat-tile__text--wide {
  flex: 1;
}

.planning-stat-tile__line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1.1;
}

.planning-stat-tile__line--single {
  width: 100%;
}

.planning-stat-tile__value {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.planning-stat-tile__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.planning-stat-tile__pick {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.planning-stat-tile__label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.planning-hero__actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.pr-btn {
  width: auto;
  min-width: 104px;
  justify-content: center;
  border-radius: 9px;
  font-weight: 600;
}

:deep(.pr-btn--ghost) {
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
}

:deep(.pr-btn--ghost:hover) {
  border-color: #94a3b8;
  background: #fff;
  color: #0f172a;
}

.planning-table-wrap {
  position: relative;
  min-height: 0;
  padding: 0;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 1 auto;
}

.planning-table-x-float {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.planning-table-x-float__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.planning-table-x-float__edge--left {
  left: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent);
}

.planning-table-x-float__edge--right {
  right: 0;
  background: linear-gradient(270deg, rgba(15, 23, 42, 0.06), transparent);
}

.planning-table-x-float__edge.is-active {
  opacity: 1;
}

.planning-table-x-float__fab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  box-shadow: 0 8px 24px -8px rgba(29, 78, 216, 0.55);
  border: none;
}

.planning-table-x-float__fab--left {
  left: 6px;
}

.planning-table-x-float__fab--right {
  right: 6px;
}

:deep(.planning-el-table.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #334155;
}

:deep(.planning-el-table th.el-table__cell) {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
  font-weight: 700;
  color: #334155;
}

:deep(.planning-el-table th.el-table__cell .cell),
:deep(.planning-el-table td.el-table__cell .cell) {
  text-align: center;
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
