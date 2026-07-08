<template>
  <el-dialog
    v-model="visible"
    class="summary-print-export-dialog"
    fullscreen
    destroy-on-close
    append-to-body
    align-center
    :show-close="true"
    :close-on-click-modal="false"
    @closed="onClosed"
  >
    <template #header="{ titleId: ariaTitleId }">
      <header class="spe-header">
        <div class="spe-header__mark" aria-hidden="true" />
        <div class="spe-header__text">
          <h2 :id="ariaTitleId" class="spe-header__title">打印与导出</h2>
        </div>
      </header>
    </template>

    <div class="spe-shell">
      <aside class="spe-panel spe-panel--config" aria-label="列与对比表设置">
        <el-form label-position="top" class="spe-form">
          <el-form-item>
            <template #label>
              <span class="spe-label">汇总表列</span>
              <span class="spe-label-hint">勾选显示 · 上移/下移排序</span>
            </template>
            <div class="spe-table-wrap">
              <el-table
                :data="localRows"
                border
                size="small"
                class="spe-layout-table"
                max-height="min(52vh, 420px)"
              >
                <el-table-column label="显示" width="56" align="center">
                  <template #default="{ row }">
                    <el-checkbox v-model="row.visible" class="spe-cb" />
                  </template>
                </el-table-column>
                <el-table-column label="列名" min-width="160">
                  <template #default="{ row }">
                    <span class="spe-col-name">{{ columnLabel(row.id) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="调整" width="128" align="center">
                  <template #default="{ $index }">
                    <el-button
                      text
                      type="primary"
                      size="small"
                      class="spe-move-btn"
                      :disabled="$index === 0"
                      @click="moveUp($index)"
                    >
                      上移
                    </el-button>
                    <el-button
                      text
                      type="primary"
                      size="small"
                      class="spe-move-btn"
                      :disabled="$index === localRows.length - 1"
                      @click="moveDown($index)"
                    >
                      下移
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-form-item>

          <el-form-item>
            <template #label>
              <span class="spe-label">附带面积对比表</span>
            </template>
            <div class="spe-chip-group" role="group">
              <el-checkbox-group v-model="comparisonGroupsModel" class="spe-chip-group__inner">
                <label v-for="item in comparisonGroupOptions" :key="item.key" class="spe-chip">
                  <el-checkbox :label="item.key">{{ item.label }}</el-checkbox>
                </label>
              </el-checkbox-group>
            </div>
          </el-form-item>
        </el-form>
      </aside>

      <section class="spe-panel spe-panel--preview" aria-label="打印导出实时预览">
        <div v-if="!previewColumnDefs.length" class="spe-preview-empty">
          <span class="spe-preview-empty__icon" aria-hidden="true">⬚</span>
          <p>请至少勾选一列</p>
          <p class="spe-preview-empty__sub">勾选后表头与数据会立即出现在此区域</p>
        </div>
        <div v-else class="spe-preview-frame">
          <div class="spe-preview-scroll spe-preview-scroll--main">
            <table class="spe-preview-table" aria-label="打印导出主表预览">
              <thead>
                <tr>
                  <template v-for="(cell, ti) in previewHeaderModel.topCells" :key="'pv-t-' + ti">
                    <th v-if="cell.rowspan > 1" :rowspan="cell.rowspan" :colspan="cell.colspan">
                      {{ cell.text }}
                    </th>
                    <th v-else :colspan="cell.colspan">{{ cell.text }}</th>
                  </template>
                </tr>
                <tr v-if="previewHeaderModel.bottomCells.length">
                  <th v-for="(cell, bi) in previewHeaderModel.bottomCells" :key="'pv-b-' + bi">
                    {{ cell.text }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in previewRows" :key="row.id ?? `p-${ri}`">
                  <td v-for="col in previewColumnDefs" :key="col.id">
                    {{ previewCell(col, row, ri) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="previewRows.length === 0" class="spe-preview-no-rows">
              暂无数据行，仅展示表头结构
            </p>
          </div>
        </div>

        <div class="spe-comparison-preview" aria-label="附带面积对比表预览">
          <div class="spe-comparison-preview__viewport">
            <div v-if="!comparisonGroupsModel?.length" class="spe-comparison-preview__empty">
              请至少勾选一组对比结果，打印与 Excel 才会包含附表
            </div>
            <div v-else class="spe-comparison-preview__scroll">
              <div
                v-for="group in previewComparisonGroups"
                :key="group.key"
                class="spe-comparison-block"
              >
                <div class="spe-comparison-block__title">{{ group.title }}</div>
                <table class="spe-comparison-table" :aria-label="group.title">
                  <thead>
                    <tr>
                      <th>维度</th>
                      <th>合同约定面积</th>
                      <th>计容面积</th>
                      <th>差值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="line in group.rows" :key="`${group.key}-${line.label}`">
                      <td>{{ line.label }}</td>
                      <td>{{ line.contractAgreedArea }}</td>
                      <td>{{ line.buildableArea }}</td>
                      <td>{{ line.difference }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <footer class="spe-footer">
        <p v-if="validationError" class="spe-footer__error" role="alert">{{ validationError }}</p>
        <el-button class="spe-footer__ghost" round @click="visible = false">取消</el-button>
        <div class="spe-footer__actions">
          <el-button class="spe-footer__print" round plain type="primary" @click="onPrint">
            <el-icon class="el-icon--left"><Printer /></el-icon>
            打印
          </el-button>
          <el-button class="spe-footer__excel" round type="primary" @click="onExport">
            <el-icon class="el-icon--left"><Download /></el-icon>
            导出 Excel
          </el-button>
        </div>
      </footer>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Printer, Download } from '@element-plus/icons-vue'
import {
  getSummaryColumnDef,
  getColumnConfigLabel,
  buildTwoRowHeaderModel,
  resolveVisibleColumnDefs,
  formatSummaryCellValue,
} from '@/composables/project-list/summaryExportColumnSchema.js'
import { saveSummaryLayoutToStorage } from '@/composables/project-list/summaryExportLayoutStorage.js'
import { buildSelectedComparisonGroups } from '@/composables/project-list/summaryAreaComparisonTables.js'
import { SUMMARY_COMPARISON_GROUP_META } from '@/composables/project-list/summaryComparisonGroupMeta.js'

const comparisonGroupOptions = SUMMARY_COMPARISON_GROUP_META.map((item) => ({
  key: item.key,
  label: item.printTitle || item.title,
}))

const props = defineProps({
  previewTableData: {
    type: Array,
    default: () => [],
  },
  /** 与页面「面积核算对比」同源，用于附表实时预览 */
  areaComparison: {
    type: Object,
    default: () => ({
      systemCalculated: {},
      projectPartyDeclared: {},
      planningCalculated: {},
      capacityIndicatorCalculated: {},
    }),
  },
})

const visible = defineModel({ type: Boolean, default: false })

const layoutRows = defineModel('layoutRows', {
  type: Array,
  required: true,
})

const comparisonGroupsModel = defineModel('comparisonGroups', {
  type: Array,
  required: true,
})

const emit = defineEmits(['after-print-request', 'after-export-request'])

const localRows = ref([])
const validationError = ref('')

const previewColumnDefs = computed(() => resolveVisibleColumnDefs(localRows.value))

const previewHeaderModel = computed(() => buildTwoRowHeaderModel(previewColumnDefs.value))

/** 不截断行数：全量渲染，由预览区滚动承载 */
const previewRows = computed(() => props.previewTableData || [])

const previewComparisonGroups = computed(() =>
  buildSelectedComparisonGroups(props.areaComparison, comparisonGroupsModel.value || [])
)

function previewCell(col, row, ri) {
  return formatSummaryCellValue(col, row, ri)
}

function columnLabel(id) {
  const def = getSummaryColumnDef(id)
  return def ? getColumnConfigLabel(def) : id
}

function syncLocalFromParent() {
  localRows.value = (layoutRows.value || []).map((r) => ({
    id: r.id,
    visible: r.visible !== false,
  }))
}

watch(
  visible,
  (v) => {
    if (v) {
      validationError.value = ''
      syncLocalFromParent()
    }
  },
  { flush: 'post' }
)

watch([localRows, comparisonGroupsModel], () => {
  if (validationError.value) validationError.value = ''
}, { deep: true })

function onClosed() {
  syncLocalFromParent()
}

function moveUp(i) {
  if (i <= 0) return
  const arr = localRows.value
  const t = arr[i - 1]
  arr[i - 1] = arr[i]
  arr[i] = t
}

function moveDown(i) {
  const arr = localRows.value
  if (i >= arr.length - 1) return
  const t = arr[i + 1]
  arr[i + 1] = arr[i]
  arr[i] = t
}

function validate() {
  if (!localRows.value.some((r) => r.visible)) {
    validationError.value = '请至少勾选一列汇总数据'
    return false
  }
  if (!comparisonGroupsModel.value?.length) {
    validationError.value = '请至少选择一组面积核算对比数据'
    return false
  }
  validationError.value = ''
  return true
}

function commitLayout() {
  layoutRows.value = localRows.value.map((r) => ({ id: r.id, visible: r.visible !== false }))
  saveSummaryLayoutToStorage(layoutRows.value)
}

function onPrint() {
  if (!validate()) return
  commitLayout()
  visible.value = false
  emit('after-print-request')
}

function onExport() {
  if (!validate()) return
  commitLayout()
  visible.value = false
  emit('after-export-request')
}
</script>

<style scoped>
.spe-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  text-align: left;
  padding-right: 36px;
}

.spe-header__mark {
  width: 5px;
  align-self: stretch;
  min-height: 44px;
  border-radius: 3px;
  background: linear-gradient(180deg, #c5a059 0%, #1e3a5f 72%, #0f172a 100%);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.15);
  flex-shrink: 0;
}

.spe-header__title {
  margin: 0;
  font-family: 'IBM Plex Serif', 'Songti SC', 'SimSun', serif;
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #0c1929;
  line-height: 1.25;
}

.spe-header__sub {
  margin: 6px 0 0;
  font-family: 'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  color: #64748b;
  line-height: 1.45;
  max-width: 52rem;
}

.spe-shell {
  --spe-shell-h: min(72vh, 820px);
  --spe-comparison-viewport-h: min(36vh, 440px);
  display: grid;
  grid-template-columns: minmax(300px, 400px) minmax(0, 1fr);
  gap: 0;
  min-height: var(--spe-shell-h);
  margin: -8px -16px -6px;
  border-top: 1px solid rgba(30, 58, 95, 0.1);
  font-family: 'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 宽屏：锁定主体高度，避免勾选对比项时整窗高度抖动 */
@media (min-width: 1025px) {
  .spe-shell {
    height: var(--spe-shell-h);
    max-height: var(--spe-shell-h);
    overflow: hidden;
  }

  .spe-shell > .spe-panel--config,
  .spe-shell > .spe-panel--preview {
    min-height: 0;
  }

  .spe-panel--config {
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .spe-panel--preview {
    min-height: 0;
    overflow: hidden;
  }
}

@media (max-width: 1024px) {
  .spe-shell {
    grid-template-columns: 1fr;
    min-height: auto;
    height: auto;
    max-height: none;
    overflow: visible;
  }
}

.spe-panel--config {
  padding: 16px 18px 20px;
  background: linear-gradient(165deg, #f8fafc 0%, #f1f5f9 55%, #eef2f6 100%);
  border-right: 1px solid rgba(30, 58, 95, 0.1);
}

@media (max-width: 1024px) {
  .spe-panel--config {
    border-right: none;
    border-bottom: 1px solid rgba(30, 58, 95, 0.1);
  }
}

.spe-panel__head {
  margin-bottom: 14px;
}

.spe-panel__kicker {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 4px;
}

.spe-panel__name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.spe-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.spe-form :deep(.el-form-item__label) {
  width: 100% !important;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  margin-bottom: 8px !important;
  line-height: 1.3;
}

.spe-form :deep(.el-form-item__content) {
  width: 100%;
  max-width: 100%;
}

.spe-label {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.spe-label-hint {
  font-size: 11.5px;
  font-weight: 500;
  color: #94a3b8;
}

.spe-table-wrap {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 8px 28px -18px rgba(15, 23, 42, 0.2);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.spe-layout-table {
  width: 100%;
}

.spe-layout-table :deep(th.el-table__cell) {
  background: linear-gradient(180deg, #fff 0%, #f8fafc 100%) !important;
  font-size: 11.5px;
  font-weight: 700;
  color: #475569;
}

.spe-layout-table :deep(.el-table__cell) {
  font-size: 12px;
}

.spe-col-name {
  color: #334155;
  font-weight: 500;
}

.spe-move-btn {
  padding: 0 4px;
}

/* 与上方「汇总表列」表格同宽：占满表单项内容区 */
.spe-chip-group {
  width: 100%;
  min-width: 0;
}

.spe-chip-group__inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.spe-chip-group :deep(.el-checkbox-group) {
  display: flex !important;
  flex-direction: column !important;
  flex-wrap: nowrap !important;
  align-items: stretch !important;
  width: 100%;
  gap: 8px;
}

.spe-chip {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.spe-chip:hover {
  border-color: rgba(30, 58, 95, 0.35);
  box-shadow: 0 6px 20px -14px rgba(15, 23, 42, 0.25);
  background: #fff;
}

.spe-chip :deep(.el-checkbox) {
  width: 100%;
  height: auto;
  white-space: normal;
  align-items: flex-start;
}

.spe-chip :deep(.el-checkbox__label) {
  font-size: 12.5px;
  font-weight: 600;
  color: #334155;
  line-height: 1.35;
}

.spe-panel--preview {
  display: flex;
  flex-direction: column;
  padding: 16px 18px 18px;
  background:
    radial-gradient(120% 80% at 100% 0%, rgba(59, 130, 246, 0.06), transparent 50%),
    linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
  min-height: min(72vh, 820px);
}

@media (min-width: 1025px) {
  .spe-panel--preview {
    min-height: 0;
    height: 100%;
  }
}

@media (max-width: 1024px) {
  .spe-panel--preview {
    min-height: 480px;
  }
}

.spe-preview-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 16px;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  background: rgba(248, 250, 252, 0.6);
  color: #64748b;
  font-size: 13px;
}

.spe-preview-empty__icon {
  font-size: 28px;
  opacity: 0.35;
  margin-bottom: 8px;
}

.spe-preview-empty__sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.spe-preview-frame {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.spe-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(30, 58, 95, 0.12);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 1) inset,
    0 18px 48px -32px rgba(15, 23, 42, 0.18);
}

/* 主表与对比附表同列：主表占剩余空间，高度由父级 flex 分配，避免附表内容变化时上下拉扯 */
.spe-preview-scroll.spe-preview-scroll--main {
  flex: 1 1 0;
  min-height: min(28vh, 300px);
  max-height: none;
}

.spe-preview-table {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.spe-preview-table th,
.spe-preview-table td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 9px 11px;
  text-align: center;
  vertical-align: middle;
  white-space: nowrap;
}

.spe-preview-table th:last-child,
.spe-preview-table td:last-child {
  border-right: none;
}

.spe-preview-table thead th {
  background: linear-gradient(180deg, #f1f5f9 0%, #e8edf3 100%);
  font-weight: 700;
  color: #1e293b;
  position: sticky;
  box-shadow: 0 1px 0 #cbd5e1;
}

.spe-preview-table thead tr:first-child th {
  top: 0;
  z-index: 3;
}

.spe-preview-table thead tr:nth-child(2) th {
  top: 38px;
  z-index: 2;
}

.spe-preview-table tbody tr:nth-child(even) td {
  background: #fafbfc;
}

.spe-preview-table tbody tr:hover td {
  background: #eff6ff;
}

.spe-preview-no-rows {
  margin: 0;
  padding: 20px;
  text-align: center;
  font-size: 12.5px;
  color: #94a3b8;
}

.spe-comparison-preview {
  margin-top: 14px;
  flex-shrink: 0;
}

/* 固定附表区域高度：勾选 0～3 项时外层尺寸不变，仅内部滚动 */
.spe-comparison-preview__viewport {
  flex: 0 0 auto;
  width: 100%;
  height: var(--spe-comparison-viewport-h, min(36vh, 440px));
  min-height: var(--spe-comparison-viewport-h, min(36vh, 440px));
  max-height: var(--spe-comparison-viewport-h, min(36vh, 440px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.55);
  box-sizing: border-box;
}

.spe-comparison-preview__empty {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 14px 16px;
  font-size: 12.5px;
  color: #64748b;
  background: rgba(248, 250, 252, 0.9);
  border: none;
  border-radius: 0;
}

.spe-comparison-preview__scroll {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px 10px 10px;
  -webkit-overflow-scrolling: touch;
}

.spe-comparison-block {
  margin-bottom: 14px;
}

.spe-comparison-block:last-child {
  margin-bottom: 0;
}

.spe-comparison-block__title {
  font-size: 12.5px;
  font-weight: 700;
  color: #1e3a5f;
  margin-bottom: 6px;
  padding-left: 2px;
}

.spe-comparison-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(30, 58, 95, 0.12);
  background: #fff;
}

.spe-comparison-table th,
.spe-comparison-table td {
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #e2e8f0;
  padding: 7px 10px;
  text-align: center;
}

.spe-comparison-table th:last-child,
.spe-comparison-table td:last-child {
  border-right: none;
}

.spe-comparison-table thead th {
  background: linear-gradient(180deg, #eef2f6 0%, #e2e8f0 100%);
  font-weight: 700;
  color: #334155;
}

.spe-comparison-table tbody tr:last-child td {
  border-bottom: none;
}

.spe-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.spe-footer__error {
  flex: 1 1 100%;
  margin: 0 0 4px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.45);
  background: rgba(255, 251, 235, 0.95);
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
}

.spe-footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.spe-footer__ghost {
  font-weight: 600;
}

.spe-footer__print {
  font-weight: 600;
  border-width: 1.5px;
}

.spe-footer__excel {
  font-weight: 700;
  box-shadow: 0 8px 24px -12px rgba(30, 64, 175, 0.55);
}
</style>

<style>
/* el-dialog 挂载在 body，需非 scoped 覆盖主题容器 */
.summary-print-export-dialog.el-dialog {
  --spe-dialog-radius: 14px;
  border-radius: var(--spe-dialog-radius);
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(30, 58, 95, 0.14);
  box-shadow:
    0 24px 80px -24px rgba(15, 23, 42, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

.summary-print-export-dialog .el-dialog__header {
  margin: 0;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(30, 58, 95, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.summary-print-export-dialog .el-dialog__headerbtn {
  top: 14px;
  right: 12px;
}

.summary-print-export-dialog .el-dialog__body {
  padding: 0 16px 12px;
  background: #f8fafc;
}

.summary-print-export-dialog .el-dialog__footer {
  margin: 0;
  padding: 12px 20px 16px;
  border-top: 1px solid rgba(30, 58, 95, 0.1);
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

/* 全屏：占满视口，正文区 flex 伸展，右侧预览主表尽量占满剩余高度并可横向完整滚动浏览 */
.summary-print-export-dialog.el-dialog.is-fullscreen {
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

.summary-print-export-dialog.is-fullscreen .el-dialog__header,
.summary-print-export-dialog.is-fullscreen .el-dialog__footer {
  flex-shrink: 0;
}

.summary-print-export-dialog.is-fullscreen .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.summary-print-export-dialog.is-fullscreen .spe-shell {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  max-height: none;
  --spe-shell-h: 100%;
  --spe-comparison-viewport-h: min(26vh, 320px);
}

@media (min-width: 1025px) {
  .summary-print-export-dialog.is-fullscreen .spe-shell {
    height: 100%;
    max-height: none;
    overflow: hidden;
  }

  .summary-print-export-dialog.is-fullscreen .spe-preview-scroll.spe-preview-scroll--main {
    min-height: 120px;
  }
}
</style>
