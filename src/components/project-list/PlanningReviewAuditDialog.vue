<template>
  <el-dialog
    v-model="dialogVisible"
    title="规划复核审核"
    fullscreen
    append-to-body
    :close-on-click-modal="false"
    class="planning-audit-dialog"
    @closed="handleClosed"
  >
    <div
      ref="auditLayoutRef"
      class="audit-split-layout audit-split-layout--responsive planning-audit-shell"
    >
      <section class="audit-split-layout__left audit-preview-shell" :style="leftPanelStyle">
        <AuditDocumentPreviewPanel
          :loading="pdfLoading"
          :current-view="leftView"
          :download-disabled="!fileMeta.gridfsId"
          :views="previewViews"
          @update:current-view="switchPdfType"
          @download="downloadSourceFile"
        >
          <template #original>
            <iframe v-if="pdfUrl" :src="pdfUrl" class="audit-preview-iframe" title="原始文件预览" />
            <div v-else class="audit-preview-empty">
              <el-empty description="未找到可预览的 PDF 文件" />
            </div>
          </template>
          <template #preprocess>
            <iframe
              v-if="pdfUrl"
              :src="pdfUrl"
              class="audit-preview-iframe"
              title="预处理文件预览"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无预处理文件" />
            </div>
          </template>
        </AuditDocumentPreviewPanel>
      </section>

      <div
        class="audit-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调节左右区域宽度"
        @pointerdown="onSplitterMouseDown"
      />

      <PlanningReviewAuditRightPanel
        ref="rightPanelRef"
        :form-data="formData"
        :project-id="projectId"
        :active="dialogVisible"
        :layout-ref="auditLayoutRef"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AuditDocumentPreviewPanel from '@/components/audit/AuditDocumentPreviewPanel.vue'
import PlanningReviewAuditRightPanel from '@/components/project-list/PlanningReviewAuditRightPanel.vue'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import { usePlanningReviewAuditPreview } from '@/composables/audit/usePlanningReviewAuditPreview'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  projectId: {
    type: [String, Number],
    default: '',
  },
  formData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const rightPanelRef = ref(null)

const {
  fileMeta,
  pdfUrl,
  leftView,
  pdfLoading,
  previewViews,
  clearPdfUrl,
  resolvePdfMeta,
  switchPdfType,
  downloadSourceFile,
} = usePlanningReviewAuditPreview()

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  onSplitEnd: () => nextTick(() => rightPanelRef.value?.measureTableHeight()),
})

const handleClosed = () => {
  clearPdfUrl()
  rightPanelRef.value?.resetPanelState()
}

watch(
  () => [dialogVisible.value, props.formData?.fileRecordId],
  async ([visible]) => {
    if (!visible) return
    await resolvePdfMeta(props.formData?.fileRecordId)
  }
)

onBeforeUnmount(() => {
  clearPdfUrl()
})
</script>

<style scoped>
:deep(.planning-audit-dialog.is-fullscreen) {
  display: flex;
  flex-direction: column;
  margin: 0;
  overflow: hidden;
}

:deep(.planning-audit-dialog .el-dialog__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.planning-audit-shell.audit-split-layout {
  flex: 1;
  min-height: 0;
  height: 100%;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
}

@media (max-width: 1280px) {
  .planning-audit-shell {
    height: auto;
    min-height: 0;
  }

  .planning-audit-shell .pdf-panel {
    height: 50vh;
    min-height: 360px;
  }
}
</style>
