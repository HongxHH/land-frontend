<template>
  <div ref="auditTabRef" class="audit-tab workspace-tab-fill workspace-ui-scale">
    <section
      ref="auditPanelRef"
      class="audit-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="loading"
    >
      <header class="planning-hero">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Document /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">操作审计</span>
            <h2 class="planning-hero__title">审计日志</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="审计日志统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ total }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">日志总数</span>
            </div>
          </div>
          <div
            class="planning-stat-tile"
            :class="logs.length ? 'planning-stat-tile--teal' : 'planning-stat-tile--amber'"
          >
            <div class="planning-stat-tile__icon">
              <el-icon><CircleCheck v-if="logs.length" /><Warning v-else /></el-icon>
            </div>
            <div class="planning-stat-tile__text planning-stat-tile__text--wide">
              <div class="planning-stat-tile__line planning-stat-tile__line--single">
                <span class="planning-stat-tile__pick">当前页 {{ logs.length }} 条</span>
              </div>
              <span class="planning-stat-tile__label">分页结果</span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="日志操作">
          <el-button class="pr-btn pr-btn--ghost" size="small" :loading="loading" @click="fetchLogs">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </header>

      <div ref="filterPanelRef" class="audit-filter-panel">
        <div class="audit-filter-row">
          <el-input
            v-model.trim="queryForm.operatorName"
            class="audit-filter-item"
            placeholder="操作人"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-select v-model="queryForm.operation" class="audit-filter-item" placeholder="操作类型" clearable>
            <el-option v-for="item in operationOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="queryForm.targetType" class="audit-filter-item" placeholder="目标类型" clearable>
            <el-option v-for="item in targetTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input
            v-model.trim="queryForm.targetId"
            class="audit-filter-item"
            placeholder="目标ID"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-date-picker
            v-model="queryForm.operateTimeRange"
            class="audit-filter-item"
            type="datetimerange"
            value-format="YYYY-MM-DDTHH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            range-separator="至"
          />
        </div>
        <div class="audit-filter-actions">
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button :icon="Refresh" @click="fetchLogs">刷新</el-button>
        </div>
      </div>

      <div ref="tableWrapRef" class="planning-table-wrap">
        <el-table
          ref="auditTableRef"
          class="project-tab-el-table planning-el-table"
          :data="logs"
          border
          stripe
          row-key="id"
          :max-height="tableHeight"
          scrollbar-always-on
        >
          <el-table-column :resizable="false" type="index" label="序号" width="72" align="center" :index="(idx) => idx + 1" />
          <el-table-column :resizable="false" prop="operatorName" label="操作人" width="160" align="center" show-overflow-tooltip>
            <template #default="{ row }">{{ row.operatorName || '-' }}</template>
          </el-table-column>
          <el-table-column :resizable="false" prop="operateTime" label="操作时间" width="200" align="center">
            <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
          </el-table-column>
          <el-table-column :resizable="false" prop="operation" label="操作类型" width="140" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ getOperationLabel(row.operation) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column :resizable="false" prop="targetType" label="目标类型" width="150" align="center">
            <template #default="{ row }">{{ getTargetTypeLabel(row.targetType) }}</template>
          </el-table-column>
          <el-table-column :resizable="false" prop="targetId" label="目标ID" width="140" align="center" show-overflow-tooltip />
          <el-table-column :resizable="false" prop="changeSummary" label="行为" min-width="280" show-overflow-tooltip>
            <template #default="{ row }">{{ formatAuditChangeSummary(row.changeSummary, row.operation) }}</template>
          </el-table-column>
          <el-table-column :resizable="false" label="详情" width="88" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-if="!loading && projectId && logs.length === 0"
          description="暂无审计日志，可调整筛选条件或点击刷新"
          :image-size="80"
          class="audit-empty"
        />

        <div
          v-show="showXScrollProxy"
          class="planning-table-x-float"
          role="presentation"
          aria-hidden="true"
        >
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--left"
            :class="{ 'is-active': canScrollLeft }"
          />
          <div
            class="planning-table-x-float__edge planning-table-x-float__edge--right"
            :class="{ 'is-active': canScrollRight }"
          />
          <el-tooltip content="向左" placement="left">
            <el-button
              v-show="canScrollLeft"
              class="planning-table-x-float__fab planning-table-x-float__fab--left"
              circle
              type="primary"
              aria-label="向左查看更多列"
              @click="scrollTableBy(-300)"
            >
              <el-icon><DArrowLeft /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="向右" placement="right">
            <el-button
              v-show="canScrollRight"
              class="planning-table-x-float__fab planning-table-x-float__fab--right"
              circle
              type="primary"
              aria-label="向右查看更多列"
              @click="scrollTableBy(300)"
            >
              <el-icon><DArrowRight /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div ref="pagerRef" class="audit-pager">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="queryForm.pageSize"
          :current-page="queryForm.pageNum"
          :page-sizes="[10, 20, 50, 100]"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </section>

    <el-dialog v-model="detailVisible" title="审计日志详情" width="640px" destroy-on-close append-to-body>
      <dl v-if="detailRow" class="audit-detail-list">
        <div class="audit-detail-item">
          <dt>操作人</dt>
          <dd>{{ detailRow.operatorName || '-' }}</dd>
        </div>
        <div class="audit-detail-item">
          <dt>操作时间</dt>
          <dd>{{ formatDateTime(detailRow.operateTime) }}</dd>
        </div>
        <div class="audit-detail-item">
          <dt>操作类型</dt>
          <dd>{{ getOperationLabel(detailRow.operation) }}</dd>
        </div>
        <div class="audit-detail-item">
          <dt>目标</dt>
          <dd>{{ getTargetTypeLabel(detailRow.targetType) }} / {{ detailRow.targetId || '-' }}</dd>
        </div>
        <div class="audit-detail-item audit-detail-item--block">
          <dt>行为摘要</dt>
          <dd>{{ formatAuditChangeSummary(detailRow.changeSummary, detailRow.operation) }}</dd>
        </div>
        <div class="audit-detail-item audit-detail-item--block">
          <dt>变更详情</dt>
          <dd class="audit-detail-pre">{{ formatAuditChangeDetail(detailRow.changeSummary, detailRow.operation) }}</dd>
        </div>
      </dl>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
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
import { clampTableBodyHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import { queryOperationAuditLogs } from '@/services/project.service'
import {
  formatAuditChangeDetail,
  formatAuditChangeSummary,
  getOperationLabel,
  getTargetTypeLabel,
  OPERATION_LABELS,
  TARGET_TYPE_LABELS
} from '@/utils/auditLogFormatter.js'

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

const operationOptions = Object.entries(OPERATION_LABELS).map(([value, label]) => ({ label, value }))

const targetTypeOptions = Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({ label, value }))

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const detailVisible = ref(false)
const detailRow = ref(null)

const queryForm = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'operateTime',
  sortDirection: 'desc',
  operatorName: '',
  operation: '',
  targetType: '',
  projectId: '',
  targetId: '',
  operateTimeRange: []
})

const auditTabRef = ref(null)
const auditPanelRef = ref(null)
const filterPanelRef = ref(null)
const pagerRef = ref(null)
const auditTableRef = ref(null)
const tableWrapRef = ref(null)
const tableCap = ref(320)
let auditResizeObserver = null

function measureTableCap() {
  const panel = auditPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.planning-hero')
  const filter = filterPanelRef.value
  const pager = pagerRef.value
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  const fh = filter ? filter.getBoundingClientRect().height : 0
  const pg = pager ? pager.getBoundingClientRect().height : 0
  const cap = Math.max(120, Math.floor(ph - hh - fh - pg - 1))
  tableCap.value = cap
}

const tableHeight = computed(() => clampTableBodyHeight(tableCap.value, logs.value.length))

const {
  showXScrollProxy,
  canScrollLeft,
  canScrollRight,
  scrollTableBy
} = useSummaryTableHorizontalScroll(auditTableRef, logs)

onMounted(() => {
  nextTick(() => {
    measureTableCap()
    if (typeof ResizeObserver === 'undefined') return
    auditResizeObserver = new ResizeObserver(() => measureTableCap())
    if (auditTabRef.value) auditResizeObserver.observe(auditTabRef.value)
  })
})

onBeforeUnmount(() => {
  auditResizeObserver?.disconnect()
  auditResizeObserver = null
})

watch([() => logs.value.length, () => queryForm.pageNum, () => queryForm.pageSize], () => {
  nextTick(measureTableCap)
})

const normalizeResult = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

const openDetail = (row) => {
  detailRow.value = row
  detailVisible.value = true
}

const buildPayload = () => {
  const payload = {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    sortField: queryForm.sortField,
    sortDirection: queryForm.sortDirection
  }
  if (queryForm.operatorName) payload.operatorName = queryForm.operatorName
  if (queryForm.operation) payload.operation = queryForm.operation
  if (queryForm.targetType) payload.targetType = queryForm.targetType
  if (queryForm.projectId) payload.projectId = Number(queryForm.projectId)
  if (queryForm.targetId) payload.targetId = queryForm.targetId
  if (Array.isArray(queryForm.operateTimeRange) && queryForm.operateTimeRange.length === 2) {
    payload.operateTimeStart = queryForm.operateTimeRange[0]
    payload.operateTimeEnd = queryForm.operateTimeRange[1]
  }
  return payload
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const res = await queryOperationAuditLogs(buildPayload())
    if (res.data?.code !== 200) {
      logs.value = []
      total.value = 0
      ElMessage.warning(res.data?.msg || '审计日志查询失败')
      return
    }
    const parsed = normalizeResult(res.data?.data)
    logs.value = parsed.records
    total.value = parsed.total
  } catch (error) {
    console.error('查询审计日志失败:', error)
    logs.value = []
    total.value = 0
    ElMessage.error('查询审计日志失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryForm.pageNum = 1
  fetchLogs()
}

const handleReset = () => {
  queryForm.pageNum = 1
  queryForm.pageSize = 20
  queryForm.operatorName = ''
  queryForm.operation = ''
  queryForm.targetType = ''
  queryForm.targetId = ''
  queryForm.operateTimeRange = []
  queryForm.projectId = props.projectId ? String(props.projectId) : ''
  fetchLogs()
}

const handleSizeChange = (size) => {
  queryForm.pageSize = size
  queryForm.pageNum = 1
  fetchLogs()
}

const handlePageChange = (page) => {
  queryForm.pageNum = page
  fetchLogs()
}

watch(
  () => [props.projectId, props.active],
  ([projectId, active]) => {
    queryForm.projectId = projectId ? String(projectId) : ''
    if (active) {
      queryForm.pageNum = 1
      fetchLogs()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.audit-tab {
  gap: 12px;
}

.audit-panel {
  flex: 1 1 auto;
  min-height: 0;
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

.audit-filter-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(248, 250, 252, 0.8);
}

.audit-filter-row {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1.35fr;
  gap: 10px;
  align-items: center;
}

.audit-filter-item {
  width: 100%;
}

.audit-filter-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

:deep(.audit-filter-actions .el-button) {
  min-width: 76px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
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

.audit-pager {
  flex-shrink: 0;
  padding: 8px 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(248, 250, 252, 0.85);
  display: flex;
  justify-content: flex-end;
}

:deep(.planning-el-table.el-table) {
  --el-table-header-bg-color: #f8fafc;
  --el-table-header-text-color: #334155;
}

:deep(.planning-el-table .el-table__header th) {
  font-weight: 700;
  font-size: 12px;
}

:deep(.audit-pager .el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.audit-pager .el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

.audit-detail-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-detail-item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px 12px;
  align-items: start;
}

.audit-detail-item dt {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.audit-detail-item dd {
  margin: 0;
  font-size: 13px;
  color: #0f172a;
  word-break: break-word;
}

.audit-detail-item--block {
  grid-template-columns: 1fr;
}

.audit-detail-item--block dt {
  margin-bottom: 4px;
}

.audit-detail-pre {
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.6;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

@media (max-width: 1320px) {
  .audit-tab {
    height: auto;
    min-height: 0;
  }

  .planning-stat-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .planning-hero__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .audit-filter-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .audit-filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .audit-filter-actions {
    justify-content: flex-end;
  }
}
</style>
