<template>
  <el-dialog
    v-model="visible"
    title="合同信息编辑"
    fullscreen
    append-to-body
    class="contract-workspace-dialog"
    :close-on-click-modal="false"
    :destroy-on-close="false"
  >
    <div class="contract-workspace-root">
      <div
        ref="auditLayoutRef"
        class="audit-split-layout audit-split-layout--responsive contract-workspace-split"
      >
        <section class="pdf-panel audit-split-layout__left" :style="leftPanelStyle" v-loading="pdfLoading">
          <div class="pdf-panel-toolbar">
            <el-select
              :model-value="selectedFileId"
              filterable
              clearable
              placeholder="切换预览文件"
              class="pdf-file-select"
              popper-class="project-file-select-dropdown"
              :loading="fileOptionsLoading"
              :title="fileName || undefined"
              @update:model-value="(v) => emit('update:selectedFileId', v)"
            >
              <el-option v-for="item in fileOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <iframe v-if="pdfUrl" class="pdf-frame" :src="pdfUrl" title="合同预览" />
          <el-empty v-else class="pdf-empty" description="暂无可预览PDF" />
        </section>

        <div
          class="audit-splitter"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调节左右区域宽度"
          @pointerdown="onSplitterMouseDown"
        />

        <section class="form-panel audit-split-layout__right">
          <div class="panel-title">合同字段</div>
          <div class="form-meta">
            <div class="meta-item">
              <span class="k">合同编号</span>
              <span class="v">{{ form.contractNumber || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">出让方</span>
              <span class="v">{{ form.transferor || '-' }}</span>
            </div>
            <div class="meta-item">
              <span class="k">受让方</span>
              <span class="v">{{ form.transferee || '-' }}</span>
            </div>
          </div>
          <el-form :ref="setFormRef" :model="form" :rules="rules" label-position="top" class="contract-form contract-form-scroll">
            <el-form-item label="合同编号" prop="contractNumber">
              <el-input
                :model-value="form.contractNumber"
                placeholder="请输入合同编号"
                @update:model-value="setFormField('contractNumber', $event)"
              />
            </el-form-item>
            <el-form-item label="出让方" prop="transferor">
              <el-input
                :model-value="form.transferor"
                placeholder="请输入出让方"
                @update:model-value="setFormField('transferor', $event)"
              />
            </el-form-item>
            <el-form-item label="受让方" prop="transferee">
              <el-input
                :model-value="form.transferee"
                placeholder="请输入受让方"
                @update:model-value="setFormField('transferee', $event)"
              />
            </el-form-item>
            <el-form-item label="备注" prop="remark">
              <el-input
                :model-value="form.remark"
                type="textarea"
                :rows="4"
                placeholder="请输入备注"
                @update:model-value="setFormField('remark', $event)"
              />
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="emit('submit')">保存修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  form: { type: Object, required: true },
  rules: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  setFormRef: { type: Function, default: () => {} },
  pdfUrl: { type: String, default: '' },
  pdfLoading: { type: Boolean, default: false },
  fileName: { type: String, default: '' },
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
</script>

<style scoped>
.contract-workspace-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.contract-workspace-split {
  flex: 1;
  min-height: 240px;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
  overflow: hidden;
}

.pdf-panel-toolbar {
  flex-shrink: 0;
  margin-bottom: 8px;
  min-width: 0;
}

.pdf-file-select {
  width: 100%;
}

:deep(.pdf-file-select .el-select__wrapper) {
  min-height: 32px;
}

:deep(.project-file-select-dropdown .el-select-dropdown__wrap) {
  max-height: 280px;
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

.pdf-empty {
  flex: 1 1 auto;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contract-form-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
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

:deep(.contract-form .el-form-item) {
  margin-bottom: 16px;
}

:deep(.contract-form .el-form-item__label) {
  color: #46566e;
  font-weight: 600;
}

:deep(.contract-form .el-input__wrapper),
:deep(.contract-form .el-textarea__inner),
:deep(.contract-form .el-select__wrapper),
:deep(.contract-form .el-input-number) {
  border-radius: 8px;
}

@media (max-width: 1280px) {
  .contract-workspace-split .pdf-panel {
    min-height: 360px;
    height: 46vh;
  }

  .contract-workspace-split .form-panel {
    min-height: 280px;
  }

  .form-meta {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
.contract-workspace-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  margin: 0 !important;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  border-radius: 0;
}

.contract-workspace-dialog .el-dialog__header {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid #e4ebf4;
}

.contract-workspace-dialog .el-dialog__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  box-sizing: border-box;
}

.contract-workspace-dialog .el-dialog__footer {
  flex-shrink: 0;
  padding: 10px 16px 12px;
  margin: 0;
  border-top: 1px solid #eef2f7;
}
</style>
