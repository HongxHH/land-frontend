<template>
  <div class="upload-file-row" :class="`is-${status}`">
    <div class="upload-file-row-main">
      <span class="upload-file-row-name" :title="displayName">{{ displayName }}</span>
      <span class="upload-file-row-size">{{ sizeText }}</span>
    </div>
    <div class="upload-file-row-status">
      <template v-if="status === 'pending'">
        <span class="upload-file-row-muted">等待上传</span>
      </template>
      <template v-else-if="status === 'uploading' || status === 'processing'">
        <el-progress
          :percentage="progress"
          :stroke-width="6"
          :show-text="false"
          class="upload-file-row-progress"
        />
        <span class="upload-file-row-muted">{{ status === 'processing' ? '入库中' : '传输中' }}</span>
      </template>
      <template v-else-if="status === 'done'">
        <span class="upload-file-row-done">✓ 已入库</span>
      </template>
      <template v-else-if="status === 'error'">
        <span class="upload-file-row-error" :title="errorText">✗ {{ errorText }}</span>
        <el-button v-if="showRetry" link type="primary" size="small" @click="emit('retry')">重试</el-button>
      </template>
      <template v-else-if="status === 'cancelled'">
        <span class="upload-file-row-muted">已取消</span>
      </template>
    </div>
    <el-button
      v-if="showRemove"
      class="upload-file-row-remove"
      type="danger"
      link
      size="small"
      :disabled="removeDisabled"
      :icon="Close"
      @click.stop="emit('remove')"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { formatArchiveFileSize } from '@/composables/project-list/archiveFolderPresent.js'

const props = defineProps({
  displayName: { type: String, default: '' },
  sizeBytes: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  progress: { type: Number, default: 0 },
  errorText: { type: String, default: '' },
  showRemove: { type: Boolean, default: true },
  removeDisabled: { type: Boolean, default: false },
  showRetry: { type: Boolean, default: false }
})

const emit = defineEmits(['remove', 'retry'])

const sizeText = computed(() => formatArchiveFileSize(props.sizeBytes))
</script>

<style scoped>
.upload-file-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.upload-file-row-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.upload-file-row-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file-row-size {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.upload-file-row-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: flex-end;
}

.upload-file-row-progress {
  width: 72px;
}

.upload-file-row-muted {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.upload-file-row-done {
  font-size: 12px;
  color: var(--el-color-success);
}

.upload-file-row-error {
  font-size: 12px;
  color: var(--el-color-danger);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file-row.is-done {
  background: color-mix(in srgb, var(--el-color-success) 8%, var(--el-fill-color-lighter));
}

.upload-file-row.is-error {
  background: color-mix(in srgb, var(--el-color-danger) 8%, var(--el-fill-color-lighter));
}
</style>
