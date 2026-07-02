<template>
  <div class="floating-task-status">
    <button
      v-if="!visible"
      class="task-fab"
      type="button"
      title="任务线程池状态"
      @click="visible = true"
    >
      <span class="fab-core">
        <el-icon class="fab-icon"><Cpu /></el-icon>
      </span>
    </button>

    <el-drawer
      v-model="visible"
      :size="drawerWidthPx"
      append-to-body
      class="task-drawer"
      title="任务线程池状态"
    >
      <div class="task-body">
        <section class="summary-card">
          <div class="metric-grid">
            <div class="pool-tuner" role="group" aria-label="线程池并发容量调整">
              <div class="pool-tuner__top">
                <div class="pool-tuner__title-block">
                  <span class="pool-tuner__title">并发容量</span>
                </div>
                <div
                  class="pool-tuner__state"
                  :class="poolDirty ? 'is-dirty' : 'is-clean'"
                >
                  {{ poolDirty ? '未应用' : '已同步' }}
                </div>
              </div>

              <div class="pool-tuner__fields">
                <div class="pool-tuner__field">
                  <div class="pool-tuner__field-head">
                    <span class="pool-tuner__name">核心线程</span>
                    <span class="pool-tuner__live">
                      生效
                      <strong class="pool-tuner__live-num">{{ coreThreads || '—' }}</strong>
                    </span>
                  </div>
                  <div class="pool-tuner__control">
                    <span class="pool-tuner__draft-label">调整为</span>
                    <el-input-number
                      v-model="poolForm.corePoolSize"
                      class="pool-tuner__stepper"
                      :min="1"
                      :max="Math.max(1, Number(poolForm.maximumPoolSize) || 1)"
                      :step="1"
                      controls-position="right"
                      size="small"
                    />
                  </div>
                </div>

                <div class="pool-tuner__divider" aria-hidden="true" />

                <div class="pool-tuner__field">
                  <div class="pool-tuner__field-head">
                    <span class="pool-tuner__name">最大线程</span>
                    <span class="pool-tuner__live">
                      生效
                      <strong class="pool-tuner__live-num">{{ maxThreads || '—' }}</strong>
                    </span>
                  </div>
                  <div class="pool-tuner__control">
                    <span class="pool-tuner__draft-label">调整为</span>
                    <el-input-number
                      v-model="poolForm.maximumPoolSize"
                      class="pool-tuner__stepper"
                      :min="Math.max(1, Number(poolForm.corePoolSize) || 1)"
                      :step="1"
                      controls-position="right"
                      size="small"
                    />
                  </div>
                </div>
              </div>

              <div class="pool-tuner__actions">
                <el-button
                  size="small"
                  class="pool-tuner__btn pool-tuner__btn--ghost"
                  :disabled="!poolDirty"
                  @click="resetPoolDraftToLive"
                >
                  恢复为生效值
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  class="pool-tuner__btn pool-tuner__btn--apply"
                  :loading="updatingPoolSize"
                  :disabled="!poolDirty"
                  @click="submitPoolSizeUpdate"
                >
                  应用配置
                </el-button>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-label">线程池大小</span>
              <span class="metric-value">{{ poolSize }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">已完成任务</span>
              <span class="metric-value">{{ completedCount }}</span>
            </div>
          </div>
        </section>

        <div class="running-card">
          <header class="running-card__head">
            <div class="running-card__head-text">
              <h2 class="running-card__title">运行中 / 排队任务</h2>
              <p class="running-card__subtitle">解析流水线与队列占用一览</p>
            </div>
            <div class="running-card__head-actions">
              <div class="running-card__stats" role="presentation">
                <div class="running-card__stat running-card__stat--run">
                  <span class="running-card__stat-label">运行中</span>
                  <span class="running-card__stat-value">{{ listRunningCount }}</span>
                </div>
                <div class="running-card__stat running-card__stat--queue">
                  <span class="running-card__stat-label">排队</span>
                  <span class="running-card__stat-value">{{ listQueuedCount }}</span>
                </div>
                <div class="running-card__stat running-card__stat--priority">
                  <span class="running-card__stat-label">队列优先级</span>
                  <div class="queue-tags">
                    <el-tag size="small" type="danger" effect="plain">高 {{ highPriorityCount }}</el-tag>
                    <el-tag size="small" type="warning" effect="plain">中 {{ normalPriorityCount }}</el-tag>
                  </div>
                </div>
              </div>
              <div class="running-card__toolbar">
                <div class="running-card__update">更新 {{ lastUpdateText }}</div>
                <el-button
                  size="small"
                  class="refresh-btn"
                  type="primary"
                  plain
                  :icon="Refresh"
                  :loading="loading"
                  @click="refreshAll"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </header>
          <el-empty
            v-if="!runningTasks.length"
            class="running-card__empty"
            description="当前暂无任务"
            :image-size="72"
          />
          <div v-else class="running-list">
            <div
              v-for="(task, taskIndex) in sortedRunningTasks"
              :key="task.taskId"
              class="running-item"
              :class="`is-${String(task.status || 'unknown').toLowerCase()}`"
              :style="{ '--task-i': taskIndex }"
            >
              <div class="running-item__sheen" aria-hidden="true" />
              <div class="running-item__body">
                <div class="task-head">
                  <div class="task-head__main">
                    <span v-if="task.taskType === 'FILE_PARSE'" class="task-kind">文件解析</span>
                    <div class="task-name" :title="task.taskName || ''">{{ task.taskName || '-' }}</div>
                  </div>
                  <span class="task-status-pill" :class="taskStatusPillClass(task.status)">
                    {{ task.status || '-' }}
                  </span>
                </div>

                <div v-if="task.taskType === 'FILE_PARSE'" class="task-stage-current">
                  <div class="stage-panel-head">
                    <span class="stage-panel-label">当前阶段</span>
                    <span class="stage-percent">{{ Number(task.progress || 0) }}%</span>
                  </div>
                  <div class="stage-line">
                    <span class="stage-name">{{ task.currentStageName || task.currentStageCode || '等待开始' }}</span>
                  </div>
                  <el-progress
                    :percentage="Number(task.progress || 0)"
                    :stroke-width="7"
                    :show-text="false"
                    class="task-stage-progress"
                    striped
                    striped-flow
                  />
                </div>

                <div
                  v-if="task.taskType === 'FILE_PARSE' && Array.isArray(task.stageTraces) && task.stageTraces.length"
                  class="stage-trace-list"
                >
                  <span
                    v-for="trace in task.stageTraces"
                    :key="`${task.taskId}-${trace.stageCode}`"
                    class="stage-trace-chip"
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

                <div class="task-sub">
                  <div class="sub-chip">
                    <span class="sub-k">项目</span>
                    <span class="sub-v">{{ task.projectId ?? '-' }}</span>
                  </div>
                  <div v-if="task.fileName || task.fileId != null" class="sub-chip sub-chip--file">
                    <span class="sub-k">文件</span>
                    <span class="sub-v">{{ task.fileName || task.fileId }}</span>
                  </div>
                </div>

                <div class="task-foot">
                  <div class="task-foot-left">
                    <span class="priority-pill">{{ task.priority || '-' }}</span>
                  </div>
                  <div class="task-foot-actions">
                    <el-button size="small" text type="primary" class="detail-btn" @click="openTaskDetail(task)">
                      详情
                    </el-button>
                    <el-button
                      v-if="task.cancellable"
                      size="small"
                      text
                      type="danger"
                      class="cancel-btn"
                      @click.stop="handleCancelTask(task)"
                    >
                      取消
                    </el-button>
                  </div>
                </div>

                <div class="task-runtime" aria-label="任务耗时">
                  <span class="runtime-chip">
                    <span class="runtime-chip__k">等待</span>
                    <span class="runtime-chip__v">{{ formatDuration(task.waitingDurationMs) }}</span>
                  </span>
                  <span class="runtime-chip">
                    <span class="runtime-chip__k">运行</span>
                    <span class="runtime-chip__v">{{ formatDuration(task.runningDurationMs) }}</span>
                  </span>
                  <span class="runtime-chip">
                    <span class="runtime-chip__k">CPU</span>
                    <span class="runtime-chip__v">{{ formatDuration(task.threadCpuTimeMs) }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="system-card">
          <header class="system-card__head">
            <div class="system-card__head-text">
              <h2 class="system-card__title">系统运行状态</h2>
              <p class="system-card__subtitle">每 5s 自动刷新 · 与任务池同源采样</p>
            </div>
            <div class="system-card__live" aria-hidden="true">
              <span class="system-card__live-dot" />
              <span class="system-card__live-txt">实时</span>
            </div>
          </header>

          <div class="system-row">
            <div class="system-label">系统CPU</div>
            <div class="system-bar">
              <el-progress
                :percentage="systemCpuPercent"
                :color="loadColor(systemCpuPercent)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
            <div class="system-val">{{ systemCpuText }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">JVM堆内存</div>
            <div class="system-bar">
              <el-progress
                :percentage="memoryPercent"
                :color="loadColor(memoryPercent)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
            <div class="system-val">{{ formatBytes(memoryUsed) }} / {{ formatBytes(memoryMax) }}</div>
          </div>
          <div class="system-row">
            <div class="system-label">线程数</div>
            <div class="system-bar system-bar--text">{{ systemStatus.thread?.liveThreadCount ?? '-' }}</div>
            <div class="system-val" />
          </div>
          <div class="system-row">
            <div class="system-label">GPU</div>
            <div class="system-bar">
              <template v-if="gpuSupported && gpuUtil != null">
                <el-progress
                  :percentage="gpuPercent"
                  :color="loadColor(gpuPercent)"
                  :stroke-width="8"
                  :show-text="false"
                />
              </template>
              <template v-else>
                <div class="system-bar system-bar--text">{{ systemStatus.gpu?.message || '不可用' }}</div>
              </template>
            </div>
            <div class="system-val" v-if="gpuSupported && gpuUtil != null">{{ gpuPercent }}%</div>
            <div class="system-val" v-else />
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="detailVisible" title="任务阶段详情" width="680px" destroy-on-close append-to-body>
      <TaskParseFlowDetailPanel
        :detail="detailTask"
        :loading="detailLoading"
        @refresh="refreshTaskDetail"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Cpu, Refresh } from '@element-plus/icons-vue'
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

const visible = ref(false)
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
const detailPollIntervalMs = 3000
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

/** 抽屉宽度：略宽便于双列任务卡；打开时按视口计算 */
const drawerWidthPx = ref(600)
const recalcDrawerWidth = () => {
  if (typeof window === 'undefined') return
  const w = window.innerWidth || 1200
  drawerWidthPx.value = Math.min(680, Math.max(520, Math.round(w * 0.38)))
}

const taskStatusRank = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'RUNNING') return 0
  if (s === 'QUEUED') return 1
  if (s === 'PENDING') return 2
  return 3
}

/** RUNNING 在前，QUEUED 在后，其余状态置后；同组内按 taskId 稳定排序 */
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

/** 草稿是否与服务器当前生效值不一致 */
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

/** 任务卡片右上角状态胶囊样式 */
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
    detailTask.value = {
      taskId: task.taskId,
      parseJobId: task.parseJobId
    }
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
  if (!visible.value || !pageVisible.value || timer) return
  timer = window.setInterval(() => {
    if (refreshAllInFlight) return
    refreshAll()
  }, refreshIntervalMs)
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
    if (refreshDetailInFlight) return
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
  if (visible.value) {
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

watch(visible, async (open) => {
  if (open) {
    recalcDrawerWidth()
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
})

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
    const res = await updateTaskPoolSize({
      corePoolSize: core,
      maximumPoolSize: max
    })
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

/** 阶段轨迹：进行中的阶段往往尚无 durationMs，避免显示 “· -” */
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
  recalcDrawerWidth()
  window.addEventListener('resize', recalcDrawerWidth)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcDrawerWidth)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopMainPolling()
  stopDetailPolling()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;1,9..40,400&family=Syne:wght@600;700&family=JetBrains+Mono:wght@500;600&display=swap');

.task-body {
  --semantic-success-border: rgba(13, 148, 136, 0.35);
  --semantic-success-bg: rgba(240, 253, 250, 0.92);
  --semantic-success-text: #0f766e;
  --semantic-warning-border: rgba(217, 119, 6, 0.32);
  --semantic-warning-bg: rgba(255, 251, 235, 0.92);
  --semantic-warning-text: #92400e;
  --semantic-danger-border: rgba(180, 35, 24, 0.28);
  --semantic-danger-bg: rgba(255, 242, 242, 0.92);
  --semantic-danger-text: #991b1b;
  --semantic-neutral-border: rgba(148, 163, 184, 0.35);
  --semantic-neutral-bg: rgba(241, 245, 249, 0.9);
  --semantic-neutral-text: #475569;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

:deep(.task-drawer .el-drawer__body) {
  padding: 16px 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f3f7fd 100%);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.task-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
}

:deep(.task-drawer .el-drawer__title) {
  font-weight: 800;
  font-size: 16px;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.task-fab {
  position: fixed;
  right: 24px;
  bottom: 164px;
  z-index: 2100;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 1px solid #8ea2bf;
  background: linear-gradient(145deg, #f7fbff 0%, #dce8f7 100%);
  color: #2d4463;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(36, 55, 82, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.task-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(36, 55, 82, 0.28);
}

.fab-core {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fab-icon {
  font-size: 24px;
}

.summary-card {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  padding: 14px 14px 12px;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 42%, rgba(241, 245, 249, 0.97) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9) inset,
    0 12px 30px -22px rgba(15, 23, 42, 0.28);
}

.refresh-btn {
  border-radius: 10px;
  font-weight: 700;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pool-tuner {
  grid-column: 1 / -1;
  --pool-slate: #0f172a;
  --pool-ink: #1e293b;
  --pool-muted: #64748b;
  --pool-line: rgba(51, 65, 85, 0.35);
  --pool-surface: linear-gradient(165deg, rgba(255, 255, 255, 0.97) 0%, rgba(241, 245, 249, 0.92) 48%, rgba(226, 232, 240, 0.88) 100%);
  --pool-amber: #d97706;
  --pool-amber-soft: rgba(217, 119, 6, 0.14);
  --pool-teal: #0d9488;
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  border-radius: 16px;
  padding: 14px 16px 12px;
  border: 1px solid var(--pool-line);
  background: var(--pool-surface);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.6) inset,
    0 14px 36px -22px rgba(15, 23, 42, 0.45);
  position: relative;
  overflow: hidden;
}

.pool-tuner::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: multiply;
}

.pool-tuner__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.pool-tuner__title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pool-tuner__title {
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--pool-slate);
}

.pool-tuner__state {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--pool-line);
  background: rgba(255, 255, 255, 0.65);
  color: var(--pool-muted);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.pool-tuner__state.is-clean {
  border-color: rgba(13, 148, 136, 0.35);
  background: rgba(240, 253, 250, 0.85);
  color: #0f766e;
}

.pool-tuner__state.is-dirty {
  border-color: rgba(217, 119, 6, 0.45);
  background: var(--pool-amber-soft);
  color: #92400e;
}

.pool-tuner__fields {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px 14px;
  align-items: stretch;
}

@media (max-width: 560px) {
  .pool-tuner__fields {
    grid-template-columns: 1fr;
  }

  .pool-tuner__divider {
    display: none;
  }
}

.pool-tuner__field {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.pool-tuner__field:hover {
  border-color: rgba(14, 116, 144, 0.35);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.8) inset,
    0 10px 24px -18px rgba(15, 23, 42, 0.25);
}

.pool-tuner__field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.pool-tuner__name {
  font-family: 'Syne', sans-serif;
  font-weight: 600;
  font-size: 13px;
  color: var(--pool-ink);
}

.pool-tuner__live {
  font-size: 11px;
  color: var(--pool-muted);
  white-space: nowrap;
}

.pool-tuner__live-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
  font-size: 13px;
  color: var(--pool-slate);
  margin-left: 4px;
}

.pool-tuner__control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pool-tuner__draft-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--pool-muted);
  flex-shrink: 0;
}

.pool-tuner__stepper {
  flex: 1;
  min-width: 0;
}

:deep(.pool-tuner__stepper.el-input-number) {
  width: 100%;
}

:deep(.pool-tuner__stepper .el-input__wrapper) {
  border-radius: 10px;
  padding-left: 10px;
  padding-right: 6px;
  background: rgba(248, 250, 252, 0.95);
  box-shadow: 0 0 0 1px rgba(51, 65, 85, 0.2) inset;
  transition: box-shadow 0.2s ease;
}

:deep(.pool-tuner__stepper .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(13, 148, 136, 0.45) inset;
}

:deep(.pool-tuner__stepper .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.35) inset;
}

:deep(.pool-tuner__stepper .el-input__inner) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-weight: 600;
  font-size: 15px;
  color: var(--pool-slate);
  text-align: center;
}

.pool-tuner__divider {
  width: 1px;
  margin: 8px 0;
  background: linear-gradient(180deg, transparent, rgba(100, 116, 139, 0.35), transparent);
  align-self: stretch;
  justify-self: center;
}

.pool-tuner__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.pool-tuner__btn {
  border-radius: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.pool-tuner__btn--ghost {
  border: 1px solid rgba(51, 65, 85, 0.25);
  background: rgba(255, 255, 255, 0.85);
  color: var(--pool-ink);
}

.pool-tuner__btn--ghost:hover:not(:disabled) {
  border-color: rgba(13, 148, 136, 0.4);
  color: #0f766e;
  background: rgba(240, 253, 250, 0.9);
}

.pool-tuner__btn--apply {
  min-width: 104px;
  background: linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #14b8a6 100%);
  border: none;
  box-shadow: 0 8px 20px -8px rgba(13, 148, 136, 0.65);
}

.pool-tuner__btn--apply:hover:not(:disabled) {
  filter: brightness(1.05);
}

.metric-item {
  border: 1px solid rgba(148, 163, 184, 0.32);
  border-radius: 12px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
}

.metric-label {
  font-size: 12px;
  color: #64748b;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.queue-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  align-items: center;
}

:deep(.queue-tags .el-tag) {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
}

@keyframes running-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes task-row-in {
  from {
    opacity: 0;
    transform: translateX(-6px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes live-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.45;
    transform: scale(0.92);
  }
}

.running-card {
  --rc-slate: #0f172a;
  --rc-muted: #64748b;
  --rc-line: rgba(148, 163, 184, 0.35);
  --rc-teal: #0d9488;
  --rc-teal-glow: rgba(13, 148, 136, 0.22);
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  position: relative;
  border: 1px solid var(--rc-line);
  border-radius: 16px;
  padding: 14px 14px 12px;
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 42%, rgba(241, 245, 249, 0.97) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9) inset,
    0 12px 30px -22px rgba(15, 23, 42, 0.28);
  display: flex;
  flex-direction: column;
  min-height: 360px;
  max-height: min(58vh, 520px);
  overflow: hidden;
  animation: running-card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards;
}

.running-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.015'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: multiply;
  border-radius: inherit;
}

.running-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.32);
}

.running-card__title {
  margin: 0;
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--rc-slate);
}

.running-card__subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--rc-muted);
  max-width: 36ch;
}

.running-card__head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 10px 14px;
  flex: 1;
  min-width: 0;
}

.running-card__toolbar {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.running-card__update {
  font-size: 12px;
  color: var(--rc-muted);
}

.running-card__stats {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.running-card__stat {
  min-width: 72px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--rc-line);
  background: rgba(255, 255, 255, 0.92);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.running-card__stat:hover {
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 10px 22px -16px rgba(15, 23, 42, 0.2);
}

.running-card__stat--run {
  border-color: var(--semantic-success-border);
  background: linear-gradient(160deg, var(--semantic-success-bg) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.running-card__stat--queue {
  border-color: var(--semantic-warning-border);
  background: linear-gradient(160deg, var(--semantic-warning-bg) 0%, rgba(255, 255, 255, 0.9) 100%);
}

.running-card__stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rc-muted);
}

.running-card__stat-value {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  color: var(--rc-slate);
}

.running-card__stat--run .running-card__stat-value {
  color: var(--semantic-success-text);
}

.running-card__stat--queue .running-card__stat-value {
  color: var(--semantic-warning-text);
}

.running-card__stat--priority {
  min-width: 0;
  align-items: flex-start;
}

.running-card__stat--priority .queue-tags {
  justify-content: flex-end;
}

:deep(.running-card__empty.el-empty) {
  position: relative;
  z-index: 1;
  padding: 28px 12px;
  flex: 1;
  justify-content: center;
}

:deep(.running-card__empty .el-empty__description p) {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: var(--rc-muted);
}

.running-list {
  position: relative;
  z-index: 1;
  max-height: none;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  padding: 2px 6px 4px 2px;
  flex: 1 1 auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(13, 148, 136, 0.35) transparent;
}

.running-list::-webkit-scrollbar {
  width: 6px;
}

.running-list::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, var(--rc-teal), #14b8a6);
  border-radius: 999px;
}

.running-item {
  --stripe: #94a3b8;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 14px;
  padding: 0;
  background: linear-gradient(118deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.94) 48%, rgba(255, 255, 255, 0.92) 100%);
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.24);
  overflow: hidden;
  min-width: 0;
  min-height: 104px;
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  animation: task-row-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(0.04s * var(--task-i, 0));
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.2s ease;
}

.running-item::before {
  content: '';
  flex: 0 0 5px;
  align-self: stretch;
  background: linear-gradient(180deg, var(--stripe) 0%, color-mix(in srgb, var(--stripe) 65%, #0f172a) 100%);
  box-shadow: 2px 0 12px var(--rc-teal-glow);
}

.running-item.is-running {
  --stripe: #0d9488;
}

.running-item.is-queued,
.running-item.is-pending {
  --stripe: #d97706;
}

.running-item.is-error,
.running-item.is-failed {
  --stripe: #b42318;
}

.running-item.is-cancelled,
.running-item.is-canceled {
  --stripe: #64748b;
}

.running-item__sheen {
  position: absolute;
  inset: 0;
  left: 5px;
  background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.5) 48%, transparent 56%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.running-item:hover {
  border-color: rgba(13, 148, 136, 0.32);
  box-shadow:
    0 14px 30px -22px rgba(15, 23, 42, 0.28),
    0 0 0 1px rgba(13, 148, 136, 0.1);
  transform: translateY(-1px);
}

.running-item:hover .running-item__sheen {
  opacity: 1;
}

.running-item__body {
  flex: 1;
  min-width: 0;
  padding: 12px 12px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.task-head__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-kind {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rc-teal);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(13, 148, 136, 0.1);
  border: 1px solid rgba(13, 148, 136, 0.22);
}

.task-name {
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--rc-slate);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.task-status-pill {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--rc-line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--rc-muted);
}

.task-status-pill.is-run {
  border-color: var(--semantic-success-border);
  background: linear-gradient(135deg, var(--semantic-success-bg) 0%, rgba(255, 255, 255, 0.92) 100%);
  color: var(--semantic-success-text);
  box-shadow: 0 0 14px var(--rc-teal-glow);
}

.task-status-pill.is-wait {
  border-color: var(--semantic-warning-border);
  background: var(--semantic-warning-bg);
  color: var(--semantic-warning-text);
}

.task-status-pill.is-bad {
  border-color: var(--semantic-danger-border);
  background: var(--semantic-danger-bg);
  color: var(--semantic-danger-text);
}

.task-status-pill.is-done {
  border-color: var(--semantic-success-border);
  background: var(--semantic-success-bg);
  color: var(--semantic-success-text);
}

.task-sub {
  margin-top: 10px;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-stage-current {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(13, 148, 136, 0.2);
  background: linear-gradient(165deg, rgba(240, 253, 250, 0.55) 0%, rgba(255, 255, 255, 0.75) 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.stage-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.stage-panel-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--rc-muted);
}

.stage-line {
  min-width: 0;
}

.stage-name {
  font-size: 13px;
  color: var(--rc-slate);
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-stage-progress {
  width: 100%;
  min-width: 0;
}

:deep(.task-stage-progress .el-progress-bar__outer) {
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.07);
  overflow: hidden;
}

:deep(.task-stage-progress .el-progress-bar__inner) {
  border-radius: 999px;
  background: linear-gradient(90deg, #0f766e 0%, var(--rc-teal) 45%, #5eead4 100%) !important;
}

.stage-percent {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--rc-teal);
}

.stage-trace-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stage-trace-chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(248, 250, 252, 0.95);
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.stage-trace-chip.is-success {
  border-color: var(--semantic-success-border);
  background: var(--semantic-success-bg);
  color: var(--semantic-success-text);
}

.stage-trace-chip.is-running {
  border-color: var(--semantic-success-border);
  background: var(--semantic-success-bg);
  color: var(--semantic-success-text);
}

.stage-trace-chip.is-failed {
  border-color: var(--semantic-danger-border);
  background: var(--semantic-danger-bg);
  color: var(--semantic-danger-text);
}

.stage-trace-chip.is-skipped {
  border-color: var(--semantic-neutral-border);
  background: var(--semantic-neutral-bg);
  color: var(--semantic-neutral-text);
}

.sub-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border-radius: 11px;
  border: 1px solid rgba(51, 65, 85, 0.12);
  background: rgba(255, 255, 255, 0.88);
  flex: 0 0 auto;
  min-width: 0;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset;
}

.sub-chip--file {
  flex: 1 1 auto;
  min-width: 0;
}

.sub-k {
  flex: 0 0 auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc-muted);
}

.sub-v {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--rc-slate);
}

.sub-chip--file .sub-v {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.priority-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid rgba(51, 65, 85, 0.15);
  background: rgba(248, 250, 252, 0.95);
  color: #475569;
}

.task-foot {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px dashed rgba(100, 116, 139, 0.28);
}

.task-foot-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 140px;
}

.task-foot-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.task-id-pill {
  min-width: 0;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-id-pill--link {
  cursor: pointer;
}

.task-id-pill--link:hover {
  border-color: rgba(13, 148, 136, 0.45);
  color: #0f766e;
}

.task-runtime {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--semantic-danger-border);
  background: var(--semantic-danger-bg);
  color: var(--semantic-danger-text);
  font-size: 12px;
  line-height: 1.45;
}

.runtime-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 10px;
  border: 1px solid rgba(51, 65, 85, 0.12);
  background: rgba(15, 23, 42, 0.04);
  line-height: 1.2;
}

.runtime-chip__k {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc-muted);
}

.runtime-chip__v {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--rc-slate);
}

.cancel-btn,
.detail-btn {
  border-radius: 10px;
  font-weight: 700;
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
}

:deep(.detail-btn.el-button.is-text) {
  color: var(--semantic-success-text);
  border: 1px solid var(--semantic-success-border);
  background: var(--semantic-success-bg);
}

:deep(.detail-btn.el-button.is-text:hover) {
  color: var(--semantic-success-text);
  border-color: rgba(13, 148, 136, 0.48);
  background: rgba(204, 251, 241, 0.95);
}

:deep(.cancel-btn.el-button.is-text) {
  color: var(--semantic-danger-text);
  border: 1px solid var(--semantic-danger-border);
  background: var(--semantic-danger-bg);
}

:deep(.cancel-btn.el-button.is-text:hover) {
  color: #991b1b;
  border-color: rgba(180, 35, 24, 0.38);
  background: rgba(254, 226, 226, 0.95);
}

.system-card {
  --sys-slate: #0f172a;
  --sys-muted: #64748b;
  --sys-line: rgba(148, 163, 184, 0.35);
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  position: relative;
  border: 1px solid var(--sys-line);
  border-radius: 16px;
  padding: 14px 14px 10px;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 42%, rgba(241, 245, 249, 0.97) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9) inset,
    0 12px 30px -22px rgba(15, 23, 42, 0.28);
  color: #1e293b;
  overflow: hidden;
  animation: running-card-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s backwards;
}

.system-card::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
}

.system-card__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.32);
}

.system-card__title {
  margin: 0;
  font-family: 'Syne', 'DM Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #0f172a;
}

.system-card__subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #64748b;
}

.system-card__live {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(20, 184, 166, 0.3);
  background: rgba(240, 253, 250, 0.9);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #0f766e;
}

.system-card__live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #14b8a6;
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.45);
  animation: live-pulse 1.6s ease-in-out infinite;
}

.system-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 88px 1fr minmax(72px, auto);
  align-items: center;
  gap: 12px;
  padding: 9px 4px;
  border-top: 1px solid rgba(148, 163, 184, 0.36);
  transition: background 0.2s ease;
}

.system-row:hover {
  background: rgba(37, 99, 235, 0.04);
  border-radius: 10px;
}

.system-row:first-of-type {
  border-top: none;
}

.system-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
}

.system-bar {
  min-width: 0;
}

:deep(.system-card .el-progress-bar__outer) {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
}

:deep(.system-card .el-progress-bar__inner) {
  border-radius: 999px;
}

.system-bar--text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  line-height: 1.35;
  word-break: break-word;
}

.system-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  text-align: right;
  white-space: nowrap;
}
</style>
