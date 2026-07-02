<template>
  <el-dialog
    :model-value="modelValue"
    title="任务阶段详情"
    width="680px"
    destroy-on-close
    append-to-body
    class="parse-flow-archive-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <TaskParseFlowDetailPanel
      :detail="detail"
      :loading="loading"
      @refresh="emit('refresh')"
    />
  </el-dialog>
</template>

<script setup>
import TaskParseFlowDetailPanel from '@/components/layout/TaskParseFlowDetailPanel.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  detail: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'refresh'])
</script>

<style scoped>
:deep(.parse-flow-archive-dialog.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--home-soft-border);
  box-shadow: var(--home-soft-shadow);
}

:deep(.parse-flow-archive-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(219, 228, 239, 0.9);
  background: linear-gradient(180deg, var(--home-header-grad-start) 0%, var(--home-header-grad-end) 100%);
}

:deep(.parse-flow-archive-dialog .el-dialog__title) {
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

:deep(.parse-flow-archive-dialog .el-dialog__headerbtn) {
  top: 14px;
  right: 14px;
}

:deep(.parse-flow-archive-dialog .el-dialog__headerbtn .el-dialog__close) {
  border-radius: 10px;
}

:deep(.parse-flow-archive-dialog .el-dialog__body) {
  padding: 14px 18px 18px;
  background: #ffffff;
}
</style>
