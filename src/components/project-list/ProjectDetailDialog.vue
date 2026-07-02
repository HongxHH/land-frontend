<template>
  <el-dialog
    v-model="visible"
    title="楼栋实测明细"
    width="1220px"
    top="5vh"
    class="no-print detail-dialog"
    :close-on-click-modal="true"
    :destroy-on-close="false"
  >
    <!-- 顶部仅保留校验摘要：全宽横排，便于在补录与户室表之前快速把握结论 -->
    <section class="audit-overview" aria-label="校验信息">
      <div class="audit-overview__intro">
        <div class="audit-overview__icon" aria-hidden="true">
          <el-icon><CircleCheck /></el-icon>
        </div>
        <div class="audit-overview__intro-text">
          <h4 class="audit-overview__title">校验信息</h4>
          <p class="audit-overview__subtitle">用途与面积校验结果</p>
        </div>
      </div>
      <div class="audit-overview__metrics">
        <div class="audit-metric">
          <span class="audit-metric__label">待确认面积</span>
          <span class="audit-metric__value audit-metric__value--warn">{{ reportAuditInfo.pendingConfirmArea }}</span>
          <span class="audit-metric__unit">㎡</span>
        </div>
        <div class="audit-metric">
          <span class="audit-metric__label">未知用途数量</span>
          <span class="audit-metric__value">{{ reportAuditInfo.unknownUsageCount }}</span>
          <span class="audit-metric__unit">条</span>
        </div>
        <div class="audit-metric">
          <span class="audit-metric__label">未知用途</span>
          <div class="audit-metric__tag-wrap">
            <el-tag size="small" effect="light" round :type="reportAuditInfo.hasUnknownUsage === 1 ? 'warning' : 'success'">
              {{ reportAuditInfo.hasUnknownUsage === 1 ? '有' : '无' }}
            </el-tag>
          </div>
        </div>
        <div class="audit-metric">
          <span class="audit-metric__label">校验状态</span>
          <div class="audit-metric__tag-wrap">
            <el-tag size="small" effect="light" round :type="reportAuditInfo.isVerified === 1 ? 'success' : 'danger'">
              {{ reportAuditInfo.isVerified === 1 ? '已通过' : '未通过' }}
            </el-tag>
          </div>
        </div>
      </div>
    </section>

    <div v-if="reportAuditInfo.verificationErrorReason && reportAuditInfo.verificationErrorReason !== '-'" class="verify-error">
      <el-icon class="verify-error__icon"><WarningFilled /></el-icon>
      <div>
        <span class="verify-error__label">校验失败原因</span>
        <p class="verify-error__content">{{ reportAuditInfo.verificationErrorReason }}</p>
      </div>
    </div>

    <section class="basic-info-panel">
      <div class="basic-info-panel__body">
        <el-form class="basic-info-form" label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="不动产权证编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyCertificateNumber"
                  maxlength="80"
                  clearable
                  placeholder="请输入"
                  @update:model-value="(v) => emit('update:propertyCertificateNumber', v)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="合同 / 批文编号">
                <el-input
                  :model-value="reportBasicInfoForm.propertyAreaConfirmationNoticeNumber"
                  maxlength="80"
                  clearable
                  placeholder="请输入"
                  @update:model-value="(v) => emit('update:propertyAreaConfirmationNoticeNumber', v)"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <div class="basic-info-panel__actions">
          <el-button
            class="save-basic-btn"
            type="primary"
            :loading="reportBasicInfoSaving"
            @click="emit('save-basic-info')"
          >
            <el-icon class="save-basic-btn__ico"><Select /></el-icon>
            保存
          </el-button>
        </div>
      </div>
    </section>

    <div class="table-shell">
      <div class="table-toolbar">
        <span class="title">户室列表</span>
        <div class="toolbar-right">
          <span class="count">共 {{ roomInfoData.length }} 条</span>
          <el-button
            class="jump-btn"
            size="small"
            type="default"
            :disabled="!canJumpAudit"
            @click="emit('jump-audit', currentDetailRow)"
          >
            审核
          </el-button>
        </div>
      </div>

      <div ref="tableContainer" class="table-container">
        <el-table
          :data="roomInfoData"
          border
          stripe
          size="small"
          height="100%"
          v-loading="detailLoading"
          element-loading-text="加载户室数据中..."
        >
          <el-table-column label="序号" type="index" width="60" align="center" :index="(index) => index + 1" />
          <el-table-column prop="roomLevel" label="楼层" width="80" align="center" />
          <el-table-column prop="roomNumber" label="房号" width="100" align="center" />
          <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center" />
          <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center" />
          <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center" />
          <el-table-column prop="sharedArea" label="公摊面积(㎡)" width="120" align="center" />
          <el-table-column prop="usageCategory" label="用途类别" width="120" align="center" />
          <el-table-column prop="roomUsage" label="用途" min-width="120" show-overflow-tooltip align="center" />
          <el-table-column prop="floorAreaType" label="面积类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                {{ row.floorAreaType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
            <template #default="{ row }">
              <span :class="row.isCalculate === 1 ? 'red-text' : ''">
                {{ row.isCalculate === 1 ? '是' : '否' }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="resize-handle-bottom" @mousedown="startResize" />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { CircleCheck, WarningFilled, Select } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  reportAuditInfo: { type: Object, required: true },
  roomInfoData: { type: Array, default: () => [] },
  detailLoading: { type: Boolean, default: false },
  currentDetailRow: { type: Object, default: null },
  canJumpAudit: { type: Boolean, default: false },
  reportBasicInfoForm: {
    type: Object,
    required: true
  },
  reportBasicInfoSaving: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'jump-audit',
  'save-basic-info',
  'update:propertyCertificateNumber',
  'update:propertyAreaConfirmationNoticeNumber'
])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const tableContainer = ref(null)
const isResizing = ref(false)
let stopResize = null

const startResize = (event) => {
  const container = tableContainer.value
  if (!container) return
  isResizing.value = true
  const startY = event.clientY
  const startHeight = container.offsetHeight

  const handleMouseMove = (moveEvent) => {
    if (!isResizing.value) return
    const nextHeight = Math.max(280, Math.min(760, startHeight + (moveEvent.clientY - startY)))
    container.style.height = `${nextHeight}px`
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  stopResize = handleMouseUp
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

onBeforeUnmount(() => {
  if (stopResize) stopResize()
})
</script>

<style scoped>
.audit-overview {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 14px 18px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 253, 244, 0.35) 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 10px 28px -16px rgba(15, 23, 42, 0.1);
}

.audit-overview__intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 0 0 auto;
  min-width: min(220px, 100%);
  padding-right: 8px;
  border-right: 1px solid rgba(226, 232, 240, 0.95);
}

.audit-overview__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(145deg, #10b981 0%, #059669 100%);
  box-shadow: 0 6px 14px -6px rgba(5, 150, 105, 0.45);
}

.audit-overview__intro-text {
  min-width: 0;
}

.audit-overview__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--biz-text, #1f2d3d);
  line-height: 1.3;
}

.audit-overview__subtitle {
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--biz-subtext, #64748b);
}

.audit-overview__metrics {
  flex: 1 1 520px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  align-items: stretch;
}

.audit-metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.9);
  min-height: 72px;
  box-sizing: border-box;
}

.audit-metric__tag-wrap {
  margin-top: auto;
}

.audit-metric__label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.3;
}

.audit-metric__value {
  font-size: 18px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  line-height: 1.2;
}

.audit-metric__value--warn {
  color: #c2410c;
}

.audit-metric__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.verify-error {
  margin-top: 14px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(251, 113, 133, 0.45);
  background: linear-gradient(135deg, rgba(255, 241, 242, 0.95) 0%, rgba(255, 228, 230, 0.55) 100%);
  font-size: 13px;
  color: #9f1239;
}

.verify-error__icon {
  flex-shrink: 0;
  font-size: 20px;
  margin-top: 2px;
  color: #e11d48;
}

.verify-error__label {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
  color: #be123c;
}

.verify-error__content {
  margin: 0;
  line-height: 1.55;
  color: #881337;
}

.basic-info-panel {
  margin-top: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.97) 0%, rgba(241, 245, 249, 0.5) 100%);
  box-shadow: 0 8px 24px -18px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.basic-info-panel__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 16px 20px;
  padding: 14px 16px 16px;
}

.basic-info-form {
  min-width: 0;
}

.basic-info-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.basic-info-form :deep(.el-form-item__label) {
  font-weight: 600;
  color: #475569;
  font-size: 12.5px;
}

.basic-info-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.basic-info-panel__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 2px;
}

:deep(.save-basic-btn.el-button--primary) {
  min-height: 40px;
  padding: 10px 22px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 20px -10px rgba(29, 78, 216, 0.65);
}

:deep(.save-basic-btn.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

.save-basic-btn__ico {
  margin-right: 4px;
  font-size: 16px;
}

.table-shell {
  border: 1px solid var(--home-soft-border, #dbe4ef);
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
  margin-top: 14px;
  box-shadow: var(--home-soft-shadow, 0 14px 36px -24px rgba(15, 23, 42, 0.2));
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(219, 228, 239, 0.9);
  padding: 12px 14px;
  background: linear-gradient(180deg, var(--home-header-grad-start, #f8fbff) 0%, var(--home-header-grad-end, #f1f6fc) 100%);
}

.table-toolbar .title {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.toolbar-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.table-toolbar .count {
  font-size: 12px;
  color: #64748b;
}

:deep(.jump-btn.el-button) {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  border-radius: 10px;
  font-weight: 700;
  height: 32px;
  padding: 0 14px;
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background-color 0.12s ease;
}

:deep(.jump-btn.el-button:hover) {
  border-color: rgba(148, 163, 184, 0.5);
  background: #ffffff;
  box-shadow: 0 12px 26px -22px rgba(15, 23, 42, 0.32);
  transform: translateY(-1px);
}

.table-container {
  height: 500px;
  min-height: 280px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.55) 100%);
}

.table-container :deep(.el-table) {
  background: transparent;
}

.table-container :deep(.el-table__header-wrapper th.el-table__cell) {
  background: rgba(241, 246, 252, 0.95);
  color: #445468;
  font-weight: 700;
}

.table-container :deep(.el-table__row:hover > td.el-table__cell) {
  background: rgba(240, 247, 255, 0.9) !important;
}

.resize-handle-bottom {
  height: 8px;
  cursor: ns-resize;
  background: linear-gradient(180deg, rgba(241, 246, 252, 0.9) 0%, rgba(233, 237, 244, 0.95) 100%);
  border-top: 1px solid rgba(219, 228, 239, 0.9);
}

.red-text {
  color: #b42318;
  font-weight: 700;
}

@media (max-width: 1100px) {
  .audit-overview__intro {
    flex: 1 1 100%;
    border-right: none;
    padding-right: 0;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  }

  .audit-overview__metrics {
    flex: 1 1 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .audit-overview__metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1280px) {
  .basic-info-panel__body {
    grid-template-columns: 1fr;
  }

  .basic-info-panel__actions {
    justify-content: stretch;
  }

  :deep(.save-basic-btn.el-button--primary) {
    width: 100%;
  }
}
</style>

<style>
/* 弹窗标题与内边距，类挂在 teleport 后的 dialog 上需非 scoped */
.detail-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 64px -20px rgba(15, 23, 42, 0.28);
}

.detail-dialog .el-dialog__header {
  padding: 16px 20px 12px;
  margin: 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.detail-dialog .el-dialog__title {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--biz-text, #1f2d3d);
}

.detail-dialog .el-dialog__body {
  padding: 16px 20px 20px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 55%, #eef2f6 100%);
}
</style>
