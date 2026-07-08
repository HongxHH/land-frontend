<template>
  <el-dialog
    v-model="dialogVisible"
    fullscreen
    append-to-body
    custom-class="calibration-dialog"
    modal-class="calibration-modal"
    :show-close="true"
    :before-close="handleBeforeClose"
    @closed="handleDialogClosed"
  >
    <template #header>
      <CalibrationHeader :current-file="currentFile" />
    </template>

    <div
      ref="auditLayoutRef"
      class="split-view audit-split-layout audit-split-layout--responsive audit-split-layout--calibration"
    >
      <section class="audit-split-layout__left audit-preview-shell" :style="leftPanelStyle">
        <AuditDocumentPreviewPanel
          :loading="pdfLoading || recognitionMdLoading"
          :current-view="currentViewType"
          :download-disabled="!currentFile?.fileId"
          :views="calibrationPreviewViews"
          @update:current-view="switchView"
          @download="downloadSourceFile"
        >
          <template #original>
            <iframe
              v-if="calibrationPdfUrl"
              :src="calibrationPdfUrl"
              class="audit-preview-iframe"
              title="原始文件预览"
              @load="pdfLoaded"
              @error="pdfLoadError"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="PDF 文件加载失败" />
            </div>
          </template>
          <template #preprocess>
            <iframe
              v-if="calibrationPdfUrl"
              :src="calibrationPdfUrl"
              class="audit-preview-iframe"
              title="预处理文件预览"
              @load="pdfLoaded"
              @error="pdfLoadError"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无预处理文件" />
            </div>
          </template>
          <template #recognition>
            <!-- eslint-disable-next-line vue/no-v-html -- recognitionHtml 经 renderRecognitionMarkdownHtml + DOMPurify 消毒 -->
            <div
              v-if="recognitionHtml"
              class="audit-preview-md md-content"
              v-html="recognitionHtml"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无识别内容" />
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

      <CalibrationRightPanel
        ref="rightPanelRef"
        :open="dialogVisible"
        :dirty-row-count="dirtyRowCount"
        :batch-update-loading="batchUpdateLoading"
        :is-cell-active="isCellActive"
        :is-row-dirty="isRowDirty"
        :start-cell-edit="startCellEdit"
        :commit-active-cell="commitActiveCell"
        :discard-all-changes="discardAllChanges"
        :handle-save-dirty-rows="handleSaveDirtyRows"
        :sync-room-row="syncRoomRow"
        :notify-row-touched="notifyRowTouched"
        :prepare-row-for-edit="prepareRowForEdit"
        :handle-refresh-survey-report="handleRefreshSurveyReport"
        :handle-create-room="handleCreateRoom"
        :handle-delete-room="handleDeleteRoom"
        :room-create-loading="roomCreateLoading"
        :room-delete-loading="roomDeleteLoading"
        :report-refresh-loading="reportRefreshLoading"
        :audit-summary-data="auditSummaryData"
        :audit-summary-display="auditSummaryDisplay"
        :room-info-data="roomInfoData"
        :room-info-loading="roomInfoLoading"
        :project-id="projectId"
        :current-file="currentFile"
        :room-info-total="roomInfoTotal"
        :search-room-infos-by-pages="searchRoomInfosByPages"
        :search-missing-usage-by-pages="searchMissingUsageByPages"
        :load-more-room-info="loadMoreRoomInfo"
        :room-info-has-more="roomInfoHasMore"
        :room-info-loading-more="roomInfoLoadingMore"
        :focus-usage-name="focusUsageName"
        :focus-mode="focusMode"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import CalibrationHeader from '@/components/file-upload/CalibrationHeader.vue'
import CalibrationRightPanel from '@/components/file-upload/CalibrationRightPanel.vue'
import AuditDocumentPreviewPanel from '@/components/audit/AuditDocumentPreviewPanel.vue'
import { downloadGridFsFile } from '@/services/file.service'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import '@/styles/calibration-workspace-dialog.css'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  currentFile: { type: Object, default: null },
  dirtyRowCount: { type: Number, default: 0 },
  batchUpdateLoading: { type: Boolean, default: false },
  isCellActive: { type: Function, required: true },
  isRowDirty: { type: Function, required: true },
  startCellEdit: { type: Function, required: true },
  commitActiveCell: { type: Function, required: true },
  discardAllChanges: { type: Function, required: true },
  handleSaveDirtyRows: { type: Function, required: true },
  confirmDiscardUnsavedChanges: { type: Function, required: true },
  syncRoomRow: { type: Function, default: null },
  notifyRowTouched: { type: Function, default: null },
  prepareRowForEdit: { type: Function, default: null },
  handleRefreshSurveyReport: { type: Function, default: null },
  handleCreateRoom: { type: Function, default: null },
  handleDeleteRoom: { type: Function, default: null },
  roomCreateLoading: { type: Boolean, default: false },
  roomDeleteLoading: { type: Boolean, default: false },
  reportRefreshLoading: { type: Boolean, default: false },
  calibrationLoading: { type: Boolean, default: false },
  currentViewType: { type: String, default: 'original' },
  isPreprocessAvailable: { type: Boolean, default: false },
  switchView: { type: Function, required: true },
  pdfLoading: { type: Boolean, default: false },
  calibrationPdfUrl: { type: String, default: '' },
  pdfLoaded: { type: Function, required: true },
  pdfLoadError: { type: Function, required: true },
  recognitionMdLoading: { type: Boolean, default: false },
  recognitionHtml: { type: String, default: '' },
  auditSummaryData: { type: Object, required: true },
  auditSummaryDisplay: { type: Object, required: true },
  roomInfoData: { type: Array, required: true },
  roomInfoLoading: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  roomInfoTotal: { type: Number, default: 0 },
  searchRoomInfosByPages: { type: Function, default: null },
  searchMissingUsageByPages: { type: Function, default: null },
  loadMoreRoomInfo: { type: Function, default: null },
  roomInfoHasMore: { type: Boolean, default: false },
  roomInfoLoadingMore: { type: Boolean, default: false },
  focusUsageName: { type: String, default: '' },
  focusMode: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'closed'])

const rightPanelRef = ref(null)

const calibrationPreviewViews = computed(() => [
  { id: 'original', label: '原始文件' },
  {
    id: 'preprocess',
    label: '预处理文件',
    disabled: !props.isPreprocessAvailable,
    hint: props.isPreprocessAvailable ? '' : '暂无',
  },
  { id: 'recognition', label: '识别文件(MD)' },
])

const downloadSourceFile = async () => {
  const gridfsId = props.currentFile?.fileId
  if (!gridfsId) {
    ElMessage.warning('缺少 fileId，无法下载')
    return
  }
  try {
    const res = await downloadGridFsFile(gridfsId, { responseType: 'blob' })
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.currentFile?.name || '实测报告.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载实测报告失败:', error)
    ElMessage.error('下载失败，请稍后重试')
  }
}

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const handleBeforeClose = async (done) => {
  const canClose = await props.confirmDiscardUnsavedChanges()
  if (canClose) done()
}

const handleDialogClosed = () => {
  rightPanelRef.value?.clearRoomTableKeyword?.()
  emit('closed')
}

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 40,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  },
})
</script>
