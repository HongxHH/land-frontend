<template>
  <div class="tpfd-root" :class="{ 'is-live': hasLiveMotion }" v-loading="showOverlayLoading">
    <template v-if="detail">
      <div class="detail-top">
        <div class="detail-top-main">
          <div class="detail-name">{{ detail.taskName || '文件解析任务' }}</div>
          <div class="detail-id">{{ detail.fileName || '未命名文件' }}</div>
          <div class="detail-meta">
            <span v-if="detail.fileContextType" class="detail-ctx">类型 {{ detail.fileContextType }}</span>
            <el-tag v-if="detail.status" size="small" effect="plain" class="detail-job-status">{{ detail.status }}</el-tag>
            <span v-if="retryMetaText" class="detail-ctx">{{ retryMetaText }}</span>
            <span v-if="detail.retryReason" class="detail-ctx" :title="detail.retryReason">原因 {{ shortError(detail.retryReason, 48) }}</span>
          </div>
          <div class="detail-stage">
            当前阶段：{{ detail.currentStageName || detail.currentStageCode || '-' }}
            <span v-if="hasLiveMotion" class="live-pill">
              <span class="live-dot is-tiny" aria-hidden="true" />
              实时
            </span>
          </div>
        </div>
        <div class="detail-actions">
          <span v-if="syncPillVisible" class="sync-pill">
            <span class="live-dot is-sync" aria-hidden="true" />
            同步中
          </span>
          <el-button v-if="showRefresh" class="refresh-btn" size="small" type="primary" plain @click="emit('refresh')">刷新</el-button>
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
            <span class="pipeline-sub">
              <span v-if="isRunningStatus(step.status)" class="live-dot" aria-hidden="true" />
              {{ formatDuration(pipelineDurationMs(step)) }}
            </span>
            <span v-if="isRunningStatus(step.status)" class="chip-meter" aria-hidden="true">
              <span class="chip-meter-bar" />
            </span>
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
            <span>
              <span v-if="isRunningStatus(trace.status)" class="live-dot is-trace" aria-hidden="true" />
              耗时 {{ formatDuration(traceDurationMs(trace)) }}
            </span>
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
const isJobRunning = (status) => String(status || '').toUpperCase() === 'RUNNING'
const isSuccess = (status) => String(status || '').toUpperCase() === 'SUCCESS'
const isFailed = (status) => String(status || '').toUpperCase() === 'FAILED'
const isSkipped = (status) => String(status || '').toUpperCase() === 'SKIPPED'

const hasLiveMotion = computed(() => {
  const detail = props.detail
  if (!detail) return false
  if (!isJobRunning(detail.status)) return false
  return (detail.pipelineSteps || []).some((s) => isRunningStatus(s?.status)) || (detail.stageTraces || []).some((t) => isRunningStatus(t?.status))
})

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

const pipelineDurationMs = (step) => {
  return Math.max(0, Number(step?.durationMs) || 0)
}

const traceDurationMs = (trace) => {
  return Math.max(0, Number(trace?.durationMs) || 0)
}

const formatDuration = (ms) => {
  const val = Number(ms)
  if (!Number.isFinite(val) || val <= 0) return '-'
  // 明确单位，避免「12」被误读成秒；与 Pipeline 日志中的毫秒一致
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
  --tpfd-border: rgba(148, 163, 184, 0.32);
  --tpfd-soft-bg: linear-gradient(180deg, var(--home-panel-grad-start, #fbfdff) 0%, var(--home-panel-grad-end, #f5f9ff) 100%);
  --tpfd-title: #0f172a;
  --tpfd-sub: #64748b;
  --tpfd-text: #334155;
}

.detail-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid var(--tpfd-border);
  background: var(--tpfd-soft-bg);
}

.detail-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.detail-top-main {
  min-width: 0;
}

.detail-name {
  font-size: 15px;
  font-weight: 800;
  color: var(--tpfd-title);
  letter-spacing: 0.2px;
}

.detail-id {
  margin-top: 3px;
  font-size: 12px;
  color: var(--tpfd-sub);
  word-break: break-all;
}

.detail-stage {
  margin-top: 4px;
  font-size: 12px;
  color: var(--tpfd-text);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(37, 99, 235, 0.22);
  background: rgba(239, 246, 255, 0.9);
  color: #1d4ed8;
  font-weight: 800;
  font-size: 11px;
  line-height: 1;
}

.sync-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.85);
  color: #475569;
  font-weight: 700;
  font-size: 11px;
  line-height: 1;
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
  color: var(--tpfd-sub);
}

.detail-job-status {
  font-weight: 700;
}

.refresh-btn {
  border-radius: 10px;
  height: 32px;
  padding-left: 14px;
  padding-right: 14px;
  font-weight: 700;
}

.detail-pipeline {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 6px;
  margin: 12px 0 10px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid var(--tpfd-border);
  background: var(--tpfd-soft-bg);
  overflow-x: auto;
}

.pipeline-node {
  position: relative;
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
  background: rgba(148, 163, 184, 0.35);
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: visible;
}

.pipeline-idx-badge {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 22px -18px rgba(15, 23, 42, 0.35);
}

.pipeline-idx-ico {
  font-size: 14px;
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
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.95);
}

.pipeline-idx-spinner {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid rgba(37, 99, 235, 0.25);
  border-top-color: rgba(37, 99, 235, 0.95);
  animation: tpfdSpin 0.8s linear infinite;
}

.pipeline-chip {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  padding: 7px 8px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.pipeline-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, 0.38);
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.26);
}

.pipeline-name {
  font-size: 11px;
  font-weight: 800;
  color: var(--tpfd-title);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pipeline-sub {
  font-size: 10px;
  color: var(--tpfd-sub);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.85);
  box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.32);
  animation: tpfdPulse 1.3s ease-in-out infinite;
}

.live-dot.is-tiny {
  width: 5px;
  height: 5px;
}

.live-dot.is-sync {
  background: rgba(100, 116, 139, 0.8);
  box-shadow: 0 0 0 0 rgba(100, 116, 139, 0.25);
}

.live-dot.is-trace {
  background: rgba(37, 99, 235, 0.75);
}

.chip-meter {
  margin-top: 6px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.22);
  overflow: hidden;
}

.chip-meter-bar {
  display: block;
  height: 100%;
  width: 38%;
  border-radius: 999px;
  background-image: linear-gradient(90deg, rgba(37, 99, 235, 0) 0%, rgba(37, 99, 235, 0.9) 45%, rgba(37, 99, 235, 0) 100%);
  animation: tpfdMeter 1.05s ease-in-out infinite;
}

.pipeline-node.is-success .pipeline-idx {
  background: rgba(22, 163, 74, 0.2);
  color: #166534;
}

.pipeline-node.is-success .pipeline-chip {
  border-color: rgba(22, 163, 74, 0.28);
}

.pipeline-node.is-running .pipeline-idx {
  background: rgba(37, 99, 235, 0.2);
  color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
}

.pipeline-node.is-running .pipeline-chip {
  border-color: rgba(37, 99, 235, 0.3);
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(239, 246, 255, 0.92) 42%,
    rgba(255, 255, 255, 0.92) 70%
  );
  background-size: 220% 100%;
  animation: tpfdShimmer 1.35s ease-in-out infinite;
  box-shadow: 0 18px 40px -32px rgba(37, 99, 235, 0.75);
}

.pipeline-node.is-running .pipeline-chip::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: conic-gradient(
    from 0deg,
    rgba(59, 130, 246, 0) 0deg,
    rgba(59, 130, 246, 0.75) 60deg,
    rgba(37, 99, 235, 0) 140deg,
    rgba(59, 130, 246, 0.55) 240deg,
    rgba(59, 130, 246, 0) 360deg
  );
  filter: blur(0.2px);
  opacity: 0.75;
  animation: tpfdSpin 2.2s linear infinite;
  z-index: 0;
}

.pipeline-node.is-running .pipeline-chip::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.86);
  z-index: 1;
}

.pipeline-chip > * {
  position: relative;
  z-index: 2;
}

.pipeline-node.is-failed .pipeline-idx {
  background: rgba(180, 35, 24, 0.18);
  color: #991b1b;
}

.pipeline-node.is-failed .pipeline-chip {
  border-color: rgba(180, 35, 24, 0.24);
}

.pipeline-node.is-cancelled .pipeline-idx {
  background: rgba(194, 138, 54, 0.2);
  color: #92400e;
}

.pipeline-node.is-cancelled .pipeline-chip {
  border-color: rgba(194, 138, 54, 0.3);
}

.pipeline-node.is-skipped .pipeline-idx {
  background: rgba(148, 163, 184, 0.35);
  color: #64748b;
}

.pipeline-node.is-pending .pipeline-idx {
  background: #e2e8f0;
  color: #94a3b8;
}

.detail-progress {
  margin-top: 2px;
}

.detail-progress :deep(.el-progress__text) {
  color: #475569;
  font-weight: 700;
}

.tpfd-root.is-live .detail-progress :deep(.el-progress-bar__inner) {
  background-image: linear-gradient(
    90deg,
    var(--el-color-primary, #1f4e79) 0%,
    rgba(59, 130, 246, 0.95) 40%,
    var(--el-color-primary, #1f4e79) 80%
  );
  background-size: 200% 100%;
  animation: tpfdShimmer 1.6s ease-in-out infinite;
}

.detail-trace-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 2px;
}

.detail-trace-item {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 14px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  background: #ffffff;
  box-shadow: 0 10px 24px -22px rgba(15, 23, 42, 0.28);
  transition: transform 0.12s ease, border-color 0.12s ease;
  position: relative;
  overflow: hidden;
}

.detail-trace-item.is-running {
  border-color: rgba(37, 99, 235, 0.3);
}

.detail-trace-item.is-running::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.95) 0%, rgba(59, 130, 246, 0.6) 60%, rgba(37, 99, 235, 0.95) 100%);
  animation: tpfdGlow 1.15s ease-in-out infinite;
}

.detail-trace-item.is-failed {
  border-color: rgba(180, 35, 24, 0.24);
}

.detail-trace-item.is-cancelled {
  border-color: rgba(194, 138, 54, 0.32);
}

.detail-trace-item:hover {
  transform: translateY(-1px);
  border-color: rgba(148, 163, 184, 0.4);
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
  gap: 3px;
  font-size: 12px;
  color: #475569;
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .live-dot,
  .pipeline-node.is-running .pipeline-chip,
  .tpfd-root.is-live .detail-progress :deep(.el-progress-bar__inner),
  .chip-meter-bar,
  .pipeline-idx-spinner,
  .pipeline-node.is-running .pipeline-chip::before,
  .detail-trace-item.is-running::before {
    animation: none;
  }
}

@keyframes tpfdShimmer {
  0% {
    background-position: 180% 0;
  }
  100% {
    background-position: -40% 0;
  }
}

@keyframes tpfdPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28);
    opacity: 0.85;
  }
  60% {
    box-shadow: 0 0 0 7px rgba(37, 99, 235, 0);
    opacity: 1;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
    opacity: 0.9;
  }
}

@keyframes tpfdMeter {
  0% {
    transform: translateX(-30%);
    opacity: 0.75;
  }
  50% {
    transform: translateX(130%);
    opacity: 1;
  }
  100% {
    transform: translateX(260%);
    opacity: 0.75;
  }
}

@keyframes tpfdSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes tpfdGlow {
  0% {
    opacity: 0.65;
    filter: blur(0px);
  }
  60% {
    opacity: 1;
    filter: blur(0.2px);
  }
  100% {
    opacity: 0.75;
    filter: blur(0px);
  }
}
</style>
