<template>
  <div ref="planningTabRef" class="planning-tab workspace-tab-fill workspace-ui-scale">
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
            <span class="planning-hero__eyebrow">规划复核</span>
            <h2 class="planning-hero__title">主表</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="规划复核主表统计">
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
          <el-button
            class="pr-btn pr-btn--ghost"
            size="small"
            :loading="formsLoading"
            @click="fetchForms"
          >
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
          row-key="id"
          :max-height="formsTableHeight"
          scrollbar-always-on
          highlight-current-row
          @row-click="handleFormRowClick"
        >
          <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
          <el-table-column prop="projectName" label="项目名称" min-width="200" fixed="left" show-overflow-tooltip />
          <el-table-column prop="constructionUnit" label="建设单位" min-width="180" show-overflow-tooltip />
          <el-table-column prop="designUnit" label="设计单位" min-width="180" show-overflow-tooltip />
          <el-table-column prop="constructionLocation" label="建设地点" min-width="140" show-overflow-tooltip />
          <el-table-column label="解析状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="Number(row.isParsed) === 1 ? 'success' : 'info'" size="small" effect="light">
                {{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="88" align="center" fixed="right" class-name="col-actions" label-class-name="col-actions">
            <template #default="{ row }">
              <span class="tab-table-row-actions">
                <el-button class="op-btn audit-btn" type="primary" size="small" plain @click.stop="openAudit(row)">
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

    <section
      ref="rowsPanelRef"
      class="rows-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="rowsLoading"
    >
      <header class="planning-hero planning-hero--rows">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap planning-hero__icon-wrap--teal" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Grid /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">明细</span>
            <h2 class="planning-hero__title">规划复核表行</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="规划复核行统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ rows.length }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">
                <template v-if="rowTotal > rows.length">共 {{ rowTotal }} 条（当前展示）</template>
                <template v-else>行数据总数</template>
              </span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="行表操作">
          <el-button
            class="pr-btn pr-btn--ghost"
            size="small"
            :loading="rowsLoading"
            :disabled="!rowQuery.projectId"
            @click="fetchRows"
          >
            <el-icon><Refresh /></el-icon>
            刷新明细
          </el-button>
        </div>
      </header>

      <div ref="rowsTableWrapRef" class="planning-table-wrap">
        <el-table
          ref="rowsTableRef"
          class="project-tab-el-table planning-el-table"
          :data="rows"
          border
          stripe
          row-key="id"
          :max-height="rowsTableHeight"
          scrollbar-always-on
        >
          <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
          <el-table-column prop="engineeringProject" label="工程项目/楼栋" width="160" show-overflow-tooltip />
          <el-table-column label="面积类别" width="180" align="center">
            <template #default="{ row }">{{ areaCategoryTextMap[row.areaCategory] || row.areaCategory || '-' }}</template>
          </el-table-column>
          <el-table-column prop="constructionNature" label="建设性质" width="200" align="center" />
          <el-table-column prop="buildingCount" label="栋数" width="150" align="center" />
          <el-table-column prop="aboveGroundFloors" label="地上层数" width="160" align="center" />
          <el-table-column prop="belowGroundFloors" label="地下层数" width="160" align="center" />
          <el-table-column prop="heightM" label="高度(m)" width="140" align="right">
            <template #default="{ row }">{{ formatNum(row.heightM) }}</template>
          </el-table-column>
          <el-table-column prop="baseAreaM2" label="基底面积(㎡)" width="170" align="right">
            <template #default="{ row }">{{ formatNum(row.baseAreaM2) }}</template>
          </el-table-column>
          <el-table-column prop="totalArea" label="总建筑面积(㎡)" width="180" align="right">
            <template #default="{ row }">{{ formatNum(row.totalArea) }}</template>
          </el-table-column>
          <el-table-column prop="farAboveGround" label="计容地上(㎡)" width="180" align="right">
            <template #default="{ row }">{{ formatNum(row.farAboveGround) }}</template>
          </el-table-column>
          <el-table-column prop="farBelowGround" label="计容地下(㎡)" width="180" align="right">
            <template #default="{ row }">{{ formatNum(row.farBelowGround) }}</template>
          </el-table-column>
        </el-table>

        <div
          v-show="rowsShowXScroll"
          class="planning-table-x-float"
          role="presentation"
          aria-hidden="true"
        >
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--left"
            :class="{ 'is-active': rowsCanScrollLeft }"
          />
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--right"
            :class="{ 'is-active': rowsCanScrollRight }"
          />
          <el-tooltip content="向左" placement="left">
            <el-button
              v-show="rowsCanScrollLeft"
              class="planning-table-x-float__fab planning-table-x-float__fab--left"
              circle
              type="primary"
              aria-label="向左查看更多列"
              @click="rowsScrollBy(-300)"
            >
              <el-icon><DArrowLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="向右" placement="right">
            <el-button
              v-show="rowsCanScrollRight"
              class="planning-table-x-float__fab planning-table-x-float__fab--right"
              circle
              type="primary"
              aria-label="向右查看更多列"
              @click="rowsScrollBy(300)"
            >
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </section>

    <PlanningReviewAuditDialog
      v-model="auditDialogVisible"
      :project-id="currentAuditProjectId"
      :form-data="currentAuditForm"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick, defineAsyncComponent } from 'vue'
import { clampTableBodyHeight, clampMainListTableHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import { ElMessage } from 'element-plus'
import {
  Document,
  Files,
  CircleCheck,
  Warning,
  Refresh,
  DArrowLeft,
  DArrowRight,
  Grid
} from '@element-plus/icons-vue'
import { queryPlanningReviewForms, queryPlanningReviewRows } from '@/services/project.service'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'

const PlanningReviewAuditDialog = defineAsyncComponent(() =>
  import('@/components/project-list/PlanningReviewAuditDialog.vue')
)

/** 主表单次查询上限；行表单次加载上限（避免一次渲染过多行） */
const PLANNING_FORMS_PAGE_SIZE = 500
const PLANNING_ROWS_PAGE_SIZE = 80

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: ''
  },
  active: {
    type: Boolean,
    default: false
  }
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

const formsTableRef = ref(null)
const formsTableWrapRef = ref(null)
const rowsTableRef = ref(null)
const rowsTableWrapRef = ref(null)
const formsTableCap = ref(260)
const rowsTableCap = ref(260)

let planningResizeObserver = null

function measureFormsTableCap() {
  const panel = formsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.planning-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  const cap = Math.max(100, Math.floor(ph - hh - 1))
  formsTableCap.value = cap
}

function measureRowsTableCap() {
  const panel = rowsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.planning-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  const cap = Math.max(100, Math.floor(ph - hh - 1))
  rowsTableCap.value = cap
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

onMounted(() => {
  nextTick(() => {
    measureAllPlanningCaps()
    if (typeof ResizeObserver === 'undefined') return
    planningResizeObserver = new ResizeObserver(() => {
      measureAllPlanningCaps()
    })
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

const {
  showXScrollProxy: formsShowXScroll,
  canScrollLeft: formsCanScrollLeft,
  canScrollRight: formsCanScrollRight,
  scrollTableBy: formsScrollBy
} = useSummaryTableHorizontalScroll(formsTableRef, forms)

const {
  showXScrollProxy: rowsShowXScroll,
  canScrollLeft: rowsCanScrollLeft,
  canScrollRight: rowsCanScrollRight,
  scrollTableBy: rowsScrollBy
} = useSummaryTableHorizontalScroll(rowsTableRef, rows)

const areaCategoryTextMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  OTHER_PENDING: '其他待定'
}

const formQuery = reactive({
  projectId: '',
  sortField: 'updateTime',
  sortDirection: 'desc'
})

const rowQuery = reactive({
  projectId: '',
  fileRecordId: '',
  sortField: 'rowIndex',
  sortDirection: 'asc'
})

const currentAuditProjectId = computed(() => currentAuditForm.value?.projectId || props.projectId)

const activeFormSelectionText = computed(() => {
  if (!activeFileRecordId.value) return '未选择'
  const id = activeFileRecordId.value
  return id.length > 22 ? `${id.slice(0, 22)}…` : id
})

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
  pageNum: 1,
  pageSize: PLANNING_FORMS_PAGE_SIZE,
  sortField: formQuery.sortField,
  sortDirection: formQuery.sortDirection,
  projectId: Number(formQuery.projectId)
})

const buildRowsPayload = () => {
  const payload = {
    pageNum: 1,
    pageSize: PLANNING_ROWS_PAGE_SIZE,
    sortField: rowQuery.sortField,
    sortDirection: rowQuery.sortDirection,
    projectId: Number(rowQuery.projectId)
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

<style scoped>
.planning-tab.workspace-tab-fill {
  display: grid;
  grid-template-rows: minmax(220px, 38%) minmax(260px, 1fr);
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.forms-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rows-panel {
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

.planning-hero__icon-wrap--teal {
  background: linear-gradient(145deg, #14b8a6 0%, #0f766e 100%);
  box-shadow:
    0 8px 18px -10px rgba(15, 118, 110, 0.45),
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

.rows-panel .planning-stat-grid {
  grid-template-columns: minmax(0, 1fr);
  max-width: 220px;
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
}

.forms-panel .planning-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
}

.rows-panel .planning-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
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

@media (max-width: 1320px) {
  .planning-tab.workspace-tab-fill {
    display: flex;
    flex-direction: column;
    height: auto;
    min-height: 0;
  }

  .forms-panel,
  .rows-panel {
    flex: 0 0 auto;
    min-height: 280px;
  }
}
</style>
