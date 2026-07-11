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

<style>
/* teleport 到 body 的全屏 Dialog 需非 scoped 样式，否则 flex 链断裂、下方留白 */
.el-dialog.is-fullscreen.planning-audit-dialog {
  margin: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.el-dialog.is-fullscreen.planning-audit-dialog .el-dialog__header {
  flex: 0 0 auto;
  margin-right: 0;
  padding-bottom: 8px;
}

.el-dialog.is-fullscreen.planning-audit-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 8px !important;
  box-sizing: border-box;
}
</style>

<style scoped>
.planning-audit-shell {
  flex: 1 1 auto;
  min-height: 0;
  align-self: stretch;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
  box-sizing: border-box;
}

.planning-audit-shell.audit-split-layout {
  height: 100%;
}

.audit-preview-shell :deep(.audit-doc-preview) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

@media (max-width: 1280px) {
  .planning-audit-shell {
    height: auto;
    min-height: 0;
  }

  .planning-audit-shell .audit-preview-shell {
    height: 50vh;
    min-height: 360px;
  }
}
</style>
