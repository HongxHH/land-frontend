<template>
  <section
    class="tree-panel"
    :style="{ flexBasis: `${treePanelWidth}px` }"
    v-loading="archiveLoading"
  >
    <div class="tree-panel-actions">
      <el-button
        class="tree-action-btn tree-action-btn--create"
        size="small"
        type="primary"
        :icon="FolderAdd"
        :disabled="!projectId"
        @click="emit('create')"
      >
        新建文件夹
      </el-button>
      <el-button
        class="tree-action-btn tree-action-btn--delete"
        size="small"
        type="danger"
        plain
        :icon="Delete"
        :disabled="!canDeleteSelectedArchive"
        title="删除左侧树中当前选中的归档夹"
        @click="emit('delete-selected')"
      >
        删除文件夹
      </el-button>
    </div>
    <div class="tree-panel-scroll">
      <el-empty v-if="!projectId" description="请先选择项目后查看归档目录" />
      <el-tree
        v-else-if="treeData.length"
        class="archive-tree"
        :data="treeData"
        node-key="id"
        :props="treeProps"
        :expand-on-click-node="false"
        default-expand-all
        @node-click="(data) => emit('node-click', data)"
      >
        <template #default="{ data }">
          <div
            class="tree-node-row"
            :class="{ selected: data.archiveId && data.archiveId === selectedArchiveId }"
          >
            <el-icon class="folder-icon">
              <FolderOpened v-if="data.nodeType === 'project'" />
              <Folder v-else />
            </el-icon>
            <span class="node-name">{{ data.name }}</span>
          </div>
        </template>
      </el-tree>
      <el-empty v-else description="暂无归档夹" />
    </div>
  </section>
</template>

<script setup>
import { Delete, Folder, FolderAdd, FolderOpened } from '@element-plus/icons-vue'

defineProps({
  projectId: { type: [String, Number], default: '' },
  archiveLoading: { type: Boolean, default: false },
  treePanelWidth: { type: Number, default: 340 },
  treeData: { type: Array, default: () => [] },
  treeProps: { type: Object, default: () => ({}) },
  selectedArchiveId: { type: [String, Number], default: null },
  canDeleteSelectedArchive: { type: Boolean, default: false },
})

const emit = defineEmits(['create', 'delete-selected', 'node-click'])
</script>

<style scoped>
.tree-panel {
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: #fff;
  padding: 14px;
  height: 100%;
  min-height: 0;
  flex: 0 0 400px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tree-panel-actions {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 8px;
  flex-shrink: 0;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(219, 228, 239, 0.95);
}

.tree-panel-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 2px 4px 0;
}

.tree-action-btn {
  flex: 1 1 0;
  min-width: 0;
  height: 36px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

:deep(.tree-panel-actions .tree-action-btn.el-button) {
  flex: 1 1 0;
  min-width: 0;
}

:deep(.tree-action-btn--create.el-button--primary) {
  border-color: #c8ddf1;
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.tree-action-btn--create.el-button--primary:hover) {
  border-color: #a8c6e8;
  background: #dceaf8;
  color: #163a5c;
}

:deep(.tree-action-btn--delete.is-plain) {
  border-color: #f7c4bf;
  background: #fff3f2;
  color: #b42318;
}

:deep(.tree-action-btn--delete.is-plain:hover:not(.is-disabled)) {
  border-color: #ef9a94;
  background: #ffe8e6;
  color: #991b1b;
}

.archive-tree {
  --el-tree-node-hover-bg-color: transparent;
  --el-tree-text-color: #374151;
  font-size: 16px;
}

:deep(.archive-tree .el-tree-node__content) {
  border-radius: 10px;
  margin: 3px 0;
  min-height: 46px;
  padding-right: 8px;
  transition: background-color 0.15s ease;
}

:deep(.archive-tree .el-tree-node__expand-icon) {
  font-size: 16px;
  color: #6b7280;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 10px 12px;
  border-radius: 10px;
  position: relative;
  transition: background-color 0.15s ease;
}

.tree-node-row:hover {
  background: #eef4fb;
}

.tree-node-row.selected {
  background: #e3eef8;
}

.tree-node-row.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: var(--el-color-primary, #1f4e79);
}

.folder-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: #c07822;
}

.node-name {
  color: #374151;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.45;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-row.selected .node-name {
  color: #1f4e79;
}
</style>
