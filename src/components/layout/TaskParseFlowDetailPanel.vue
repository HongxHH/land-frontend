<template>
  <div class="tpfd-root" v-loading="showOverlayLoading">
    <template v-if="detail">
      <div class="detail-top">
        <div class="detail-top-main">
          <div class="detail-name">{{ detail.taskName || '文件解析任务' }}</div>
          <div class="detail-id">{{ detail.fileName || '未命名文件' }}</div>
          <div class="detail-meta">
            <span v-if="detail.fileContextType" class="detail-ctx">类型 {{ detail.fileContextType }}</span>
            <el-tag v-if="detail.status" size="small" effect="plain">{{ detail.status }}</el-tag>
            <span v-if="retryMetaText" class="detail-ctx">{{ retryMetaText }}</span>
            <span v-if="detail.retryReason" class="detail-ctx" :title="detail.retryReason">
              原因 {{ shortError(detail.retryReason, 48) }}
            </span>
          </div>
          <div class="detail-stage">
            当前阶段：{{ detail.currentStageName || detail.currentStageCode || '-' }}
          </div>
        </div>
        <div class="detail-actions">
          <span v-if="syncPillVisible" class="sync-pill">同步中</span>
          <el-button v-if="showRefresh" size="small" type="primary" plain @click="emit('refresh')">刷新</el-button>
        </div>
      </div>

      <div v-if="detail.pipelineSteps?.length" class="detail-pipeline">
        <div
          v-for="(step, idx) in detail.pipelineSteps"
          :key="step.stageCode"
          class="pipeline-node"
          :class="pipelineStepClass(step)"
        >
          <span class="pipeline-idx">
            {{ idx + 1 }}
            <span class="pipeline-idx-badge" aria-hidden="true">
              <el-icon v-if="isSuccess(step.status)" class="pipeline-idx-ico is-success"><CircleCheckFilled /></el-icon>
              <el-icon v-else-if="isFailed(step.status)" class="pipeline-idx-ico is-failed"><CircleCloseFilled /></el-icon>
              <el-icon v-else-if="isSkipped(step.status)" class="pipeline-idx-ico is-skipped"><RemoveFilled /></el-icon>
              <span v-else-if="isRunningStatus(step.status)" class="pipeline-idx-spinner" aria-hidden="true" />
              <span v-else class="pipeline-idx-dot" aria-hidden="true" />
            </span>
          </span>
          <div class="pipeline-chip">
            <span class="pipeline-name">{{ step.stageName }}</span>
            <span class="pipeline-sub">{{ formatDuration(pipelineDurationMs(step)) }}</span>
          </div>
        </div>
      </div>

      <div class="detail-progress">
        <el-progress :percentage="Number(detail.progress || 0)" :stroke-width="8" />
      </div>

      <div class="detail-trace-list">
        <div
          v-for="trace in detail.stageTraces || []"
          :key="`tpfd-${trace.stageCode}`"
          class="detail-trace-item"
          :class="traceItemClass(trace)"
        >
          <div class="detail-trace-item-left">
            <strong>{{ trace.stageName || trace.stageCode }}</strong>
            <el-tag size="small" :type="stageStatusTagType(trace.status)" effect="light">
              {{ trace.status || 'PENDING' }}
            </el-tag>
          </div>
          <div class="detail-trace-item-right">
            <span>耗时 {{ formatDuration(traceDurationMs(trace)) }}</span>
            <span v-if="trace.message" :title="trace.message">说明：{{ shortError(trace.message, 80) }}</span>
          </div>
        </div>
      </div>
    </template>
    <el-empty v-else-if="!loading" description="暂无任务详情" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { CircleCheckFilled, CircleCloseFilled, RemoveFilled } from '@element-plus/icons-vue'

const props = defineProps({
  detail: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  showRefresh: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['refresh'])

const showOverlayLoading = computed(() => props.loading && !props.detail)

const syncPillVisible = ref(false)
let syncShowTimer = null
let syncHideTimer = null
let syncShownAt = 0

const isRunningStatus = (status) => String(status || '').toUpperCase() === 'RUNNING'
const isSuccess = (status) => String(status || '').toUpperCase() === 'SUCCESS'
const isFailed = (status) => String(status || '').toUpperCase() === 'FAILED'
const isSkipped = (status) => String(status || '').toUpperCase() === 'SKIPPED'

const retryMetaText = computed(() => {
  const attempt = Number(props.detail?.attemptCount || 0)
  const max = Number(props.detail?.maxRetryAttempts || 0)
  const status = String(props.detail?.retryStatus || '').toUpperCase()
  const nextRetryAt = Number(props.detail?.nextRetryAt || 0)

  if (!attempt || !max) return ''
  if (status === 'SCHEDULED' && nextRetryAt > 0) {
    return `重试 ${attempt}/${max}，等待下次重试`
  }
  if (status === 'SUBMITTED') {
    return `重试 ${attempt}/${max}，已提交`
  }
  return `重试 ${attempt}/${max}`
})

watch(
  () => props.loading,
  (val) => {
    const shouldShow = Boolean(val && props.detail)
    if (shouldShow) {
      if (syncHideTimer) {
        clearTimeout(syncHideTimer)
        syncHideTimer = null
      }
      if (syncPillVisible.value) return
      if (syncShowTimer) return
      syncShowTimer = setTimeout(() => {
        syncShowTimer = null
        syncPillVisible.value = true
        syncShownAt = Date.now()
      }, 240)
      return
    }

    if (syncShowTimer) {
      clearTimeout(syncShowTimer)
      syncShowTimer = null
    }
    if (!syncPillVisible.value) return
    const elapsed = Date.now() - syncShownAt
    const remain = Math.max(0, 650 - elapsed)
    if (syncHideTimer) return
    syncHideTimer = setTimeout(() => {
      syncHideTimer = null
      syncPillVisible.value = false
    }, remain)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (syncShowTimer) clearTimeout(syncShowTimer)
  if (syncHideTimer) clearTimeout(syncHideTimer)
})

const pipelineDurationMs = (step) => Math.max(0, Number(step?.durationMs) || 0)
const traceDurationMs = (trace) => Math.max(0, Number(trace?.durationMs) || 0)

const formatDuration = (ms) => {
  const val = Number(ms)
  if (!Number.isFinite(val) || val <= 0) return '-'
  if (val < 1000) return `${Math.round(val)} 毫秒`
  if (val < 60_000) {
    const s = val / 1000
    return s >= 10 ? `${s.toFixed(1)} 秒` : `${s.toFixed(2)} 秒`
  }
  const sec = Math.floor(val / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`
}

const shortError = (text, limit = 56) => {
  const val = String(text || '').trim()
  if (!val) return '-'
  if (val.length <= limit) return val
  return `${val.slice(0, limit)}...`
}

const stageStatusTagType = (status) => {
  const s = String(status || '').toUpperCase()
  if (s === 'SUCCESS') return 'success'
  if (s === 'RUNNING') return 'primary'
  if (s === 'FAILED') return 'danger'
  if (s === 'CANCELLED') return 'warning'
  if (s === 'SKIPPED') return 'info'
  if (s === 'PENDING') return 'info'
  return 'warning'
}

const pipelineStepClass = (step) => {
  const s = String(step?.status || '').toUpperCase()
  return {
    'is-success': s === 'SUCCESS',
    'is-running': s === 'RUNNING',
    'is-failed': s === 'FAILED',
    'is-cancelled': s === 'CANCELLED',
    'is-skipped': s === 'SKIPPED',
    'is-pending': s === 'PENDING' || !s
  }
}

const traceItemClass = (trace) => {
  const s = String(trace?.status || '').toUpperCase()
  return {
    'is-success': s === 'SUCCESS',
    'is-running': s === 'RUNNING',
    'is-failed': s === 'FAILED',
    'is-cancelled': s === 'CANCELLED'
  }
}
</script>

<style scoped>
.tpfd-root {
  min-height: 120px;
}

.detail-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.detail-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.detail-top-main {
  min-width: 0;
}

.detail-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.detail-id {
  margin-top: 2px;
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}

.detail-stage {
  margin-top: 4px;
  font-size: 12px;
  color: #475569;
}

.sync-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
}

.detail-meta {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.detail-ctx {
  font-size: 11px;
  color: #64748b;
}

.detail-pipeline {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  margin: 10px 0;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow-x: auto;
}

.pipeline-node {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1 1 0;
}

.pipeline-idx {
  flex: 0 0 18px;
  height: 18px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.pipeline-idx-badge {
  position: absolute;
  right: -5px;
  bottom: -5px;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.pipeline-idx-ico {
  font-size: 12px;
}

.pipeline-idx-ico.is-success {
  color: #16a34a;
}

.pipeline-idx-ico.is-failed {
  color: #b42318;
}

.pipeline-idx-ico.is-skipped {
  color: #64748b;
}

.pipeline-idx-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #94a3b8;
}

.pipeline-idx-spinner {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  animation: tpfd-spin 0.8s linear infinite;
}

.pipeline-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.pipeline-name {
  font-size: 11px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pipeline-sub {
  font-size: 10px;
  color: #64748b;
}

.pipeline-node.is-success .pipeline-idx {
  background: #dcfce7;
  color: #166534;
}

.pipeline-node.is-success .pipeline-chip {
  border-color: #bbf7d0;
}

.pipeline-node.is-running .pipeline-idx {
  background: #dbeafe;
  color: #1d4ed8;
}

.pipeline-node.is-running .pipeline-chip {
  border-color: #93c5fd;
  background: #eff6ff;
}

.pipeline-node.is-failed .pipeline-idx {
  background: #fee2e2;
  color: #991b1b;
}

.pipeline-node.is-failed .pipeline-chip {
  border-color: #fecaca;
}

.pipeline-node.is-cancelled .pipeline-idx {
  background: #fef3c7;
  color: #92400e;
}

.pipeline-node.is-pending .pipeline-idx {
  background: #f1f5f9;
  color: #94a3b8;
}

.detail-progress {
  margin-top: 2px;
}

.detail-trace-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.detail-trace-item {
  border: 1px solid #e2e8f0;
  border-left: 3px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  background: #fff;
}

.detail-trace-item.is-running {
  border-left-color: #2563eb;
}

.detail-trace-item.is-success {
  border-left-color: #16a34a;
}

.detail-trace-item.is-failed {
  border-left-color: #b42318;
}

.detail-trace-item.is-cancelled {
  border-left-color: #d97706;
}

.detail-trace-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.detail-trace-item-right {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: #64748b;
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .pipeline-idx-spinner {
    animation: none;
  }
}

@keyframes tpfd-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
