<template>
  <section class="audit-doc-preview">
    <div class="audit-doc-preview__toolbar">
      <div class="audit-doc-preview__actions">
        <el-button size="small" plain :disabled="downloadDisabled" @click="emit('download')">
          下载原文件
        </el-button>
        <el-dropdown trigger="click" placement="bottom-end" @command="handleViewCommand">
          <el-button size="small" plain class="audit-doc-preview__dropdown-trigger">
            {{ currentViewLabel || '文件视图' }}
            <el-icon class="audit-doc-preview__dropdown-icon"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="item in viewOptions"
                :key="item.id"
                :command="item.id"
                :disabled="item.disabled"
                :class="{ 'audit-doc-preview__item--active': currentView === item.id }"
              >
                <span>{{ item.label }}</span>
                <span v-if="item.hint" class="audit-doc-preview__item-hint">{{ item.hint }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="audit-doc-preview__canvas" v-loading="loading">
      <div
        v-for="item in viewOptions"
        v-show="currentView === item.id"
        :key="item.id"
        class="audit-doc-preview__pane"
      >
        <slot :name="item.id" />
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  loading: { type: Boolean, default: false },
  currentView: { type: String, default: 'pdf' },
  downloadDisabled: { type: Boolean, default: true },
  /** @type {{ id: string, label: string, disabled?: boolean, hint?: string }[]} */
  views: {
    type: Array,
    default: () => [
      { id: 'pdf', label: 'PDF预览' },
      { id: 'markdown', label: '解析内容(MD)' }
    ]
  }
})

const emit = defineEmits(['update:currentView', 'download'])

const viewOptions = computed(() =>
  (props.views || []).map((item) => ({
    id: String(item.id),
    label: item.label,
    disabled: Boolean(item.disabled),
    hint: item.hint || ''
  }))
)

const currentViewLabel = computed(() => {
  const hit = viewOptions.value.find((item) => item.id === props.currentView)
  return hit?.label || ''
})

const handleViewCommand = (viewId) => {
  const target = viewOptions.value.find((item) => item.id === viewId)
  if (!target || target.disabled) return
  emit('update:currentView', viewId)
}
</script>

<style scoped>
.audit-doc-preview {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  background: #525659;
  border-radius: 6px;
}

.audit-doc-preview__toolbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-height: 40px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.audit-doc-preview__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.audit-doc-preview__dropdown-icon {
  margin-left: 4px;
}

.audit-doc-preview__item-hint {
  margin-left: 6px;
  font-size: 11px;
  color: #94a3b8;
}

:deep(.audit-doc-preview__item--active) {
  color: var(--el-color-primary);
  font-weight: 600;
}

.audit-doc-preview__canvas {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.audit-doc-preview__pane {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.audit-doc-preview__pane :deep(.audit-preview-iframe) {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
  background: #525659;
}

.audit-doc-preview__pane :deep(.audit-preview-md) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 16px 20px;
  box-sizing: border-box;
  background: #fff;
  font-size: 13px;
  line-height: 1.65;
}

.audit-doc-preview__pane :deep(.audit-preview-empty) {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
</style>
