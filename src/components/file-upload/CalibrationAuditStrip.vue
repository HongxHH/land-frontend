<template>
  <section class="sum-info-section">
    <div class="cali-audit-strip" :class="auditStripClass">
      <div class="cali-audit-strip__brand">
        <el-icon class="cali-audit-strip__icon" aria-hidden="true">
          <component :is="isAuditPassed && !hasPendingUnknownUsage ? CircleCheck : WarningFilled" />
        </el-icon>
        <span class="cali-audit-strip__title">校验信息</span>
      </div>

      <div class="cali-audit-strip__metrics">
        <span class="cali-audit-metric">
          <span class="cali-audit-metric__label">待确认</span>
          <span
            class="cali-audit-metric__value"
            :class="{ 'cali-audit-metric__value--warn': hasPendingConfirmArea }"
          >
            {{ auditSummaryData.pendingConfirmArea }}㎡
          </span>
        </span>
        <span class="cali-audit-metric__sep" aria-hidden="true" />
        <span class="cali-audit-metric">
          <span class="cali-audit-metric__label">待确认户室</span>
          <span class="cali-audit-metric__value">{{ auditSummaryData.unknownUsageCount }}条</span>
          <el-tag
            size="small"
            effect="light"
            round
            :type="auditSummaryDisplay.hasUnknownUsageText === '有' ? 'warning' : 'success'"
          >
            {{ auditSummaryDisplay.hasUnknownUsageText }}
          </el-tag>
        </span>
        <template v-if="missingUsageCount > 0">
          <span class="cali-audit-metric__sep" aria-hidden="true" />
          <span class="cali-audit-metric">
            <span class="cali-audit-metric__label">用途缺失</span>
            <span class="cali-audit-metric__value cali-audit-metric__value--warn"
              >{{ missingUsageCount }}户</span
            >
          </span>
        </template>
      </div>

      <div class="cali-audit-strip__actions">
        <el-tag size="small" effect="light" round :type="auditSummaryDisplay.isVerifiedTagType">
          {{ auditSummaryDisplay.isVerifiedText }}
        </el-tag>
      </div>
    </div>

    <div v-if="showUnknownUsagePolicyPanel" class="policy-card policy-card--audit no-print">
      <div class="policy-head">
        <div class="head-left">
          <el-icon color="#e65f4d" size="18"><WarningFilled /></el-icon>
          <span class="title">检测到 {{ unknownUsageClassCount }} 类待确认用途，请处理</span>
        </div>
      </div>

      <div v-loading="calibrationUnknownLoading">
        <UnknownUsagePolicyList
          v-if="calibrationUnknownRows.length > 0"
          :rows="calibrationUnknownRows"
          :project-id="projectId"
          :highlight-usage-name="focusUsageName"
          :focus-mode="focusMode"
          show-locate-button
          @locate-usage="(name) => emit('locate-usage', name)"
          @filter-missing-usage="emit('filter-missing-usage')"
        />
        <div v-else-if="!calibrationUnknownLoading" class="calibration-unknown-policy__hint">
          未找到待处理的未知用途记录（可能已在土地类型管理中处理）。
        </div>
      </div>
    </div>

    <div v-if="showAuditDetailPanel" class="cali-audit-detail-panel">
      <div class="cali-audit-detail-panel__body">
        <el-alert
          v-if="showMissingUsageAlert"
          class="audit-missing-usage-alert"
          type="error"
          :closable="false"
          show-icon
          :title="`存在 ${missingUsageCount} 户用途未识别，导出前请补全`"
        />
        <div v-if="hasVerificationErrorReason" class="audit-append-block">
          <div class="audit-append-label">验证失败原因</div>
          <div class="reason-text reason-text--panel">
            {{ auditSummaryData.verificationErrorReason }}
          </div>
        </div>
        <div v-if="hasVerificationErrorReason" class="audit-append-block verify-tip-block">
          <div class="verify-tip-title">排查建议</div>
          <div class="verify-tip-line">1. 请检查解析文件方向。</div>
          <div class="verify-tip-line">2. 请审查户室面积对照表的部分数据是否被印章遮盖。</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, toRef } from 'vue'
import { useCalibrationUnknownUsagePolicy } from '@/composables/file-upload/useCalibrationUnknownUsagePolicy'
import {
  countMissingUsageFromSummary,
  reportHasPendingUnknownUsage,
} from '@/composables/file-upload/surveyUsagePending'
import UnknownUsagePolicyList from '@/components/shared/UnknownUsagePolicyList.vue'
import { CircleCheck, WarningFilled } from '@element-plus/icons-vue'

const AREA_COMPARE_TOLERANCE = 0.01

const props = defineProps({
  open: { type: Boolean, default: false },
  auditSummaryData: { type: Object, required: true },
  auditSummaryDisplay: { type: Object, required: true },
  projectId: { type: [String, Number], default: '' },
  currentFile: { type: Object, default: null },
  focusUsageName: { type: String, default: '' },
  focusMode: { type: String, default: '' },
})

const emit = defineEmits(['locate-usage', 'filter-missing-usage'])

const openRef = toRef(props, 'open')
const auditSummaryDataRef = computed(() => props.auditSummaryData)
const projectIdRef = computed(() => props.projectId)
const currentFileRef = computed(() => props.currentFile)

const { calibrationUnknownRows, calibrationUnknownLoading } = useCalibrationUnknownUsagePolicy({
  dialogOpen: openRef,
  projectId: projectIdRef,
  auditSummaryData: auditSummaryDataRef,
  currentFile: currentFileRef,
})

const unknownUsageClassCount = computed(() => {
  return new Set(
    calibrationUnknownRows.value
      .map((row) => String(row?.usageName || '').trim())
      .filter(Boolean)
  ).size
})

const showUnknownUsagePolicyPanel = computed(
  () => props.open && reportHasPendingUnknownUsage(props.auditSummaryData)
)

const isAuditPassed = computed(() => Number(props.auditSummaryData?.isVerified) === 1)
const hasPendingUnknownUsage = computed(() => reportHasPendingUnknownUsage(props.auditSummaryData))

const auditStripClass = computed(() => {
  if (!isAuditPassed.value) return 'cali-audit-strip--failed'
  if (hasPendingUnknownUsage.value) return 'cali-audit-strip--passed-pending'
  return 'cali-audit-strip--passed'
})

const hasVerificationErrorReason = computed(() => {
  const reason = String(props.auditSummaryData?.verificationErrorReason || '').trim()
  return !!reason && reason !== '-' && reason.toLowerCase() !== 'null'
})

const missingUsageCount = computed(() =>
  countMissingUsageFromSummary(props.auditSummaryData?.unknownUsages)
)

const showMissingUsageAlert = computed(
  () => missingUsageCount.value > 0 && !showUnknownUsagePolicyPanel.value
)

const showAuditDetailPanel = computed(
  () =>
    (!isAuditPassed.value && hasVerificationErrorReason.value) || showMissingUsageAlert.value
)

const hasPendingConfirmArea = computed(
  () => Number(props.auditSummaryData?.pendingConfirmArea) > AREA_COMPARE_TOLERANCE
)
</script>
