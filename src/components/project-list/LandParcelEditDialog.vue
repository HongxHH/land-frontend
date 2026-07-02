<template>
  <el-dialog
    v-model="visible"
    title="地块信息编辑"
    fullscreen
    append-to-body
    class="land-workspace-dialog"
    :close-on-click-modal="false"
    :destroy-on-close="false"
  >
    <div class="land-workspace-root">
      <div class="land-workspace-topbar">
        <div class="topbar-left">
          <span class="topbar-title">地块工作区</span>
          <span class="topbar-sub">全屏工作区 · 可拖动中间分隔条调整左右宽度</span>
        </div>
      </div>

      <div ref="auditLayoutRef" class="audit-split-layout audit-split-layout--responsive land-workspace-split">
        <section class="pdf-panel audit-split-layout__left" :style="leftPanelStyle" v-loading="pdfLoading">
          <iframe v-if="pdfUrl" class="pdf-frame" :src="pdfUrl" title="合同预览" />
          <el-empty v-else description="暂无可预览 PDF" />
        </section>

        <div
          class="audit-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调节左右区域宽度"
          @pointerdown="onSplitterMouseDown"
        />

        <section class="form-panel audit-split-layout__right">
          <div class="panel-title">地块字段</div>
          <div class="file-picker-row">
            <el-select
              :model-value="selectedFileId"
              filterable
              clearable
              placeholder="选择项目文件（可搜索）"
              class="file-picker-select"
              popper-class="project-file-select-dropdown"
              :loading="fileOptionsLoading"
              @update:model-value="(v) => emit('update:selectedFileId', v)"
            >
              <el-option v-for="item in fileOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="form-meta">
            <div class="meta-item">
              <span class="k">地块编号</span>
              <span class="v">{{ form.parcelCode || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">地块名称</span>
              <span class="v">{{ form.parcelName || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">规划用途</span>
              <span class="v">{{ plannedUseLabel(form.plannedUse) }}</span>
            </div>
            <div class="meta-item">
              <span class="k">总面积</span>
              <span class="v">{{ formatNumber(form.totalArea) }} ㎡</span>
            </div>
          </div>

          <el-form :ref="setFormRef" :model="form" :rules="rules" label-position="top" class="land-form land-form-scroll">
            <el-form-item label="地块编号" prop="parcelCode">
              <el-input
                :model-value="form.parcelCode"
                placeholder="请输入地块编号"
                @update:model-value="setFormField('parcelCode', $event)"
              />
            </el-form-item>
            <el-form-item label="地块名称" prop="parcelName">
              <el-input
                :model-value="form.parcelName"
                placeholder="请输入地块名称"
                @update:model-value="setFormField('parcelName', $event)"
              />
            </el-form-item>
            <el-form-item label="规划用途" prop="plannedUse">
              <el-select
                :model-value="form.plannedUse"
                placeholder="请选择规划用途"
                clearable
                @update:model-value="setFormField('plannedUse', $event)"
              >
                <el-option label="住宅" value="RESIDENTIAL" />
                <el-option label="商业" value="COMMERCIAL" />
                <el-option label="商住混合" value="COMMERCIAL_AND_RESIDENTIAL" />
              </el-select>
            </el-form-item>
            <el-form-item label="建筑总面积(㎡)" prop="totalArea">
              <el-input-number
                :model-value="form.totalArea"
                :precision="2"
                :min="0"
                @update:model-value="setFormField('totalArea', $event)"
              />
            </el-form-item>
            <el-form-item label="住宅面积(㎡)" prop="residentialArea" class="readonly-area-item">
              <el-input-number
                :model-value="form.residentialArea"
                :precision="2"
                :min="0"
                disabled
                @update:model-value="setFormField('residentialArea', $event)"
              />
            </el-form-item>
            <el-form-item label="商业面积(㎡)" prop="commercialArea" class="readonly-area-item">
              <el-input-number
                :model-value="form.commercialArea"
                :precision="2"
                :min="0"
                disabled
                @update:model-value="setFormField('commercialArea', $event)"
              />
            </el-form-item>
            <el-form-item label="商住比（必填）" prop="commercialResidentialRatio">
              <el-input-number
                :model-value="form.commercialResidentialRatio"
                :precision="4"
                :min="0"
                :max="1"
                :step="0.0001"
                @update:model-value="setFormField('commercialResidentialRatio', $event)"
              />
              <div class="ratio-hint">{{ ratioHint }}</div>
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input
                :model-value="form.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
                @update:model-value="setFormField('remark', $event)"
              />
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">确认保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  form: {
    type: Object,
    required: true
  },
  rules: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  setFormRef: {
    type: Function,
    default: () => {}
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  pdfLoading: {
    type: Boolean,
    default: false
  },
  fileOptions: { type: Array, default: () => [] },
  fileOptionsLoading: { type: Boolean, default: false },
  selectedFileId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['update:modelValue', 'update:form', 'submit', 'update:selectedFileId'])

const setFormField = createFormFieldPatcher(props, emit, 'form')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 55,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  }
})

const plannedUseLabel = (value) => {
  if (value === 'RESIDENTIAL') return '住宅'
  if (value === 'COMMERCIAL') return '商业'
  if (value === 'COMMERCIAL_AND_RESIDENTIAL') return '商住混合'
  return value || '-'
}

const formatNumber = (value) => {
  const n = Number(value)
  if (Number.isNaN(n)) return '0.00'
  return n.toFixed(2)
}

const ratioHint = computed(() => {
  const ratio = Number(props.form?.commercialResidentialRatio)
  if (!Number.isFinite(ratio)) return '请输入 0~1 小数，例如 0.6（表示商业60%、住宅40%）'
  if (ratio < 0 || ratio > 1) return '商住比必须在 0 到 1 之间'
  const commercialPercent = (ratio * 100).toFixed(2)
  const residentialPercent = ((1 - ratio) * 100).toFixed(2)
  return `当前占比：商业 ${commercialPercent}% ，住宅 ${residentialPercent}%`
})
</script>

<style scoped>
.land-workspace-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.land-workspace-topbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid #e9eef7;
  border-radius: 10px;
  background: #fff;
}

.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1f2d3d;
}

.topbar-sub {
  font-size: 12px;
  color: #7a879a;
}

.land-workspace-split {
  flex: 1;
  min-height: 240px;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
  overflow: hidden;
}

.pdf-panel,
.form-panel {
  border: 1px solid #e6ebf3;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pdf-panel {
  position: relative;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #243447;
  margin-bottom: 10px;
}

.pdf-frame {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  border: none;
  border-radius: 8px;
}

.form-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
  border: 1px solid #edf1f7;
  border-radius: 8px;
  padding: 8px;
  background: #f8fbff;
}

.file-picker-row {
  margin-bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.file-picker-select {
  width: 320px;
}

:deep(.file-picker-select .el-input__wrapper) {
  min-height: 34px;
}

:deep(.project-file-select-dropdown .el-select-dropdown__wrap) {
  max-height: 280px;
}

.meta-item {
  min-width: 0;
}

.meta-item .k {
  display: block;
  font-size: 12px;
  color: #7b8798;
}

.meta-item .v {
  display: block;
  font-size: 13px;
  color: #243447;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.land-form-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

:deep(.land-form .el-form-item) {
  margin-bottom: 16px;
}

:deep(.land-form .el-input-number),
:deep(.land-form .el-select),
:deep(.land-form .el-input) {
  width: 100%;
}

:deep(.readonly-area-item .el-input-number.is-disabled .el-input__wrapper) {
  background: #f3f5f8;
  border-color: #d8dee9;
}

:deep(.readonly-area-item .el-input.is-disabled .el-input__wrapper) {
  background: #f3f5f8;
}

.ratio-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #5b6472;
  line-height: 1.5;
}

@media (max-width: 1280px) {
  .land-workspace-split .pdf-panel {
    min-height: 360px;
    height: 46vh;
  }

  .land-workspace-split .form-panel {
    min-height: 280px;
  }

  .form-meta {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
:deep(.land-workspace-dialog.el-dialog) {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  height: 100vh;
  max-height: 100dvh;
  border-radius: 0;
}

:deep(.land-workspace-dialog .el-dialog__header) {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid #e4ebf4;
}

:deep(.land-workspace-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  box-sizing: border-box;
}

:deep(.land-workspace-dialog .el-dialog__footer) {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border-top: 1px solid #eef2f7;
}
</style>
