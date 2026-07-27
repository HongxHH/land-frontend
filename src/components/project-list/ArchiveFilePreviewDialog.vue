<template>
  <el-dialog
    v-model="dialogVisible"
    title="文件预览"
    fullscreen
    append-to-body
    :close-on-click-modal="false"
    class="archive-file-preview-dialog"
    @closed="emit('closed')"
    @opened="onDialogOpened"
  >
    <div class="archive-preview-shell" v-loading="loading">
      <div class="archive-preview-toolbar">
        <div class="archive-preview-title" :title="fileMeta?.originalName || ''">
          {{ fileMeta?.originalName || '归档文件' }}
        </div>
        <div class="archive-preview-actions">
          <el-tag v-if="fileMeta?.fileType" size="small" effect="plain">{{
            fileMeta.fileType
          }}</el-tag>
          <el-button size="small" :disabled="!fileMeta?.gridfsId" @click="emit('download')"
            >下载原文件</el-button
          >
        </div>
      </div>

      <div
        class="archive-preview-body"
        :class="{ 'archive-preview-body--excel': mode === 'excel' }"
      >
        <iframe
          v-if="mode === 'pdf' && pdfUrl"
          class="archive-preview-frame"
          :src="pdfUrl"
          title="PDF 预览"
        />
        <div v-else-if="mode === 'excel'" ref="excelViewRef" class="archive-preview-excel">
          <VueOfficeExcelAsync
            v-if="excelSrc"
            :src="excelSrc"
            :options="{ xls: true }"
            class="archive-preview-excel-view"
            @rendered="onExcelRendered"
            @error="emit('excel-error', $event)"
          />
          <el-empty v-else description="Excel 预览加载中或暂不可用" />
        </div>
        <div v-else-if="mode === 'image' && imageUrl" class="archive-preview-image-wrap">
          <img
            :src="imageUrl"
            :alt="fileMeta?.originalName || '图片预览'"
            class="archive-preview-image"
          />
        </div>
        <el-empty
          v-else-if="mode === 'unsupported'"
          description="当前文件类型暂不支持在线预览，请下载原文件查看"
        />
        <el-empty v-else description="暂无可预览内容" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'
import { VueOfficeExcelAsync } from '@/components/project-list/lazyVueOfficeExcel.js'
import { useVueOfficeExcelLayout } from '@/composables/useVueOfficeExcelLayout.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  mode: { type: String, default: 'unsupported' },
  fileMeta: { type: Object, default: null },
  pdfUrl: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  excelSrc: { type: [Object, ArrayBuffer, null], default: null },
})

const emit = defineEmits([
  'update:modelValue',
  'closed',
  'download',
  'excel-rendered',
  'excel-error',
])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const excelViewRef = ref(null)

const isExcelPreviewActive = computed(
  () => props.modelValue && props.mode === 'excel' && !!props.excelSrc
)

const { triggerSpreadsheetLayout, syncExcelLayout } = useVueOfficeExcelLayout(
  excelViewRef,
  () => isExcelPreviewActive.value
)

const onDialogOpened = () => {
  if (!isExcelPreviewActive.value) return
  syncExcelLayout()
  window.setTimeout(() => triggerSpreadsheetLayout(), 180)
}

const onExcelRendered = () => {
  triggerSpreadsheetLayout()
  window.setTimeout(() => triggerSpreadsheetLayout(), 120)
  emit('excel-rendered')
}
</script>

<style scoped>
.archive-preview-shell {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.archive-preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.archive-preview-title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.archive-preview-body {
  flex: 1;
  min-height: 0;
  margin-top: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.archive-preview-body--excel {
  display: flex;
  flex-direction: column;
  background: #fff;
}

.archive-preview-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: #525659;
}

.archive-preview-excel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #fff;
}

.archive-preview-excel-view {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.archive-preview-excel-view :deep(.vue-office-excel) {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.archive-preview-excel-view :deep(.vue-office-excel-main),
.archive-preview-excel-view :deep(.x-spreadsheet) {
  width: 100%;
  height: 100%;
}

.archive-preview-image-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 16px;
  box-sizing: border-box;
}

.archive-preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>

<style>
.archive-file-preview-dialog.el-dialog.is-fullscreen {
  display: flex;
  flex-direction: column;
  width: 100% !important;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  margin: 0 !important;
  border-radius: 0;
  border: none;
  box-shadow: none;
}

.archive-file-preview-dialog.is-fullscreen .el-dialog__header {
  flex-shrink: 0;
}

.archive-file-preview-dialog.is-fullscreen .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
}
</style>
