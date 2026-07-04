<template>
  <div class="task-pool-panel">
    <div class="task-body">
      <section class="summary-card">
        <div class="pool-tuner" role="group" aria-label="线程池并发容量调整">
          <div class="pool-tuner__head">
            <span class="pool-tuner__title">并发容量</span>
            <span class="pool-tuner__state" :class="poolDirty ? 'is-dirty' : 'is-clean'">
              {{ poolDirty ? '未应用' : '已同步' }}
            </span>
          </div>
          <div class="pool-tuner__fields">
            <label class="pool-field">
              <span class="pool-field__label">核心线程 <em>生效 {{ coreThreads || '—' }}</em></span>
              <el-input-number
                v-model="poolForm.corePoolSize"
                :min="1"
                :max="Math.max(1, Number(poolForm.maximumPoolSize) || 1)"
                :step="1"
                controls-position="right"
                size="small"
              />
            </label>
            <label class="pool-field">
              <span class="pool-field__label">最大线程 <em>生效 {{ maxThreads || '—' }}</em></span>
              <el-input-number
                v-model="poolForm.maximumPoolSize"
                :min="Math.max(1, Number(poolForm.corePoolSize) || 1)"
                :step="1"
                controls-position="right"
                size="small"
              />
            </label>
          </div>
          <div class="pool-tuner__actions">
            <el-button size="small" :disabled="!poolDirty" @click="resetPoolDraftToLive">恢复</el-button>
            <el-button size="small" type="primary" :loading="updatingPoolSize" :disabled="!poolDirty" @click="submitPoolSizeUpdate">
              应用配置
            </el-button>
          </div>
        </div>
        <div class="metric-row">
          <div class="metric-item"><span>线程池</span><strong>{{ poolSize }}</strong></div>
          <div class="metric-item"><span>已完成</span><strong>{{ completedCount }}</strong></div>
        </div>
      </section>

      <div class="running-card">
        <header class="running-card__head">
          <h2 class="running-card__title">运行中 / 排队任务</h2>
          <div class="running-card__tools">
            <span class="stat-pill stat-pill--run">运行 {{ listRunningCount }}</span>
            <span class="stat-pill stat-pill--queue">排队 {{ listQueuedCount }}</span>
            <el-tag size="small" type="danger" effect="plain">高 {{ highPriorityCount }}</el-tag>
            <el-tag size="small" type="warning" effect="plain">中 {{ normalPriorityCount }}</el-tag>
            <span class="running-card__update">{{ lastUpdateText }}</span>
            <el-button size="small" :icon="Refresh" :loading="loading" @click="refreshAll">刷新</el-button>
          </div>
        </header>
        <el-empty v-if="!runningTasks.length" description="当前暂无任务" :image-size="56" />
        <div v-else class="running-list">
          <article
            v-for="task in sortedRunningTasks"
            :key="task.taskId"
            class="running-item"
            :class="`is-${String(task.status || 'unknown').toLowerCase()}`"
          >
            <div class="running-item__main">
              <div class="running-item__title-row">
                <span class="task-name" :title="task.taskName || ''">{{ task.taskName || '-' }}</span>
                <span class="task-status" :class="taskStatusPillClass(task.status)">{{ task.status || '-' }}</span>
              </div>
              <div v-if="task.taskType === 'FILE_PARSE'" class="running-item__progress">
                <span class="stage-name">{{ task.currentStageName || task.currentStageCode || '等待开始' }}</span>
                <el-progress
                  :percentage="Number(task.progress || 0)"
                  :stroke-width="6"
                  :show-text="false"
                  striped
                  striped-flow
                />
                <span class="stage-percent">{{ Number(task.progress || 0) }}%</span>
              </div>
              <div
                v-if="task.taskType === 'FILE_PARSE' && task.stageTraces?.length"
                class="stage-traces"
              >
                <span
                  v-for="trace in task.stageTraces"
                  :key="`${task.taskId}-${trace.stageCode}`"
                  class="stage-trace"
                  :class="`is-${String(trace.status || 'PENDING').toLowerCase()}`"
                >
                  {{ trace.stageName || trace.stageCode }} · {{ formatStageTraceDuration(trace) }}
                </span>
              </div>
              <el-tooltip
                v-if="task.taskType === 'FILE_PARSE' && task.errorMessage"
                effect="dark"
                placement="top-start"
                :content="task.errorMessage"
                :show-after="150"
              >
                <div class="task-error">{{ shortError(task.errorMessage) }}</div>
              </el-tooltip>
              <div class="running-item__meta">
                <span>项目 {{ task.projectId ?? '-' }}</span>
                <span v-if="task.fileName || task.fileId != null">文件 {{ task.fileName || task.fileId }}</span>
                <span>{{ task.priority || '-' }}</span>
                <span>等待 {{ formatDuration(task.waitingDurationMs) }}</span>
                <span>运行 {{ formatDuration(task.runningDurationMs) }}</span>
                <span>CPU {{ formatDuration(task.threadCpuTimeMs) }}</span>
              </div>
            </div>
            <div class="running-item__actions">
              <el-button size="small" text type="primary" @click="openTaskDetail(task)">详情</el-button>
              <el-button
                v-if="task.cancellable"
                size="small"
                text
                type="danger"
                @click.stop="handleCancelTask(task)"
              >
                取消
              </el-button>
            </div>
          </article>
        </div>
      </div>

      <div class="system-card">
        <h2 class="system-card__title">系统运行状态</h2>
        <div class="system-row">
          <span class="system-label">系统 CPU</span>
          <el-progress :percentage="systemCpuPercent" :color="loadColor(systemCpuPercent)" :stroke-width="6" :show-text="false" />
          <span class="system-val">{{ systemCpuText }}</span>
        </div>
        <div class="system-row">
          <span class="system-label">JVM 堆内存</span>
          <el-progress :percentage="memoryPercent" :color="loadColor(memoryPercent)" :stroke-width="6" :show-text="false" />
          <span class="system-val">{{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryMax) }}</span>
        </div>
        <div class="system-row">
          <span class="system-label">线程数</span>
          <span class="system-val system-val--solo">{{ systemStatus.thread?.liveThreadCount ?? '-' }}</span>
        </div>
        <div class="system-row">
          <span class="system-label">GPU</span>
          <template v-if="gpuSupported && gpuUtil != null">
            <el-progress :percentage="gpuPercent" :color="loadColor(gpuPercent)" :stroke-width="6" :show-text="false" />
            <span class="system-val">{{ gpuPercent }}%</span>
          </template>
          <span v-else class="system-val system-val--solo">{{ systemStatus.gpu?.message || '不可用' }}</span>
        </div>
      </div>
    </div>

    <el-dialog v-model="detailVisible" title="任务阶段详情" width="680px" destroy-on-close append-to-body>
      <TaskParseFlowDetailPanel :detail="detailTask" :loading="detailLoading" @refresh="refreshTaskDetail" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import TaskParseFlowDetailPanel from '@/components/layout/TaskParseFlowDetailPanel.vue'
import {
  cancelTaskByTaskId,
  getParseJobFlow,
  getSystemRuntimeStatus,
  getTaskDetailByTaskId,
  getTaskPoolStatus,
  updateTaskPoolSize
} from '@/services/file.service'

const props = defineProps({
  active: {
    type: Boolean,
    default: true
  }
})

const loading = ref(false)
const updatingPoolSize = ref(false)
const lastUpdateAt = ref(0)
const statusData = ref({
  threadPoolStatus: {},
  runningTasks: [],
  queueTasks: {}
})
const systemStatus = ref({
  system: {},
  memory: {},
  thread: {},
  dataSource: {},
  gpu: {}
})
let timer = null
let detailPollTimer = null
let refreshAllInFlight = false
let refreshDetailInFlight = false
const refreshIntervalMs = 5000
const detailPollIntervalMs = 2000
const pageVisible = ref(typeof document === 'undefined' ? true : document.visibilityState === 'visible')
const statusLoaded = ref(false)
const poolForm = ref({
  corePoolSize: 1,
  maximumPoolSize: 1
})
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailTask = ref(null)

const runningTasks = computed(() => (Array.isArray(statusData.value?.runningTasks) ? statusData.value.runningTasks : []))

const taskStatusRank = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'RUNNING') return 0
  if (s === 'QUEUED') return 1
  if (s === 'PENDING') return 2
  return 3
}

const sortedRunningTasks = computed(() => {
  const list = [...runningTasks.value]
  list.sort((a, b) => {
    const ra = taskStatusRank(a?.status)
    const rb = taskStatusRank(b?.status)
    if (ra !== rb) return ra - rb
    return String(a?.taskId || '').localeCompare(String(b?.taskId || ''))
  })
  return list
})

const listRunningCount = computed(() => runningTasks.value.filter((t) => String(t?.status || '').toUpperCase() === 'RUNNING').length)
const listQueuedCount = computed(() => runningTasks.value.filter((t) => String(t?.status || '').toUpperCase() === 'QUEUED').length)
const highPriorityCount = computed(() => Number(statusData.value?.queueTasks?.highPriorityCount || 0))
const normalPriorityCount = computed(() => Number(statusData.value?.queueTasks?.normalPriorityCount || 0))
const coreThreads = computed(() => Number(statusData.value?.threadPoolStatus?.corePoolSize || 0))
const maxThreads = computed(() => Number(statusData.value?.threadPoolStatus?.maximumPoolSize || 0))
const poolSize = computed(() => Number(statusData.value?.threadPoolStatus?.poolSize || 0))
const completedCount = computed(() => Number(statusData.value?.threadPoolStatus?.completedTaskCount || 0))
const systemCpu = computed(() => Number(systemStatus.value?.system?.cpuLoadPercent || 0))
const memoryUsed = computed(() => Number(systemStatus.value?.memory?.heapUsedBytes || 0))
const memoryMax = computed(() => Number(systemStatus.value?.memory?.heapMaxBytes || 0))
const gpuSupported = computed(() => Boolean(systemStatus.value?.gpu?.supported))
const gpuUtil = computed(() => systemStatus.value?.gpu?.utilizationPercent)
const systemCpuPercent = computed(() => clampPercent(systemCpu.value))
const gpuPercent = computed(() => clampPercent(gpuUtil.value))
const memoryPercent = computed(() => {
  const max = Number(memoryMax.value || 0)
  const used = Number(memoryUsed.value || 0)
  if (!max) return 0
  return clampPercent((used / max) * 100)
})
const systemCpuText = computed(() => formatPercent(systemCpu.value))
const poolDirty = computed(() => {
  const c = Number(poolForm.value.corePoolSize)
  const m = Number(poolForm.value.maximumPoolSize)
  return c !== coreThreads.value || m !== maxThreads.value
})

const resetPoolDraftToLive = () => {
  const currentCore = Number(statusData.value?.threadPoolStatus?.corePoolSize || 1)
  const currentMax = Number(statusData.value?.threadPoolStatus?.maximumPoolSize || 1)
  poolForm.value.corePoolSize = currentCore > 0 ? currentCore : 1
  poolForm.value.maximumPoolSize = currentMax > 0 ? currentMax : 1
}

const lastUpdateText = computed(() => {
  if (!lastUpdateAt.value) return '未刷新'
  const d = new Date(lastUpdateAt.value)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
})

function clampPercent(val) {
  const v = Number(val)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v * 100) / 100))
}

function formatPercent(val) {
  const v = Number(val)
  if (!Number.isFinite(v)) return '-'
  return `${Math.round(v * 100) / 100}%`
}

function loadColor(percent) {
  const p = Number(percent)
  if (p >= 85) return '#b42318'
  if (p >= 60) return '#c28a36'
  if (p >= 40) return '#2563eb'
  return '#1f4e79'
}

const taskStatusPillClass = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'RUNNING') return 'is-run'
  if (s === 'QUEUED' || s === 'PENDING') return 'is-wait'
  if (s === 'FAILED' || s === 'ERROR') return 'is-bad'
  if (s === 'SUCCESS') return 'is-done'
  return 'is-na'
}

const fetchStatus = async () => {
  loading.value = true
  try {
    const res = await getTaskPoolStatus()
    if (Number(res?.data?.code) === 200) {
      statusData.value = res?.data?.data || {
        threadPoolStatus: {},
        runningTasks: [],
        queueTasks: {}
      }
      const currentCore = Number(statusData.value?.threadPoolStatus?.corePoolSize || 1)
      const currentMax = Number(statusData.value?.threadPoolStatus?.maximumPoolSize || 1)
      poolForm.value.corePoolSize = currentCore > 0 ? currentCore : 1
      poolForm.value.maximumPoolSize = currentMax > 0 ? currentMax : 1
      lastUpdateAt.value = Date.now()
      statusLoaded.value = true
    }
  } catch (error) {
    console.error('获取任务线程池状态失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchSystemStatus = async () => {
  try {
    const res = await getSystemRuntimeStatus()
    if (Number(res?.data?.code) === 200) {
      systemStatus.value = res?.data?.data || {
        system: {},
        memory: {},
        thread: {},
        dataSource: {},
        gpu: {}
      }
    }
  } catch (error) {
    console.error('获取系统运行状态失败:', error)
  }
}

const refreshAll = async () => {
  if (refreshAllInFlight) return
  refreshAllInFlight = true
  try {
    await Promise.all([fetchStatus(), fetchSystemStatus()])
  } finally {
    refreshAllInFlight = false
  }
}

const handleCancelTask = async (task) => {
  if (!task?.taskId || !task?.cancellable) return
  try {
    const res = await cancelTaskByTaskId(task.taskId)
    const code = Number(res?.data?.code)
    if (code === 200) {
      ElMessage.success(res?.data?.msg || '取消任务成功')
      await refreshAll()
      return
    }
    ElMessage.warning(res?.data?.msg || '取消任务失败')
  } catch (error) {
    console.error('取消任务失败:', error)
    ElMessage.error(error?.response?.data?.msg || '取消任务失败')
  }
}

const openTaskDetail = async (task) => {
  const taskId = typeof task === 'string' ? task : task?.taskId
  if (!taskId) return
  if (task && typeof task === 'object') {
    detailTask.value = { taskId: task.taskId, parseJobId: task.parseJobId }
  } else {
    detailTask.value = { taskId }
  }
  detailVisible.value = true
  await refreshTaskDetail()
}

const refreshTaskDetail = async () => {
  const saved = detailTask.value
  const taskId = saved?.taskId
  const parseJobId = saved?.parseJobId
  if (!taskId && !parseJobId) return
  if (refreshDetailInFlight) return
  refreshDetailInFlight = true
  try {
    detailLoading.value = true
    if (taskId) {
      try {
        const res = await getTaskDetailByTaskId(taskId)
        const code = Number(res?.data?.code)
        const httpStatus = Number(res?.status)
        if (code === 200) {
          detailTask.value = res?.data?.data || null
          stopDetailPollIfTerminal()
          return
        }
        if (code !== 404 && httpStatus !== 404) {
          ElMessage.warning(res?.data?.msg || '获取任务详情失败')
          return
        }
      } catch (err) {
        const st = err?.response?.status
        if (st !== 404) {
          console.error('获取任务详情失败:', err)
          ElMessage.error(err?.response?.data?.msg || '获取任务详情失败')
          return
        }
      }
    }
    if (parseJobId) {
      const res = await getParseJobFlow(parseJobId)
      const code = Number(res?.data?.code)
      if (code === 200) {
        detailTask.value = res?.data?.data || null
        stopDetailPollIfTerminal()
        return
      }
      ElMessage.warning(res?.data?.msg || '未找到解析任务记录')
      return
    }
    ElMessage.warning('暂无法获取任务进度')
  } catch (error) {
    console.error('获取任务详情失败:', error)
    ElMessage.error(error?.response?.data?.msg || '获取任务详情失败')
  } finally {
    detailLoading.value = false
    refreshDetailInFlight = false
  }
}

const stopDetailPollIfTerminal = () => {
  const t = detailTask.value
  if (!t) return
  const st = String(t.status || '').toUpperCase()
  if (st === 'SUCCESS' || st === 'FAILED' || st === 'CANCELLED') {
    stopDetailPolling()
  }
}

const stopMainPolling = () => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
}

const startMainPolling = () => {
  if (!props.active || !pageVisible.value || timer) return
  timer = window.setInterval(refreshAll, refreshIntervalMs)
}

const stopDetailPolling = () => {
  if (detailPollTimer) {
    window.clearInterval(detailPollTimer)
    detailPollTimer = null
  }
}

const startDetailPolling = () => {
  if (!detailVisible.value || !pageVisible.value || detailPollTimer) return
  detailPollTimer = window.setInterval(() => {
    refreshTaskDetail()
  }, detailPollIntervalMs)
}

const handleVisibilityChange = () => {
  pageVisible.value = document.visibilityState === 'visible'
  if (!pageVisible.value) {
    stopMainPolling()
    stopDetailPolling()
    return
  }
  if (props.active) {
    refreshAll()
    startMainPolling()
    if (detailVisible.value) {
      refreshTaskDetail()
      startDetailPolling()
    }
  }
}

watch(detailVisible, (open) => {
  stopDetailPolling()
  if (open && pageVisible.value) {
    startDetailPolling()
  }
})

watch(
  () => props.active,
  async (isActive) => {
    if (isActive) {
      if (!statusLoaded.value) {
        await refreshAll()
      }
      if (pageVisible.value) {
        startMainPolling()
      }
      return
    }
    stopMainPolling()
    stopDetailPolling()
  },
  { immediate: true }
)

const submitPoolSizeUpdate = async () => {
  const core = Number(poolForm.value.corePoolSize)
  const max = Number(poolForm.value.maximumPoolSize)
  if (!Number.isInteger(core) || !Number.isInteger(max) || core <= 0 || max <= 0) {
    ElMessage.warning('核心线程数和最大线程数必须是大于0的整数')
    return
  }
  if (core > max) {
    ElMessage.warning('核心线程数不能大于最大线程数')
    return
  }
  try {
    updatingPoolSize.value = true
    const res = await updateTaskPoolSize({ corePoolSize: core, maximumPoolSize: max })
    const code = Number(res?.data?.code)
    if (code === 200) {
      ElMessage.success(res?.data?.msg || '线程池参数更新成功')
      await refreshAll()
      return
    }
    ElMessage.warning(res?.data?.msg || '线程池参数更新失败')
  } catch (error) {
    console.error('线程池参数更新失败:', error)
    ElMessage.error(error?.response?.data?.msg || '线程池参数更新失败')
  } finally {
    updatingPoolSize.value = false
  }
}

const formatDuration = (ms) => {
  const val = Number(ms || 0)
  if (!val) return '-'
  if (val < 1000) return `${val}ms`
  const sec = Math.floor(val / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

const formatStageTraceDuration = (trace) => {
  const st = String(trace?.status || '').toUpperCase()
  const val = Number(trace?.durationMs || 0)
  if ((st === 'RUNNING' || st === 'PENDING') && !val) {
    return st === 'RUNNING' ? '进行中' : '等待'
  }
  return formatDuration(trace?.durationMs)
}

const shortError = (text, limit = 56) => {
  const val = String(text || '').trim()
  if (!val) return '-'
  if (val.length <= limit) return val
  return `${val.slice(0, limit)}...`
}

const formatBytes = (bytes) => {
  const v = Number(bytes || 0)
  if (!v) return '-'
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(2)} KB`
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(2)} MB`
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopMainPolling()
  stopDetailPolling()
})
</script>

<style scoped>
.task-pool-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.task-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'summary running'
    'system running';
  gap: 12px;
  overflow: hidden;
}

.summary-card {
  grid-area: summary;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.running-card {
  grid-area: running;
  min-height: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.system-card {
  grid-area: system;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  align-self: start;
}

@media (max-width: 1100px) {
  .task-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    grid-template-areas: 'summary' 'running' 'system';
    overflow-y: auto;
  }

  .running-card {
    min-height: 320px;
    max-height: min(52vh, 520px);
  }
}

.pool-tuner__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.pool-tuner__title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.pool-tuner__state {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.pool-tuner__state.is-clean {
  border-color: #99f6e4;
  background: #f0fdfa;
  color: #0f766e;
}

.pool-tuner__state.is-dirty {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #92400e;
}

.pool-tuner__fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pool-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pool-field__label {
  font-size: 12px;
  color: #64748b;
}

.pool-field__label em {
  font-style: normal;
  color: #94a3b8;
  margin-left: 4px;
}

.pool-field :deep(.el-input-number) {
  width: 100%;
}

.pool-tuner__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.metric-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.metric-item {
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #64748b;
}

.metric-item strong {
  font-size: 15px;
  color: #1e293b;
}

.running-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.running-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.running-card__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.stat-pill {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
}

.stat-pill--run {
  border-color: #99f6e4;
  background: #f0fdfa;
  color: #0f766e;
}

.stat-pill--queue {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #92400e;
}

.running-card__update {
  font-size: 12px;
  color: #94a3b8;
}

.running-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.running-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-left: 3px solid #94a3b8;
  border-radius: 6px;
  background: #fafbfc;
}

.running-item.is-running {
  border-left-color: #0d9488;
}

.running-item.is-queued,
.running-item.is-pending {
  border-left-color: #d97706;
}

.running-item.is-error,
.running-item.is-failed {
  border-left-color: #b42318;
}

.running-item__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.running-item__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-status {
  flex-shrink: 0;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.task-status.is-run {
  border-color: #99f6e4;
  background: #f0fdfa;
  color: #0f766e;
}

.task-status.is-wait {
  border-color: #fcd34d;
  background: #fffbeb;
  color: #92400e;
}

.task-status.is-bad {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.running-item__progress {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(80px, 2fr) auto;
  align-items: center;
  gap: 8px;
}

.stage-name {
  font-size: 12px;
  color: #475569;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-percent {
  font-size: 12px;
  font-weight: 600;
  color: #0f766e;
  white-space: nowrap;
}

.stage-traces {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.stage-trace {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.stage-trace.is-success,
.stage-trace.is-running {
  border-color: #99f6e4;
  background: #f0fdfa;
  color: #0f766e;
}

.stage-trace.is-failed {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.task-error {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.running-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 11px;
  color: #64748b;
}

.running-item__meta span {
  white-space: nowrap;
}

.running-item__actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.system-card__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.system-row {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid #f1f5f9;
}

.system-row:first-of-type {
  border-top: none;
}

.system-label {
  font-size: 12px;
  color: #64748b;
}

.system-val {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
}

.system-val--solo {
  grid-column: 2 / -1;
}
</style>
