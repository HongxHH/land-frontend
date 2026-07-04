<template>
  <section class="table-panel">
    <div class="query-bar">
      <el-button
        class="upload-btn query-bar-btn"
        size="small"
        type="primary"
        plain
        :icon="UploadFilled"
        :disabled="!projectId || !selectedArchiveId"
        @click="emit('open-upload')"
      >
        文件上传
      </el-button>
      <el-button
        class="query-bar-btn"
        size="small"
        type="danger"
        plain
        :disabled="!canBatchDelete"
        :loading="batchDeleteLoading"
        @click="emit('batch-delete')"
      >
        批量删除
      </el-button>
      <el-button
        class="query-bar-btn"
        size="small"
        type="primary"
        plain
        :disabled="!canBatchParse"
        :loading="batchParseLoading"
        @click="emit('batch-parse')"
      >
        批量解析
      </el-button>
      <span class="query-bar-divider" aria-hidden="true" />
      <el-input
        :model-value="queryForm.keyword"
        placeholder="文件名关键词"
        clearable
        class="query-item keyword"
        @update:model-value="
          setQueryField('keyword', typeof $event === 'string' ? $event.trim() : $event)
        "
        @input="emit('auto-query', 'keyword')"
        @clear="emit('auto-query', 'keyword')"
        @keyup.enter="emit('search')"
      />
      <el-select
        :model-value="queryForm.verifyStatus"
        placeholder="校验状态"
        clearable
        class="query-item"
        @update:model-value="setQueryField('verifyStatus', $event)"
        @change="emit('auto-query', 'verifyStatus')"
        @clear="emit('auto-query', 'verifyStatus')"
      >
        <el-option
          v-for="item in verifyStatusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select
        :model-value="queryForm.fileState"
        placeholder="文件状态"
        clearable
        class="query-item"
        @update:model-value="setQueryField('fileState', $event)"
        @change="emit('auto-query', 'fileState')"
        @clear="emit('auto-query', 'fileState')"
      >
        <el-option
          v-for="item in fileStateOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-button class="query-bar-btn" size="small" @click="emit('reset')">重置</el-button>
      <el-button class="query-bar-btn" size="small" :icon="Refresh" @click="emit('refresh')"
        >刷新</el-button
      >
    </div>

    <div ref="tableWrapRef" class="table-wrap" v-loading="fileLoading">
      <el-empty v-if="!selectedArchiveId" description="选择归档夹后展示文件" />
      <el-empty
        v-else-if="!fileLoading && archiveFiles.length === 0"
        description="该归档夹暂无文件，可上传或切换其他归档夹"
        :image-size="80"
      />
      <template v-else>
        <div ref="tableBodyHostRef" class="table-body-host">
          <el-table
            :data="archiveFiles"
            stripe
            border
            :height="tableBodyHeight"
            row-key="id"
            :row-class-name="archiveFileTableRowClassName"
            @selection-change="(rows) => emit('selection-change', rows)"
          >
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column v-if="showThumbnailColumn" label="缩略图" width="108" align="center">
              <template #default="{ row }">
                <el-image
                  v-if="getArchiveThumbnailUrl(row)"
                  class="thumb"
                  :src="getArchiveThumbnailUrl(row)"
                  fit="cover"
                  :preview-src-list="getArchiveThumbnailPreviewList(row)"
                  :preview-teleported="true"
                >
                  <template #error>
                    <div class="thumb-placeholder">
                      <el-icon><Picture /></el-icon>
                    </div>
                  </template>
                </el-image>
                <div v-else class="thumb-placeholder">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="文件名" min-width="280">
              <template #default="{ row }">
                <el-link
                  v-if="canPreview(row)"
                  type="primary"
                  :underline="false"
                  class="archive-file-name-link"
                  :title="`点击预览：${row.originalName || ''}`"
                  @click="emit('preview', row)"
                >
                  {{ row.originalName || '-' }}
                </el-link>
                <span v-else class="archive-file-name-text" :title="row.originalName || ''">
                  {{ row.originalName || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="130" align="center">
              <template #default="{ row }">
                <el-tag
                  v-if="row.parseJobId"
                  :type="getArchiveStateTagType(row.fileState)"
                  size="small"
                  effect="light"
                  class="state-tag-parse-flow"
                  title="点击查看解析流程"
                  @click.stop="emit('open-parse-flow', row)"
                >
                  {{ getArchiveFileStateLabel(row.fileState, row) }}
                </el-tag>
                <el-tag
                  v-else
                  :type="getArchiveStateTagType(row.fileState)"
                  size="small"
                  effect="light"
                >
                  {{ getArchiveFileStateLabel(row.fileState, row) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              v-if="selectedArchiveKind === 'SURVEY_REPORT'"
              label="校验状态"
              width="130"
              align="center"
            >
              <template #default="{ row }">
                <el-tooltip
                  v-if="
                    getArchiveVerifyStatus(row).type === 'danger' && row.verificationErrorReason
                  "
                  :content="row.verificationErrorReason"
                  placement="top"
                  effect="light"
                >
                  <el-tag :type="getArchiveVerifyStatus(row).type" size="small" effect="light">
                    {{ getArchiveVerifyStatus(row).label }}
                  </el-tag>
                </el-tooltip>
                <el-tag v-else :type="getArchiveVerifyStatus(row).type" size="small" effect="light">
                  {{ getArchiveVerifyStatus(row).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上传时间" width="180" align="center">
              <template #default="{ row }">{{ formatArchiveDateTime(row.uploadTime) }}</template>
            </el-table-column>
            <el-table-column label="上传人" width="110" align="center" show-overflow-tooltip>
              <template #default="{ row }">{{ row.uploadUserName || '—' }}</template>
            </el-table-column>
            <el-table-column label="文件类型" width="110" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.fileType || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="大小" width="100" align="center">
              <template #default="{ row }">{{ formatArchiveFileSize(row.fileSize) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" align="center" fixed="right">
              <template #default="{ row }">
                <div class="archive-file-op-actions">
                  <div class="op-action-slot">
                    <el-tooltip
                      :disabled="!getRowActions(row).parse.tooltip"
                      :content="getRowActions(row).parse.tooltip"
                      placement="top"
                    >
                      <span class="op-btn-wrap">
                        <el-button
                          class="op-btn parse-btn"
                          size="small"
                          :type="getRowActions(row).parse.buttonType"
                          :plain="getRowActions(row).parse.plain"
                          :disabled="!getRowActions(row).parse.enabled"
                          @click="onParseSlotClick(row)"
                        >
                          {{ getRowActions(row).parse.label }}
                        </el-button>
                      </span>
                    </el-tooltip>
                  </div>
                  <div class="op-action-slot">
                    <el-tooltip
                      :disabled="!getRowActions(row).audit.tooltip"
                      :content="getRowActions(row).audit.tooltip"
                      placement="top"
                    >
                      <span class="op-btn-wrap">
                        <el-button
                          class="op-btn audit-btn"
                          :class="{ 'audit-btn--unavailable': !getRowActions(row).audit.enabled }"
                          size="small"
                          :type="getRowActions(row).audit.buttonType"
                          :plain="getRowActions(row).audit.plain"
                          :disabled="!getRowActions(row).audit.enabled"
                          @click="onAuditSlotClick(row)"
                        >
                          {{ getRowActions(row).audit.label }}
                        </el-button>
                      </span>
                    </el-tooltip>
                  </div>
                  <div class="op-action-slot">
                    <el-tooltip
                      v-if="!getRowActions(row).delete.enabled"
                      :content="getRowActions(row).delete.tooltip"
                      placement="top"
                    >
                      <span class="op-btn-wrap">
                        <el-button
                          class="op-btn delete-btn"
                          size="small"
                          type="danger"
                          plain
                          disabled
                        >
                          删除
                        </el-button>
                      </span>
                    </el-tooltip>
                    <el-popconfirm
                      v-else
                      title="确定删除该文件吗？"
                      @confirm="emit('delete-file', row)"
                    >
                      <template #reference>
                        <span class="op-btn-wrap">
                          <el-button class="op-btn delete-btn" size="small" type="danger" plain>
                            删除
                          </el-button>
                        </span>
                      </template>
                    </el-popconfirm>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pager-row">
          <span class="file-count">共 {{ fileTotal }} 个文件，已选 {{ selectedCount }} 个</span>
          <el-pagination
            background
            layout="sizes, prev, pager, next"
            :total="fileTotal"
            :page-size="queryForm.pageSize"
            :current-page="queryForm.pageNum"
            :page-sizes="[10, 20, 50, 100]"
            @size-change="(size) => emit('page-size-change', size)"
            @current-change="(page) => emit('page-change', page)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { Picture, Refresh, UploadFilled } from '@element-plus/icons-vue'
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'
import {
  ARCHIVE_FILE_STATE_OPTIONS,
  ARCHIVE_VERIFY_STATUS_OPTIONS,
  archiveFileTableRowClassName,
  formatArchiveDateTime,
  formatArchiveFileSize,
  getArchiveStateTagType,
  getArchiveThumbnailPreviewList,
  getArchiveThumbnailUrl,
  getArchiveVerifyStatus,
} from '@/composables/project-list/archiveFolderPresent.js'
import {
  resolveArchiveRowActions,
  getArchiveFileStateLabel,
} from '@/composables/project-list/archiveFileRowPresent.js'
import { useArchiveFileTableHeight } from '@/composables/project-list/useArchiveFileTableHeight.js'

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  selectedArchiveId: { type: [String, Number], default: null },
  selectedArchiveKind: { type: String, default: '' },
  queryForm: { type: Object, required: true },
  fileLoading: { type: Boolean, default: false },
  archiveFiles: { type: Array, default: () => [] },
  fileTotal: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
  showThumbnailColumn: { type: Boolean, default: true },
  canBatchParse: { type: Boolean, default: false },
  canBatchDelete: { type: Boolean, default: false },
  batchDeleteLoading: { type: Boolean, default: false },
  batchParseLoading: { type: Boolean, default: false },
  canPreview: { type: Function, default: () => false },
})

const emit = defineEmits([
  'update:queryForm',
  'auto-query',
  'search',
  'reset',
  'refresh',
  'batch-delete',
  'batch-parse',
  'open-upload',
  'selection-change',
  'preview',
  'open-parse-flow',
  'parse',
  'cancel-parse',
  'audit',
  'delete-file',
  'page-change',
  'page-size-change',
])

const setQueryField = createFormFieldPatcher(props, emit, 'queryForm')

function getRowActions(row) {
  return resolveArchiveRowActions(row, props.selectedArchiveKind)
}

function onParseSlotClick(row) {
  const { parse } = getRowActions(row)
  if (!parse.enabled) return
  if (parse.action === 'cancel-parse') emit('cancel-parse', row)
  else if (parse.action === 'parse') emit('parse', row)
}

function onAuditSlotClick(row) {
  const { audit } = getRowActions(row)
  if (!audit.enabled || audit.action !== 'audit') return
  emit('audit', row)
}

const verifyStatusOptions = ARCHIVE_VERIFY_STATUS_OPTIONS
const fileStateOptions = ARCHIVE_FILE_STATE_OPTIONS

const {
  tableWrapRef,
  tableBodyHostRef,
  tableBodyHeight,
  updateTableBodyHeight,
  bindTableWrapResizeObserver,
} = useArchiveFileTableHeight()

defineExpose({
  updateTableBodyHeight,
  bindTableWrapResizeObserver,
})
</script>

<style scoped>
.table-panel {
  --archive-ui-font-size: 14px;
  --archive-table-font-size: 15px;
  --archive-table-head-font-size: 15px;
  --archive-table-cell-padding-y: 16px;
  --archive-table-head-padding-y: 14px;
  --archive-control-height: 36px;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: #fff;
  padding: 12px;
  height: 100%;
  min-height: 0;
}

.query-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(
    180deg,
    var(--home-panel-grad-start) 0%,
    var(--home-panel-grad-end) 100%
  );
  flex-wrap: nowrap;
  box-sizing: border-box;
}

.query-bar-divider {
  width: 1px;
  height: 24px;
  margin: 0 2px;
  background: #c8d4e2;
  flex-shrink: 0;
}

:deep(.query-bar-btn.el-button) {
  min-width: 88px;
  height: var(--archive-control-height);
  border-radius: 8px;
  font-weight: 600;
  font-size: var(--archive-ui-font-size);
  flex-shrink: 0;
}

:deep(.query-bar-btn.el-button--danger) {
  min-width: 96px;
  border-color: #c79aa0;
  color: #7a2e35;
}

:deep(.query-bar-btn.el-button--primary) {
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.query-bar-btn.el-button--primary.is-plain) {
  background: #e8f2fc;
  color: #1f4e79;
}

:deep(.query-bar-btn.el-button--danger.is-plain) {
  background: #fff3f2;
  border-color: #f7c4bf;
  color: #b42318;
}

:deep(.query-bar .el-input__wrapper),
:deep(.query-bar .el-select__wrapper) {
  min-height: var(--archive-control-height);
  font-size: var(--archive-ui-font-size);
}

:deep(.query-bar .el-input__inner),
:deep(.query-bar .el-select__selected-item) {
  font-size: var(--archive-ui-font-size);
}

.query-item {
  width: 132px !important;
  flex: 0 0 132px;
}

.query-item.keyword {
  flex: 1 1 120px;
  width: auto !important;
  min-width: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.table-body-host {
  flex: 1 1 auto;
  min-height: 120px;
  overflow: hidden;
  box-sizing: border-box;
}

:deep(.table-wrap .el-table) {
  border-radius: 8px;
  font-size: var(--archive-table-font-size);
}

:deep(.table-wrap .el-table th.el-table__cell) {
  background: #f1f6fc;
  color: #445468;
  font-weight: 600;
  font-size: var(--archive-table-head-font-size);
  padding-top: var(--archive-table-head-padding-y);
  padding-bottom: var(--archive-table-head-padding-y);
}

:deep(.table-wrap .el-table td.el-table__cell) {
  font-size: var(--archive-table-font-size);
  padding-top: var(--archive-table-cell-padding-y);
  padding-bottom: var(--archive-table-cell-padding-y);
}

:deep(.table-wrap .el-table .el-tag) {
  --el-tag-font-size: 13px;
  height: 28px;
  padding: 0 10px;
}

:deep(.table-wrap .el-table .cell) {
  font-size: var(--archive-table-font-size);
  line-height: 1.45;
}

:deep(.archive-file-op-actions .el-button) {
  min-height: 32px;
  padding: 8px 14px;
  font-size: var(--archive-ui-font-size);
}

:deep(.table-wrap .el-table .el-table__row:hover > td.el-table__cell) {
  background: #f0f7ff !important;
}

:deep(.table-wrap .el-table .archive-file-row--verify-failed > td.el-table__cell) {
  background: #fff8f6 !important;
}

:deep(.table-wrap .el-table .archive-file-row--verify-failed:hover > td.el-table__cell) {
  background: #ffefeb !important;
}

:deep(.table-wrap .el-table .archive-file-row--parse-failed > td.el-table__cell) {
  background: #fff5f5 !important;
}

:deep(.table-wrap .el-table .archive-file-row--parse-failed:hover > td.el-table__cell) {
  background: #ffe8e8 !important;
}

.thumb {
  width: 82px;
  height: 54px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 82px;
  height: 54px;
  color: #9ca3af;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  font-size: 20px;
}

.pager-row {
  flex-shrink: 0;
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 6px 10px;
  border-top: 1px solid #e8eef5;
}

.file-count {
  color: #607286;
  font-size: var(--archive-ui-font-size);
}

:deep(.pager-row .el-pagination) {
  --el-color-primary: #1f4e79;
  font-size: var(--archive-ui-font-size);
}

:deep(.pager-row .el-pagination .el-select .el-select__wrapper) {
  min-height: 32px;
  font-size: var(--archive-ui-font-size);
}

.archive-file-op-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 1fr));
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 2px 0;
  box-sizing: border-box;
}

.op-action-slot {
  display: flex;
  justify-content: center;
  min-width: 0;
}

.op-action-slot .op-btn-wrap {
  display: flex;
  width: 100%;
}

:deep(.archive-file-op-actions .op-action-slot .el-button) {
  width: 100%;
  min-width: 0;
  padding-left: 8px;
  padding-right: 8px;
}

:deep(.archive-file-op-actions .audit-btn.audit-btn--unavailable.is-disabled),
:deep(.archive-file-op-actions .audit-btn.audit-btn--unavailable.is-disabled:hover),
:deep(.archive-file-op-actions .audit-btn.audit-btn--unavailable.is-disabled:focus) {
  color: #b0b8c4;
  border-color: #e2e6eb;
  background-color: #f4f5f7;
}

:deep(.archive-file-op-actions .el-button + .el-button) {
  margin-left: 0;
}

:deep(.archive-file-op-actions .el-popconfirm),
:deep(.archive-file-op-actions .el-tooltip__trigger) {
  display: inline-flex;
}

.op-btn-wrap {
  display: inline-flex;
}

.state-tag-parse-flow {
  cursor: pointer;
}

.state-tag-parse-flow:hover {
  filter: brightness(0.97);
  box-shadow: 0 0 0 1px rgba(31, 78, 121, 0.2);
}

.archive-file-name-link,
.archive-file-name-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  font-size: var(--archive-table-font-size);
  font-weight: 500;
}

.archive-file-name-link:hover {
  text-decoration: underline;
}

@media (max-width: 1366px) {
  .query-bar {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .query-bar-divider {
    display: none;
  }

  .query-item.keyword {
    flex: 1 1 160px;
    min-width: 120px;
  }
}
</style>
