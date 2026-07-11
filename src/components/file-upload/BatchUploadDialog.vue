<template>
  <el-dialog
    :model-value="modelValue"
    title="批量文件上传"
    width="600px"
    class="upload-batch-dialog"
    @update:model-value="(val) => $emit('update:modelValue', val)"
    @closed="$emit('closed')"
  >
    <el-form label-position="top" class="upload-batch-form">
      <el-row :gutter="20">
        <el-col :span="14">
          <el-form-item label="请确认本次上传的文件类型：">
            <el-radio-group
              :model-value="tempUploadType"
              class="upload-type-group"
              @update:model-value="(val) => $emit('update:tempUploadType', val)"
            >
              <el-radio-button value="CONTRACT">合同文件</el-radio-button>
              <el-radio-button value="SURVEY_REPORT">实测报告</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="10">
          <el-form-item label="所属期数：" v-if="tempUploadType === 'SURVEY_REPORT'">
            <el-input-number
              :model-value="uploadPhase"
              :min="1"
              :max="99"
              class="upload-phase"
              @update:model-value="(val) => $emit('update:uploadPhase', val)"
            />
          </el-form-item>
          <el-form-item label="所属期数：" v-else>
            <el-input disabled placeholder="无需填写" class="upload-phase" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-upload
        class="upload-dropzone"
        drag
        action="#"
        :auto-upload="false"
        :on-change="(file, fileList) => $emit('file-change', file, fileList)"
        :on-remove="(file, fileList) => $emit('file-remove', file, fileList)"
        multiple
        :file-list="tempFiles"
      >
        <div class="upload-content">
          <div class="upload-icon-wrap" aria-hidden="true">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
          </div>
          <div class="upload-title">拖拽文件到这里</div>
          <div class="upload-sub">或点击选择文件上传</div>
          <div class="upload-limit-hint">单文件不超过 {{ maxSingleFileUploadLabel }}</div>
        </div>
      </el-upload>

      <div v-if="tempFiles.length" class="upload-file-list-wrap">
        <UploadFileRow
          v-for="(item, idx) in tempFiles"
          :key="item.uid ?? idx"
          :display-name="item.name || item.raw?.name || '未命名文件'"
          :size-bytes="Number(item.raw?.size ?? item.size ?? 0)"
          :status="resolveFileState(item)?.status ?? 'pending'"
          :progress="resolveFileState(item)?.progress ?? 0"
          :error-text="resolveFileState(item)?.error ?? ''"
          :show-retry="resolveFileState(item)?.status === 'error'"
          :show-remove="!uploadLoading"
          @retry="emit('retry-one', item)"
        />
      </div>
    </el-form>
    <template #footer>
      <div class="upload-batch-footer">
        <span class="upload-batch-count"
          >已选择 <strong>{{ tempFiles.length }}</strong> 个文件</span
        >
        <div>
          <el-button @click="emit('update:modelValue', false)" :disabled="uploadLoading"
            >取消</el-button
          >
          <el-button
            type="primary"
            class="upload-confirm-btn"
            :loading="uploadLoading"
            :disabled="tempFiles.length === 0 || uploadLoading"
            @click="emit('confirm')"
          >
            确认上传
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { UploadFilled } from '@element-plus/icons-vue'
import UploadFileRow from '@/components/file-upload/UploadFileRow.vue'
import { MAX_SINGLE_FILE_UPLOAD_LABEL } from '@/utils/fileUploadLimit.js'

const maxSingleFileUploadLabel = MAX_SINGLE_FILE_UPLOAD_LABEL

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  tempUploadType: {
    type: String,
    default: 'SURVEY_REPORT',
  },
  uploadPhase: {
    type: Number,
    default: 1,
  },
  tempFiles: {
    type: Array,
    default: () => [],
  },
  uploadLoading: {
    type: Boolean,
    default: false,
  },
  getFileUploadState: {
    type: Function,
    default: () => null,
  },
})

const emit = defineEmits([
  'update:modelValue',
  'update:tempUploadType',
  'update:uploadPhase',
  'file-change',
  'file-remove',
  'confirm',
  'closed',
  'retry-one',
])

const resolveFileState = (item) => props.getFileUploadState?.(item) ?? null
</script>

<style>
.upload-batch-dialog.el-dialog {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--home-soft-border, #dbe4ef);
  box-shadow: var(--home-soft-shadow, 0 14px 36px -24px rgba(15, 23, 42, 0.2));
}

.upload-batch-dialog .el-dialog__header {
  margin-right: 0;
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(219, 228, 239, 0.9);
  background: linear-gradient(
    180deg,
    var(--home-header-grad-start, #f8fbff) 0%,
    var(--home-header-grad-end, #f1f6fc) 100%
  );
}

.upload-batch-dialog .el-dialog__title {
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.upload-batch-dialog .el-dialog__body {
  padding: 14px 18px 10px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.82) 0%, rgba(241, 245, 249, 0.66) 100%);
}

.upload-batch-dialog .el-dialog__footer {
  border-top: 1px solid rgba(219, 228, 239, 0.9);
  background: #ffffff;
  padding: 12px 18px;
}

.upload-batch-form .el-form-item__label {
  color: #0f172a;
  font-weight: 800;
}

.upload-batch-form .el-input-number,
.upload-batch-form .upload-phase {
  width: 100%;
}

.upload-batch-form .el-input__wrapper,
.upload-batch-form .el-input-number .el-input__wrapper {
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.32);
  box-shadow: 0 10px 24px -22px rgba(15, 23, 42, 0.22);
}

.upload-batch-form .el-input__wrapper.is-focus,
.upload-batch-form .el-input-number .el-input__wrapper.is-focus {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 18px 44px -30px rgba(37, 99, 235, 0.5);
}

.upload-batch-form .upload-type-group .el-radio-button__inner {
  border-radius: 10px;
  font-weight: 800;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
}

.upload-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(219, 234, 254, 0.9) 100%);
  border: 1px solid rgba(59, 130, 246, 0.18);
  box-shadow: 0 18px 44px -30px rgba(37, 99, 235, 0.55);
}

.upload-icon {
  font-size: 30px;
  color: rgba(37, 99, 235, 0.92);
}

.upload-title {
  font-size: 14px;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.upload-sub {
  font-size: 12px;
  color: #475569;
}

.upload-limit-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.upload-dropzone .el-upload-dragger {
  border-radius: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.85);
  padding: 16px 14px;
  transition:
    transform 0.14s ease,
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

.upload-dropzone .el-upload-dragger:hover {
  border-color: rgba(37, 99, 235, 0.55);
  box-shadow: 0 22px 54px -40px rgba(37, 99, 235, 0.5);
  transform: translateY(-1px);
}

.upload-dropzone.is-dragover .el-upload-dragger {
  border-color: rgba(37, 99, 235, 0.75);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 65%);
  box-shadow: 0 26px 60px -44px rgba(37, 99, 235, 0.6);
}

.upload-batch-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 12px;
}

.upload-batch-count {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.upload-batch-footer strong {
  color: #0f172a;
  font-weight: 900;
}

.upload-batch-dialog .el-button {
  border-radius: 10px;
  font-weight: 800;
}

.upload-batch-dialog .el-button--primary {
  border-color: rgba(37, 99, 235, 0.28);
  background: linear-gradient(180deg, rgba(37, 99, 235, 0.92) 0%, rgba(29, 78, 216, 0.92) 100%);
  box-shadow: 0 16px 42px -30px rgba(37, 99, 235, 0.8);
}

.upload-batch-dialog .el-button--primary:hover {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.96) 0%, rgba(37, 99, 235, 0.96) 100%);
}

.upload-file-list-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 220px;
  overflow-y: auto;
}
</style>
