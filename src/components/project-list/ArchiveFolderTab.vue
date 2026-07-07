<template>
  <div class="archive-tab workspace-tab-fill">
    <div ref="tabContentRef" class="tab-content">
      <div class="archive-toolbar">
        <span
          class="socket-status"
          :class="`is-${socketStatus}`"
          role="status"
          :title="socketStatusText"
          :aria-label="socketStatusText"
        />
      </div>

      <div
        ref="splitContainerRef"
        class="explorer-split"
        :style="{ height: `${explorerHeight}px` }"
      >
        <ArchiveFolderTreePanel
          :project-id="projectId"
          :archive-loading="archiveLoading"
          :tree-panel-width="treePanelWidth"
          :tree-data="treeData"
          :tree-props="treeProps"
          :selected-archive-id="selectedArchiveId"
          :can-delete-selected-archive="canDeleteSelectedArchive"
          @create="openCreateDialog"
          @delete-selected="confirmDeleteSelectedArchive"
          @node-click="handleNodeClick"
        />

        <div
          class="splitter-handle"
          title="拖动调整目录与文件列表宽度"
          @mousedown="handleSplitterMouseDown"
        />

        <ArchiveFolderFilePanel
          ref="filePanelRef"
          :project-id="projectId"
          :selected-archive-id="selectedArchiveId"
          :selected-archive-kind="String(selectedArchive?.kind || '')"
          :query-form="queryForm"
          :file-loading="fileLoading"
          :archive-files="archiveFiles"
          :file-total="fileTotal"
          :selected-count="selectedRows.length"
          :show-thumbnail-column="showThumbnailColumn"
          :can-batch-parse="canBatchParse"
          :can-batch-delete="canBatchDelete"
          :batch-delete-loading="batchDeleteLoading"
          :batch-parse-loading="batchParseLoading"
          :can-preview="showPreviewButton"
          @update:query-form="(v) => Object.assign(queryForm, v)"
          @auto-query="handleAutoQuery"
          @search="handleSearch"
          @reset="handleReset"
          @refresh="refreshFiles"
          @batch-delete="handleBatchDelete"
          @batch-parse="handleBatchParse"
          @open-upload="openUploadDialog"
          @selection-change="handleSelectionChange"
          @preview="handlePreview"
          @open-parse-flow="openParseFlowDialog"
          @parse="handleParse"
          @cancel-parse="handleCancelParse"
          @audit="(row) => props.fileAuditHandler?.(row)"
          @delete-file="handleDeleteFile"
          @page-change="handlePageChange"
          @page-size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <ArchiveFolderCreateDialog
      v-model="createDialogVisible"
      :project-id="projectId"
      @created="fetchArchives"
    />

    <ArchiveFolderUploadDialog
      v-model="uploadDialogVisible"
      :upload-form="uploadForm"
      :selected-archive-name="selectedArchiveName"
      :upload-files="uploadFiles"
      :upload-loading="uploadLoading"
      :upload-progress="uploadProgress"
      :upload-uploaded-bytes="uploadUploadedBytes"
      :upload-total-bytes="uploadTotalBytes"
      :upload-speed-text="uploadSpeedText"
      :upload-eta-text="uploadEtaText"
      :upload-phase-label="uploadPhaseLabel"
      :has-active-upload="hasActiveUpload"
      :get-file-upload-state="getFileUploadState"
      :before-close="handleUploadDialogBeforeClose"
      @update:upload-form="(v) => Object.assign(uploadForm, v)"
      @closed="resetUploadForm"
      @file-change="handleUploadFileChange"
      @file-remove="handleUploadFileRemove"
      @remove-one="removeOneUploadFile"
      @retry-one="retryUploadFile"
      @confirm-upload="handleBatchUpload"
      @cancel="handleCancelUpload"
    />

    <ArchiveFilePreviewDialog
      v-model="previewVisible"
      :loading="previewLoading"
      :mode="previewMode"
      :file-meta="previewFileMeta"
      :pdf-url="pdfPreviewUrl"
      :image-url="imagePreviewUrl"
      :excel-src="excelPreviewSrc"
      @closed="handlePreviewClosed"
      @download="downloadPreviewFile"
      @excel-rendered="previewLoading = false"
      @excel-error="onExcelPreviewError"
    />

    <ArchiveFolderParseFlowDialog
      v-model="parseFlowDialogVisible"
      :detail="parseFlowDetail"
      :loading="parseFlowLoading"
      @refresh="refreshParseFlowDialog"
    />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import ArchiveFolderTreePanel from '@/components/project-list/archive/ArchiveFolderTreePanel.vue'
import ArchiveFolderFilePanel from '@/components/project-list/archive/ArchiveFolderFilePanel.vue'
import ArchiveFolderUploadDialog from '@/components/project-list/archive/ArchiveFolderUploadDialog.vue'
import ArchiveFolderParseFlowDialog from '@/components/project-list/archive/ArchiveFolderParseFlowDialog.vue'
import ArchiveFolderCreateDialog from '@/components/project-list/archive/ArchiveFolderCreateDialog.vue'

const ArchiveFilePreviewDialog = defineAsyncComponent(
  () => import('@/components/project-list/ArchiveFilePreviewDialog.vue')
)
import {
  canPreviewArchiveFile,
  useArchiveFilePreview,
} from '@/composables/project-list/useArchiveFilePreview'
import { useArchiveParseFlow } from '@/composables/project-list/useArchiveParseFlow.js'
import { sortArchiveFilesVerifyFailedFirst } from '@/composables/project-list/archiveFolderPresent.js'
import { useArchiveFolderExplorerData } from '@/composables/project-list/useArchiveFolderExplorerData.js'
import { useArchiveFolderRealtime } from '@/composables/project-list/useArchiveFolderRealtime.js'
import { useArchiveFolderSplitter } from '@/composables/project-list/useArchiveFolderSplitter.js'
import { useArchiveExplorerHeight } from '@/composables/project-list/useArchiveExplorerHeight.js'
import { useArchiveFolderUpload } from '@/composables/project-list/useArchiveFolderUpload.js'
import { resolveUploadFileContextType } from '@/utils/fileContextTypeRegistry.js'

const props = defineProps({
  projectId: {
    type: [String, Number],
    default: '',
  },
  projectName: {
    type: String,
    default: '',
  },
  initialArchiveId: {
    type: [String, Number],
    default: '',
  },
  active: {
    type: Boolean,
    default: false,
  },
  fileAuditHandler: {
    type: Function,
    default: undefined,
  },
})
const createDialogVisible = ref(false)
const filePanelRef = ref(null)
const tabContentRef = ref(null)

const updateTableBodyHeight = () => filePanelRef.value?.updateTableBodyHeight?.()
const bindTableWrapResizeObserver = () => filePanelRef.value?.bindTableWrapResizeObserver?.()

const { explorerHeight, updateExplorerHeight, bindExplorerHeightObserver } =
  useArchiveExplorerHeight(() => tabContentRef.value)

const refreshExplorerLayout = () => {
  updateExplorerHeight()
  updateTableBodyHeight()
}

let syncUploadContextByArchive = () => {}

const {
  archiveLoading,
  fileLoading,
  batchDeleteLoading,
  batchParseLoading,
  archiveList,
  archiveFiles,
  selectedRows,
  fileTotal,
  selectedArchiveId,
  selectedArchiveName,
  selectedArchive,
  queryForm,
  treeProps,
  treeData,
  canDeleteSelectedArchive,
  showThumbnailColumn,
  canBatchParse,
  canBatchDelete,
  clearArchiveQueryCache,
  resetArchiveProjectState,
  clearFiles,
  fetchArchiveFiles,
  prependUploadedArchiveFiles,
  startFileStatePolling,
  fetchArchives,
  confirmDeleteSelectedArchive,
  handleNodeClick,
  handleSelectionChange,
  handleAutoQuery,
  handleSearch,
  handleReset,
  refreshFiles,
  handlePageChange,
  handlePageSizeChange,
  handleParse,
  handleCancelParse,
  handleDeleteFile,
  handleBatchDelete,
  handleBatchParse,
  applyInitialArchiveId,
  cleanupExplorer,
} = useArchiveFolderExplorerData({
  projectId: () => props.projectId,
  projectName: () => props.projectName,
  initialArchiveId: () => props.initialArchiveId,
  syncUploadContextByArchive: () => syncUploadContextByArchive(),
})

const {
  uploadDialogVisible,
  uploadForm,
  uploadFiles,
  uploadLoading,
  uploadProgress,
  uploadUploadedBytes,
  uploadTotalBytes,
  uploadSpeedText,
  uploadEtaText,
  hasActiveUpload,
  uploadPhaseLabel,
  getFileUploadState,
  handleUploadDialogBeforeClose,
  resetUploadForm,
  openUploadDialog,
  handleUploadFileChange,
  handleUploadFileRemove,
  removeOneUploadFile,
  handleBatchUpload,
  retryUploadFile,
  handleCancelUpload,
  stopUploadSpeedMeter,
} = useArchiveFolderUpload({
  projectId: () => props.projectId,
  selectedArchiveId: () => selectedArchiveId.value,
  syncUploadContextByArchive: () => syncUploadContextByArchive(),
  onFileUploaded: (entry) => {
    prependUploadedArchiveFiles([entry])
  },
  onUploadSuccess: async () => {
    queryForm.pageNum = 1
    await fetchArchiveFiles({ force: true })
    startFileStatePolling()
  },
})

syncUploadContextByArchive = () => {
  const kind = String(selectedArchive.value?.kind || '').toUpperCase()
  uploadForm.archiveId = selectedArchiveId.value ? Number(selectedArchiveId.value) : null
  uploadForm.fileContextType = kind ? resolveUploadFileContextType(kind) : 'OTHER'
}

const {
  socketStatus,
  socketStatusText,
  flushReadAckNow,
  resetRealtimeState,
  cleanupRealtime,
  onTabActivated,
} = useArchiveFolderRealtime({
  projectId: () => props.projectId,
  active: () => props.active,
  archiveFiles: () => archiveFiles.value,
  setArchiveFiles: (files) => {
    archiveFiles.value = sortArchiveFilesVerifyFailedFirst(files)
  },
  selectedArchiveId: () => selectedArchiveId.value,
  fetchArchiveFiles,
  clearArchiveQueryCache,
})

const {
  splitContainerRef,
  treePanelWidth,
  handleSplitterMouseDown,
  handleWindowResize,
  cleanupSplitter,
} = useArchiveFolderSplitter({ onResize: refreshExplorerLayout })

const {
  parseFlowDialogVisible,
  parseFlowDetail,
  parseFlowLoading,
  openParseFlowDialog,
  refreshParseFlowDialog,
  stopParseFlowAutoRefresh,
} = useArchiveParseFlow({ isActive: () => props.active })

const {
  previewVisible,
  previewLoading,
  previewMode,
  previewFileMeta,
  pdfPreviewUrl,
  imagePreviewUrl,
  excelPreviewSrc,
  openArchivePreview,
  handlePreviewClosed,
  downloadPreviewFile,
} = useArchiveFilePreview()

const showPreviewButton = (row) => canPreviewArchiveFile(row)

const openCreateDialog = () => {
  createDialogVisible.value = true
}

const handlePreview = async (row) => {
  await openArchivePreview(row)
}

const onExcelPreviewError = (error) => {
  previewLoading.value = false
  console.error('Excel 预览渲染失败:', error)
  ElMessage.error('Excel 预览失败，可尝试下载原文件查看')
}

watch(
  () => props.active,
  (isActive) => {
    if (!isActive) {
      stopParseFlowAutoRefresh()
      stopUploadSpeedMeter()
      return
    }
    nextTick(() => {
      bindExplorerHeightObserver()
      bindTableWrapResizeObserver()
      refreshExplorerLayout()
    })
  }
)

watch([selectedArchiveId, fileLoading], () => {
  nextTick(() => refreshExplorerLayout())
})

watch(
  () => [props.projectId, props.active],
  ([projectId, active], [oldProjectId] = []) => {
    if (oldProjectId !== undefined && String(projectId || '') !== String(oldProjectId || '')) {
      resetArchiveProjectState()
    }
    if (projectId && active) {
      fetchArchives()
      return
    }
    if (!projectId) {
      archiveList.value = []
      clearFiles()
    }
  },
  { immediate: true }
)

watch(
  () => props.projectId,
  async () => {
    await flushReadAckNow()
    resetRealtimeState()
    clearArchiveQueryCache()
    cleanupExplorer()
  }
)

watch(
  () => props.active,
  async (active) => {
    if (!active) return
    await onTabActivated()
  }
)

watch(
  () => props.initialArchiveId,
  (archiveId) => {
    applyInitialArchiveId(archiveId)
  }
)

defineExpose({
  refreshFiles,
})

onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
  nextTick(() => {
    bindExplorerHeightObserver()
    bindTableWrapResizeObserver()
  })
})

onBeforeUnmount(() => {
  cleanupRealtime()
  cleanupSplitter()
  cleanupExplorer()
  window.removeEventListener('resize', handleWindowResize)
  stopParseFlowAutoRefresh()
})
</script>

<style scoped>
.archive-tab .tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 14px 14px;
  box-sizing: border-box;
}

.archive-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, var(--home-header-grad-start) 0%, #f2f7fc 100%);
}

.socket-status {
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-sizing: border-box;
  border: 2px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.45);
  background: #94a3b8;
}

.socket-status.is-connected {
  background: #22c55e;
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.35);
}

.socket-status.is-connecting,
.socket-status.is-reconnecting {
  background: #f59e0b;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.4);
}

.socket-status.is-error,
.socket-status.is-stopped {
  background: #ef4444;
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.35);
}

.socket-status.is-idle {
  background: #cbd5e1;
}

.socket-status.is-disconnected {
  background: #64748b;
}

.explorer-split {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-shrink: 0;
  width: 100%;
  overflow: hidden;
}

.splitter-handle {
  flex: 0 0 12px;
  align-self: stretch;
  position: relative;
  cursor: col-resize;
  border-radius: 10px;
  user-select: none;
  transition: background-color 0.15s ease;
}

.splitter-handle::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #cbd5e1;
  opacity: 0.55;
  transition:
    background-color 0.15s ease,
    width 0.15s ease,
    opacity 0.15s ease;
}

.splitter-handle:hover {
  background: rgba(31, 78, 121, 0.06);
}

.splitter-handle:hover::before {
  background: var(--el-color-primary, #1f4e79);
  width: 3px;
  opacity: 0.9;
}

.splitter-handle:active {
  background: rgba(31, 78, 121, 0.1);
}

.splitter-handle:active::before {
  background: var(--el-color-primary, #1f4e79);
  width: 3px;
  opacity: 1;
}

:global(body.resizing-splitter) {
  cursor: col-resize !important;
  user-select: none !important;
}
</style>
