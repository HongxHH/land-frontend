<template>
  <div ref="auditTabRef" class="audit-tab workspace-tab-fill workspace-ui-scale">
    <section
      ref="auditPanelRef"
      class="audit-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="loading"
    >
      <ProjectTabHero
        eyebrow="操作审计"
        title="审计日志"
        :icon="Document"
        stat-grid-label="审计日志统计"
        actions-label="日志操作"
        :stats="heroStats"
      >
        <template #actions>
          <el-button
            class="project-tab-hero__btn project-tab-hero__btn--ghost"
            size="small"
            :loading="loading"
            @click="fetchLogs"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </template>
      </ProjectTabHero>

      <div ref="filterPanelRef" class="audit-filter-panel">
        <div class="audit-filter-row">
          <el-input
            v-model.trim="queryForm.operatorName"
            class="audit-filter-item"
            placeholder="操作人"
            clearable
            @keyup.enter="handleSearch"
          />
          <el-select
            v-model="queryForm.operation"
            class="audit-filter-item"
            placeholder="操作类型"
            clearable
          >
            <el-option
              v-for="item in operationOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select
            v-model="queryForm.targetType"
            class="audit-filter-item"
            placeholder="目标类型"
            clearable
          >
            <el-option
              v-for="item in targetTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
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

      <OperationAuditBody
        ref="auditBodyRef"
        :loading="loading"
        :logs="logs"
        :total="total"
        :table-height="tableHeight"
        :page-num="queryForm.pageNum"
        :page-size="queryForm.pageSize"
        :project-id="projectId"
        v-model:detail-visible="detailVisible"
        :detail-row="detailRow"
        @size-change="handleSizeChange"
        @page-change="handlePageChange"
        @open-detail="openDetail"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Files, Refresh } from '@element-plus/icons-vue'
import { clampTableBodyHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import { queryOperationAuditLogs } from '@/services/project.service'
import { OPERATION_LABELS, TARGET_TYPE_LABELS } from '@/utils/auditLogFormatter.js'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'
import OperationAuditBody from '@/components/project-list/OperationAuditBody.vue'
import '@/styles/operation-audit-tab.css'

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

const operationOptions = Object.entries(OPERATION_LABELS).map(([value, label]) => ({
  label,
  value,
}))
const targetTypeOptions = Object.entries(TARGET_TYPE_LABELS).map(([value, label]) => ({
  label,
  value,
}))

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
  operateTimeRange: [],
})

const auditTabRef = ref(null)
const auditPanelRef = ref(null)
const filterPanelRef = ref(null)
const auditBodyRef = ref(null)
const tableCap = ref(320)
let auditResizeObserver = null

function measureTableCap() {
  const panel = auditPanelRef.value
  const body = auditBodyRef.value
  if (!panel) return
  const hero = panel.querySelector('.project-tab-hero')
  const filter = filterPanelRef.value
  const pager = body?.pagerRef?.value ?? body?.pagerRef
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  const fh = filter ? filter.getBoundingClientRect().height : 0
  const pg = pager ? pager.getBoundingClientRect().height : 0
  tableCap.value = Math.max(120, Math.floor(ph - hh - fh - pg - 1))
}

const tableHeight = computed(() => clampTableBodyHeight(tableCap.value, logs.value.length))

const heroStats = computed(() => [
  { variant: 'slate', icon: Files, value: total.value, unit: '条', label: '日志总数' },
  {
    variant: logs.value.length ? 'teal' : 'amber',
    status: logs.value.length ? 'ok' : 'warn',
    pick: `当前页 ${logs.value.length} 条`,
    wide: true,
    label: '分页结果',
  },
])

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

const openDetail = (row) => {
  detailRow.value = row
  detailVisible.value = true
}

const buildPayload = () => {
  const payload = {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    sortField: queryForm.sortField,
    sortDirection: queryForm.sortDirection,
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
