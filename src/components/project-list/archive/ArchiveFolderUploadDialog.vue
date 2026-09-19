<template>
  <el-dialog
    :model-value="modelValue"
    title="文件上传"
    width="560px"
    class="app-form-dialog upload-archive-dialog"
    :before-close="beforeClose"
    :close-on-click-modal="!hasActiveUpload"
    :close-on-press-escape="!hasActiveUpload"
    :show-close="!hasActiveUpload"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
  >
    <el-form label-position="top">
      <div class="upload-target-summary" role="status" aria-live="polite">
        <div class="upload-target-summary__title">上传目标</div>
        <div class="upload-target-summary__grid">
          <div class="upload-target-summary__item">
            <div class="upload-target-summary__label">
              <el-icon class="upload-target-summary__icon" aria-hidden="true"><Document /></el-icon>
              文件归类
            </div>
            <div class="upload-target-summary__value">{{ lockedFileContextLabel }}</div>
          </div>
          <div class="upload-target-summary__item upload-target-summary__item--folder">
            <div class="upload-target-summary__label">
              <el-icon class="upload-target-summary__icon" aria-hidden="true"
                ><FolderOpened
              /></el-icon>
              目标归档夹
            </div>
            <div class="upload-target-summary__value upload-target-summary__value--folder">
              {{ selectedArchiveName || '—' }}
            </div>
          </div>
        </div>
        <p class="upload-target-summary__hint">由当前选中的归档夹决定，上传前请确认无误</p>
      </div>
      <el-form-item
        v-if="uploadForm.fileContextType === 'SURVEY_REPORT'"
        label="期数（实测报告必填）"
      >
        <el-input-number
          :model-value="uploadForm.phase"
          :min="1"
          :max="99"
          controls-position="right"
          class="upload-phase"
          :disabled="uploadLoading"
          @update:model-value="setUploadField('phase', $event)"
        />
      </el-form-item>

      <el-upload
        class="upload-dropzone"
        :class="{ 'is-compact': uploadFiles.length > 0 }"
        drag
        action="#"
        :auto-upload="false"
        multiple
        :show-file-list="false"
        :file-list="uploadFiles"
        :on-change="(...args) => emit('file-change', ...args)"
        :on-remove="(...args) => emit('file-remove', ...args)"
      >
        <div v-if="!uploadFiles.length" class="upload-drop-inner">
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="upload-drop-title">拖拽文件到这里</div>
          <div class="upload-limit-hint">单文件不超过 {{ maxSingleFileUploadLabel }}</div>
        </div>
        <div v-else class="upload-drop-compact">
          <el-icon class="upload-drop-compact-icon"><UploadFilled /></el-icon>
          <div class="upload-drop-compact-text">
            <span class="upload-drop-compact-title">继续添加文件</span>
            <span class="upload-drop-compact-sub"
              >拖拽到此处，或点击选择（支持多选，单文件不超过 {{ maxSingleFileUploadLabel }}）</span
            >
          </div>
        </div>
      </el-upload>

      <div v-if="uploadFiles.length" class="upload-file-list-wrap">
        <UploadFileRow
          v-for="(item, idx) in uploadFiles"
          :key="item.uid ?? idx"
          :display-name="archiveUploadFileDisplayName(item)"
          :size-bytes="archiveUploadFileSize(item)"
          :status="resolveFileState(item)?.status ?? 'pending'"
          :progress="resolveFileState(item)?.progress ?? 0"
          :error-text="resolveFileState(item)?.error ?? ''"
          :show-retry="resolveFileState(item)?.status === 'error'"
          :remove-disabled="uploadLoading"
          @remove="emit('remove-one', item)"
          @retry="emit('retry-one', item)"
        />
      </div>

      <div v-if="uploadLoading" class="upload-phase-label">{{ uploadPhaseLabel }}</div>
      <el-progress
        v-if="uploadLoading"
        :percentage="uploadProgress"
        :stroke-width="8"
        class="upload-progress"
      />
      <div v-if="uploadLoading" class="upload-progress-bytes">
        已上传 {{ formatArchiveFileSize(uploadUploadedBytes) }} /
        {{ formatArchiveFileSize(uploadTotalBytes) }}
        <span v-if="uploadSpeedText" class="upload-speed">· {{ uploadSpeedText }}</span>
        <span v-if="uploadEtaText" class="upload-eta">· 剩余 {{ uploadEtaText }}</span>
      </div>
      <div v-if="uploadLoading" class="upload-progress-tip">
        并发上传中，每个文件入库完成后显示 ✓；解析进度请在文件列表查看。
      </div>
    </el-form>
    <template #footer>
      <el-button :disabled="hasActiveUpload && uploadLoading" @click="emit('cancel')">
        {{ uploadLoading ? '取消上传' : '取消' }}
      </el-button>
      <el-button
        type="primary"
        :loading="uploadLoading"
        :disabled="uploadFiles.length === 0 || uploadLoading"
        @click="emit('confirm-upload')"
      >
        确认上传
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { Document, FolderOpened, UploadFilled } from '@element-plus/icons-vue'
import UploadFileRow from '@/components/file-upload/UploadFileRow.vue'
import {
  archiveUploadFileDisplayName,
  archiveUploadFileSize,
  formatArchiveFileSize,
} from '@/composables/project-list/archiveFolderPresent.js'
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

import {
  getFileContextLabel,
  resolveUploadFileContextType,
} from '@/utils/fileContextTypeRegistry.js'
import { MAX_SINGLE_FILE_UPLOAD_LABEL } from '@/utils/fileUploadLimit.js'

const maxSingleFileUploadLabel = MAX_SINGLE_FILE_UPLOAD_LABEL

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  uploadForm: { type: Object, required: true },
  selectedArchiveName: { type: String, default: '' },
  uploadFiles: { type: Array, default: () => [] },
  uploadLoading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  uploadUploadedBytes: { type: Number, default: 0 },
  uploadTotalBytes: { type: Number, default: 0 },
  uploadSpeedText: { type: String, default: '' },
  uploadEtaText: { type: String, default: '' },
  uploadPhaseLabel: { type: String, default: '' },
  hasActiveUpload: { type: Boolean, default: false },
  getFileUploadState: { type: Function, default: () => null },
  beforeClose: { type: Function, default: undefined },
})

const resolveFileState = (item) => props.getFileUploadState?.(item) ?? null

const lockedFileContextLabel = computed(() => {
  const t = resolveUploadFileContextType(props.uploadForm?.fileContextType)
  return getFileContextLabel(t)
})

const emit = defineEmits([
  'update:modelValue',
  'update:uploadForm',
  'closed',
  'file-change',
  'file-remove',
  'remove-one',
  'retry-one',
  'confirm-upload',
  'cancel',
])

const setUploadField = createFormFieldPatcher(props, emit, 'uploadForm')
</script>
