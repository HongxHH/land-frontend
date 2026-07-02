<template>
  <div class="summary-panel summary-panel--modern project-tab-panel no-print">
    <header class="summary-hero">
      <div class="summary-hero__brand">
        <div class="summary-hero__icon-wrap" aria-hidden="true">
          <el-icon class="summary-hero__icon"><DataAnalysis /></el-icon>
        </div>
        <div class="summary-hero__titles">
          <span class="summary-hero__eyebrow">房产实测汇总</span>
          <div class="summary-hero__title-row">
            <h2 class="summary-hero__title" :title="`${currentProjectInfo.name || '请选择项目'} · 房产实测信息汇总表`">
              <span class="summary-hero__project">{{ currentProjectInfo.name || '请选择项目' }}</span>
            </h2>
            <div class="summary-hero__search" role="search" aria-label="汇总表内容搜索">
              <el-input
                v-model="summarySearchKeyword"
                class="summary-hero__search-input"
                size="small"
                clearable
                placeholder="搜索本表…"
                :prefix-icon="Search"
              />
              <span v-if="summarySearchKeyword.trim()" class="summary-hero__search-hint" aria-live="polite">
                {{ filteredDisplayTableData.length }}/{{ (displayTableData || []).length }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="summary-stat-grid" role="group" aria-label="实测报告统计">
        <div class="stat-tile stat-tile--slate">
          <div class="stat-tile__icon"><el-icon><Upload /></el-icon></div>
          <div class="stat-tile__text">
            <div class="stat-tile__line">
              <span class="stat-tile__value">{{ surveyStats.total }}</span>
              <span class="stat-tile__unit">份</span>
            </div>
            <span class="stat-tile__label">已上传</span>
          </div>
        </div>
        <div class="stat-tile stat-tile--blue">
          <div class="stat-tile__icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="stat-tile__text">
            <div class="stat-tile__line">
              <span class="stat-tile__value">{{ surveyStats.success }}</span>
              <span class="stat-tile__unit">份</span>
            </div>
            <span class="stat-tile__label">解析成功</span>
          </div>
        </div>
        <div class="stat-tile stat-tile--teal">
          <div class="stat-tile__icon"><el-icon><Medal /></el-icon></div>
          <div class="stat-tile__text">
            <div class="stat-tile__line">
              <span class="stat-tile__value">{{ surveyStats.verified }}</span>
              <span class="stat-tile__unit">份</span>
            </div>
            <span class="stat-tile__label">校验通过</span>
          </div>
        </div>
        <div class="stat-tile stat-tile--rose">
          <div class="stat-tile__icon"><el-icon><Warning /></el-icon></div>
          <div class="stat-tile__text">
            <div class="stat-tile__line">
              <span class="stat-tile__value stat-tile__value--emph">{{ surveyStats.unverified }}</span>
              <span class="stat-tile__unit">份</span>
            </div>
            <span class="stat-tile__label">校验不通过</span>
          </div>
        </div>
      </div>

      <div class="summary-hero__actions" aria-label="汇总表操作">
        <div class="summary-hero__actions-row">
          <el-button class="hero-btn hero-btn--ghost" size="small" @click="$emit('configure-print-export')">
            <el-icon><Printer /></el-icon>
            打印与导出
          </el-button>
          <el-button
            class="hero-btn hero-btn--primary"
            type="primary"
            size="small"
            :icon="Refresh"
            :loading="parsedRefreshLoading"
            :disabled="!currentProjectInfo.id"
            @click="$emit('refresh-parsed')"
          >
            刷新文件列表
          </el-button>
        </div>
      </div>
    </header>

    <div
      class="summary-table-wrap project-tab-panel__body project-tab-panel__body--flush"
      v-loading="dataLoading"
      element-loading-text="正在加载汇总数据…"
    >
      <el-empty
        v-if="!dataLoading && currentProjectInfo.id && !(displayTableData || []).length"
        description="暂无已解析实测报告，请先上传并解析报告，或点击「刷新文件列表」"
        :image-size="88"
        class="summary-table-empty"
      />
      <template v-else>
      <el-table
        ref="tableRef"
        class="project-tab-el-table summary-modern-table summary-modern-table--cell-center"
        :data="summaryPagedRows"
        border
        stripe
        style="width: 100%"
        :max-height="SUMMARY_TABLE_MAX_HEIGHT"
        scrollbar-always-on
        :row-class-name="tableRowClassName"
      >
        <el-table-column label="序号" type="index" width="50" align="center" header-align="center" fixed="left" :index="summaryRowIndex" />
        <el-table-column label="工程名称" width="160" fixed="left" align="center" header-align="center" class-name="summary-col-project-name">
          <template #default="{ row }">
            <el-tooltip :content="String(row.projectName || '')" placement="top" :show-after="300">
              <span class="project-name-trigger">
                <el-link type="primary" :underline="false" class="project-name-link" @click="$emit('view-detail', row)">
                  <span class="project-name-text">{{ row.projectName }}</span>
                  <el-icon class="view-ico"><View /></el-icon>
                </el-link>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="不动产权证编号" prop="certNo" :width="colW.certNo" show-overflow-tooltip header-align="center" />
        <el-table-column label="合同/批文编号" prop="contractNo" :width="colW.contractNo" show-overflow-tooltip header-align="center" />
        <el-table-column label="期数" prop="phase" :width="colW.phase" align="center" header-align="center" />
        <el-table-column label="实测报告总建筑面积" prop="totalArea" :width="colW.totalArea" header-align="center" />

        <el-table-column label="计容" align="center" header-align="center">
          <el-table-column prop="calcCommercial" label="商业(办公)面积" :width="colW.calcCommercial" header-align="center">
            <template #default="{ row }">{{ row.calcCommercial }}</template>
          </el-table-column>
          <el-table-column prop="calcResidential" label="住宅面积" :width="colW.calcResidential" header-align="center">
            <template #default="{ row }">{{ row.calcResidential }}</template>
          </el-table-column>
          <el-table-column prop="calcPropMgmt" label="物管用房" :width="colW.calcPropMgmt" header-align="center">
            <template #default="{ row }">{{ row.calcPropMgmt }}</template>
          </el-table-column>
          <el-table-column prop="calcOther" label="其他计容" :width="colW.calcOther" header-align="center">
            <template #default="{ row }">{{ row.calcOther }}</template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="不计容" align="center" header-align="center">
          <el-table-column prop="nonCalcCommunity" label="社区用房面积" :width="colW.nonCalcCommunity" header-align="center">
            <template #default="{ row }">{{ row.nonCalcCommunity }}</template>
          </el-table-column>
          <el-table-column prop="nonCalcOther" label="其他公用面积" :width="colW.nonCalcOther" header-align="center">
            <template #default="{ row }">{{ row.nonCalcOther }}</template>
          </el-table-column>
        </el-table-column>

        <el-table-column
          label="房产面积确认告知书编号"
          prop="areaConfirmationNoticeNo"
          :width="colW.areaConfirmationNoticeNo"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column label="房地产勘测报告书编号" prop="reportNo" :width="colW.reportNo" show-overflow-tooltip header-align="center" />
        <el-table-column label="备注" prop="remarks" v-bind="remarksColProps" show-overflow-tooltip header-align="center" />
        <el-table-column label="文件原始名" prop="fileOriginalName" :width="colW.fileOriginalName" show-overflow-tooltip header-align="center" />
        <el-table-column label="待确认面积" prop="pendingConfirmArea" :width="colW.pendingConfirmArea" align="center" />
        <el-table-column
          label="验证状态"
          prop="isVerified"
          :width="colW.isVerified"
          align="center"
          header-align="center"
          class-name="summary-col-status-tag"
          :show-overflow-tooltip="false"
        >
          <template #default="{ row }">
            <el-tag :type="getVerifiedTagType(row.isVerified)" size="small" effect="light" round>
              {{ getVerifiedText(row.isVerified) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          v-if="showUnknownUsagesColumn"
          label="待确认用途详情"
          v-bind="unknownUsagesColProps"
          header-align="center"
        >
          <template #default="{ row }">
            <el-tooltip
              :content="unknownUsagesTooltip(row.unknownUsages)"
              placement="top"
              :show-after="350"
              :disabled="!hasUnknownUsageRow(row)"
            >
              <span
                class="unknown-usages-cell-text"
                :class="{ 'unknown-usages-cell-text--missing': summaryHasMissingUsage(row.unknownUsages) }"
              >
                {{ formatUnknownUsagesCell(row.unknownUsages) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          v-if="showVerificationErrorReasonColumn"
          label="验证失败原因"
          prop="verificationErrorReason"
          v-bind="verificationErrorReasonColProps"
          show-overflow-tooltip
          header-align="center"
        />
      </el-table>

      <div v-if="showSummaryTablePagination" class="summary-table-client-pagination">
        <el-pagination
          small
          background
          layout="total, prev, pager, next"
          :total="summaryTableTotal"
          :page-size="summaryTablePageSize"
          :current-page="summaryTablePageNum"
          @current-change="onSummaryTablePageChange"
        />
      </div>

      <!-- 宽表：边缘渐变 + 悬浮翻页（不占用表头上方整行空间） -->
      <div
        v-show="showXScrollProxy"
        class="table-x-float-layer"
        role="presentation"
        aria-hidden="true"
      >
        <div
          class="table-x-float-layer__edge table-x-float-layer__edge--left"
          :class="{ 'is-active': canScrollLeft }"
        />
        <div
          class="table-x-float-layer__edge table-x-float-layer__edge--right"
          :class="{ 'is-active': canScrollRight }"
        />
        <el-tooltip content="向左" placement="left">
          <el-button
            v-show="canScrollLeft"
            class="table-x-float-layer__fab table-x-float-layer__fab--left"
            circle
            type="primary"
            aria-label="向左查看更多列"
            @click="scrollTableBy(-300)"
          >
            <el-icon><DArrowLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="向右" placement="right">
          <el-button
            v-show="canScrollRight"
            class="table-x-float-layer__fab table-x-float-layer__fab--right"
            circle
            type="primary"
            aria-label="向右查看更多列"
            @click="scrollTableBy(300)"
          >
            <el-icon><DArrowRight /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  View,
  Refresh,
  DataAnalysis,
  Upload,
  CircleCheck,
  Medal,
  Warning,
  Printer,
  DArrowLeft,
  DArrowRight,
  Search
} from '@element-plus/icons-vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import { useClientTablePagination } from '@/composables/shared/useClientTablePagination.js'
import {
  formatPendingUsageDisplay,
  isEmptyUnknownUsagesJson,
  isPlaceholderVerificationReason,
  pendingUsageTooltip,
  rowHasUnknownUsagesDetail,
  summaryHasMissingUsage
} from '@/composables/file-upload/surveyUsagePending'

/** 数据少时表体随内容增高；超出后表内滚动，避免底部大块留白 */
const SUMMARY_TABLE_MAX_HEIGHT = 600

const props = defineProps({
  currentProjectInfo: {
    type: Object,
    required: true
  },
  surveyStats: {
    type: Object,
    required: true
  },
  refreshBtnLoading: {
    type: Boolean,
    default: false
  },
  parsedRefreshLoading: {
    type: Boolean,
    default: false
  },
  isRefreshCd: {
    type: Boolean,
    default: false
  },
  cdRemaining: {
    type: Number,
    default: 0
  },
  displayTableData: {
    type: Array,
    default: () => []
  },
  dataLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['refresh-survey', 'refresh-parsed', 'view-detail', 'configure-print-export'])

/** 单元格视为空：null/undefined/空白串（数值 0 与「否」等有效值不算空） */
function isEmptyCell(v) {
  if (v === null || v === undefined) return true
  if (typeof v === 'string' && v.trim() === '') return true
  return false
}

function allRowsEmpty(rows, prop) {
  if (!rows?.length) return true
  return rows.every((row) => isEmptyCell(row?.[prop]))
}

/** 整列无数据时列宽收紧为约等于表头文字宽度 */
function headerOnlyWidth(label, minPx = 64, maxPx = 360) {
  const chars = [...String(label)].length
  return Math.min(maxPx, Math.max(minPx, Math.ceil(chars * 13) + 28))
}

function colWidth(rows, prop, label, fullW) {
  return allRowsEmpty(rows, prop) ? headerOnlyWidth(label) : fullW
}

const colW = computed(() => {
  const rows = props.displayTableData || []
  return {
    fileOriginalName: colWidth(rows, 'fileOriginalName', '文件原始名', 200),
    certNo: colWidth(rows, 'certNo', '不动产权证编号', 180),
    contractNo: colWidth(rows, 'contractNo', '合同/批文编号', 160),
    phase: colWidth(rows, 'phase', '期数', 88),
    totalArea: colWidth(rows, 'totalArea', '实测报告总建筑面积', 148),
    calcCommercial: colWidth(rows, 'calcCommercial', '商业(办公)面积', 158),
    calcResidential: colWidth(rows, 'calcResidential', '住宅面积', 120),
    calcPropMgmt: colWidth(rows, 'calcPropMgmt', '物管用房', 120),
    calcOther: colWidth(rows, 'calcOther', '其他计容', 120),
    nonCalcCommunity: colWidth(rows, 'nonCalcCommunity', '社区用房面积', 148),
    nonCalcOther: colWidth(rows, 'nonCalcOther', '其他公用面积', 148),
    areaConfirmationNoticeNo: colWidth(
      rows,
      'areaConfirmationNoticeNo',
      '房产面积确认告知书编号',
      200
    ),
    reportNo: colWidth(rows, 'reportNo', '房地产勘测报告书编号', 210),
    pendingConfirmArea: colWidth(rows, 'pendingConfirmArea', '待确认面积', 108),
    isVerified: colWidth(rows, 'isVerified', '验证状态', 104)
  }
})

const remarksColProps = computed(() => {
  const rows = props.displayTableData || []
  if (allRowsEmpty(rows, 'remarks')) {
    return { width: headerOnlyWidth('备注', 56, 220) }
  }
  return { minWidth: 80 }
})

const showUnknownUsagesColumn = computed(() =>
  (props.displayTableData || []).some((row) => rowHasUnknownUsagesDetail(row))
)

const showVerificationErrorReasonColumn = computed(() =>
  (props.displayTableData || []).some((row) => !isPlaceholderVerificationReason(row.verificationErrorReason))
)

const unknownUsagesColProps = computed(() => {
  const rows = props.displayTableData || []
  if (rows.every((row) => isEmptyUnknownUsagesJson(row?.unknownUsages))) {
    return { width: headerOnlyWidth('待确认用途详情') }
  }
  return { minWidth: 160 }
})

const verificationErrorReasonColProps = computed(() => {
  const rows = props.displayTableData || []
  if (rows.every((row) => isPlaceholderVerificationReason(row?.verificationErrorReason))) {
    return { width: headerOnlyWidth('验证失败原因') }
  }
  return { minWidth: 180 }
})

const summarySearchKeyword = ref('')

const normalizeVerifiedFlag = (value) => {
  if (value === 1 || value === '1' || value === true) return 1
  if (value === 0 || value === '0' || value === false) return 0
  return null
}

const getVerifiedText = (value) => {
  const normalized = normalizeVerifiedFlag(value)
  if (normalized === 1) return '已通过'
  if (normalized === 0) return '未通过'
  return '未校验'
}

const getVerifiedTagType = (value) => {
  const normalized = normalizeVerifiedFlag(value)
  if (normalized === 1) return 'success'
  if (normalized === 0) return 'danger'
  return 'info'
}

/** 与汇总接口 hasUnknownUsage 一致：1 表示含待确认用途（未知或缺失）需人工确认 */
const hasUnknownUsageRow = (row) => Number(row?.hasUnknownUsage) === 1

const formatUnknownUsagesCell = (raw) => formatPendingUsageDisplay(raw)

const unknownUsagesTooltip = (raw) => pendingUsageTooltip(raw)

const tableRowClassName = ({ row }) => {
  const classes = []
  if (normalizeVerifiedFlag(row?.isVerified) === 0) classes.push('summary-row-unverified')
  if (hasUnknownUsageRow(row)) classes.push('summary-row-unknown-usage')
  return classes.join(' ')
}

/** 简易搜索：在各列文本与标签文案中做子串匹配（不区分大小写） */
const SUMMARY_SEARCH_FIELDS = [
  'projectName',
  'certNo',
  'contractNo',
  'phase',
  'totalArea',
  'calcCommercial',
  'calcResidential',
  'calcPropMgmt',
  'calcOther',
  'nonCalcCommunity',
  'nonCalcOther',
  'areaConfirmationNoticeNo',
  'reportNo',
  'remarks',
  'fileOriginalName',
  'pendingConfirmArea',
  'unknownUsages',
  'verificationErrorReason'
]

const buildSummarySearchHaystack = (row) => {
  const parts = SUMMARY_SEARCH_FIELDS.map((f) => String(row?.[f] ?? '').trim())
  parts.push(getVerifiedText(row?.isVerified))
  parts.push(formatUnknownUsagesCell(row?.unknownUsages))
  if (hasUnknownUsageRow(row)) parts.push('含待确认用途', '待确认', '用途缺失')
  return parts.join('\u0001').toLowerCase()
}

const filteredDisplayTableData = computed(() => {
  const rows = props.displayTableData || []
  const raw = String(summarySearchKeyword.value || '').trim().toLowerCase()
  if (!raw) return rows
  const tokens = raw.split(/\s+/).filter(Boolean)
  return rows.filter((row) => {
    const hay = buildSummarySearchHaystack(row)
    return tokens.every((t) => hay.includes(t))
  })
})

const {
  pagedRows: summaryPagedRows,
  pageNum: summaryTablePageNum,
  pageSize: summaryTablePageSize,
  total: summaryTableTotal,
  showPagination: showSummaryTablePagination,
  onPageChange: onSummaryTablePageChange
} = useClientTablePagination(filteredDisplayTableData)

const summaryRowIndex = (index) =>
  (summaryTablePageNum.value - 1) * summaryTablePageSize + index + 1

const tableRef = ref(null)
const {
  showXScrollProxy,
  canScrollLeft,
  canScrollRight,
  scrollTableBy
} = useSummaryTableHorizontalScroll(tableRef, summaryPagedRows)
</script>

<style scoped>
.summary-panel--modern.project-tab-panel {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 40px -22px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.summary-hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 11px 14px 11px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.92) 45%, rgba(241, 245, 249, 0.88) 100%);
}

.summary-hero::after {
  content: '';
  position: absolute;
  right: -20%;
  top: -60%;
  width: 45%;
  height: 200%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.1), transparent 72%);
  pointer-events: none;
}

.summary-hero__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 220px;
  min-width: 0;
  z-index: 1;
}

.summary-hero__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow:
    0 8px 18px -10px rgba(29, 78, 216, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.summary-hero__icon {
  font-size: 21px;
  color: #fff;
}

.summary-hero__titles {
  min-width: 0;
}

.summary-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.summary-hero__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.summary-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.01em;
  color: #0f172a;
  line-height: 1.2;
  flex: 0 1 auto;
  min-width: 0;
}

.summary-hero__project {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e3a5f;
}

.summary-hero__search {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: min(220px, 38vw);
}

.summary-hero__search-input {
  flex: 1 1 auto;
  min-width: 0;
  width: 146px;
}

.summary-hero__search-input :deep(.el-input__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
  box-shadow: 0 0 0 1px rgba(226, 232, 240, 0.95) inset, 0 1px 2px rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.96);
}

.summary-hero__search-hint {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #475569;
  white-space: nowrap;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.98);
  border: 1px solid rgba(226, 232, 240, 0.95);
}

.summary-stat-grid {
  position: relative;
  z-index: 1;
  flex: 2 1 360px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.stat-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.stat-tile__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.stat-tile--slate .stat-tile__icon {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.stat-tile--blue .stat-tile__icon {
  background: rgba(59, 130, 246, 0.14);
  color: #1d4ed8;
}

.stat-tile--teal .stat-tile__icon {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.stat-tile--rose .stat-tile__icon {
  background: rgba(244, 63, 94, 0.12);
  color: #be123c;
}

.stat-tile__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.stat-tile__line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1.1;
}

.stat-tile__value {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  line-height: 1;
}

.stat-tile__value--emph {
  color: #be123c;
}

.stat-tile__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.stat-tile__label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.summary-hero__actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  justify-content: center;
  min-width: 0;
}

.summary-hero__actions-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  width: auto;
  flex-wrap: nowrap;
}

.summary-hero__actions-row .hero-btn {
  flex: 0 0 auto;
  min-width: 0;
}

.hero-btn {
  justify-content: center;
  border-radius: 9px;
  font-weight: 600;
}

.hero-btn--ghost {
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
}

.hero-btn--ghost:hover {
  border-color: #94a3b8;
  background: #fff;
  color: #0f172a;
}

:deep(.hero-btn--primary.el-button--primary) {
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 20px -10px rgba(29, 78, 216, 0.65);
}

:deep(.hero-btn--primary.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

:deep(.hero-btn--primary.el-button--primary.is-disabled) {
  opacity: 0.55;
  box-shadow: none;
}

.summary-table-wrap {
  position: relative;
  background: #fff;
}

.summary-table-client-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 4px 0;
}

.project-name-trigger {
  display: block;
  width: 100%;
  min-width: 0;
}

.project-name-link {
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  vertical-align: middle;
}

.project-name-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-ico {
  flex-shrink: 0;
  margin-left: 2px;
  vertical-align: -0.12em;
}

:deep(.summary-modern-table .summary-col-project-name .cell) {
  overflow: hidden;
}

:deep(.summary-modern-table .summary-col-project-name .project-name-link .el-link__inner) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  min-width: 0;
}

/* 宽表悬浮层：覆盖在表格之上，pointer-events:none 让点击穿透到单元格；按钮/下拉单独开启 */
.table-x-float-layer {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.table-x-float-layer__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.table-x-float-layer__edge--left {
  left: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent);
}

.table-x-float-layer__edge--right {
  right: 0;
  background: linear-gradient(270deg, rgba(15, 23, 42, 0.06), transparent);
}

.table-x-float-layer__edge.is-active {
  opacity: 1;
}

.table-x-float-layer__fab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  box-shadow: 0 8px 24px -8px rgba(29, 78, 216, 0.55);
  border: none;
}

.table-x-float-layer__fab--left {
  left: 6px;
}

.table-x-float-layer__fab--right {
  right: 6px;
}

:deep(.summary-modern-table .el-table__inner-wrapper::before) {
  display: none;
}

:deep(.summary-modern-table th.el-table__cell) {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
  font-weight: 700;
  color: #334155;
  text-align: center;
  vertical-align: middle;
}

/* 勿对 th .cell 使用 flex，会破坏 el-table 表头/表体布局导致整表不渲染 */
:deep(.summary-modern-table td.el-table__cell > .cell.el-tooltip) {
  width: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}

:deep(.summary-modern-table th.el-table__cell > .cell) {
  text-align: center;
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
}

/* 表体与未单独指定对齐的列：内容居中（覆盖面积列默认右对齐） */
:deep(.summary-modern-table--cell-center td.el-table__cell > .cell) {
  text-align: center !important;
}

/* 状态标签列：禁用单元格省略号，避免「已通过」等被裁成「已通过…」 */
:deep(.summary-modern-table td.summary-col-status-tag > .cell) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

:deep(.summary-modern-table td.summary-col-status-tag .el-tag) {
  max-width: 100%;
}

:deep(.summary-modern-table--cell-center td.el-table__cell.is-right > .cell) {
  text-align: center !important;
}

/* 仅「校验不通过」：逐格底色（与未知用途行区分） */
:deep(.summary-modern-table .el-table__body tr.summary-row-unverified:not(.summary-row-unknown-usage) > td.el-table__cell) {
  background-color: #fff1f2 !important;
}

:deep(
  .summary-modern-table .el-table__body tr.summary-row-unverified:not(.summary-row-unknown-usage):hover > td.el-table__cell
) {
  background-color: #ffe4e6 !important;
}

/*
 * 含未知用途：整行统一底色（tr），单元格透明，避免每格 inset 阴影/底色叠加发乌。
 * 左侧强调线仅画在首列单元格上一条。
 */
:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage > td.el-table__cell) {
  background-color: transparent !important;
  box-shadow: none !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage.el-table__row--striped > td.el-table__cell) {
  background-color: transparent !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage) {
  background-color: #fffbeb !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage:hover) {
  background-color: #fff3cd !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage:hover > td.el-table__cell) {
  background-color: transparent !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage.summary-row-unverified) {
  background-color: #fff4e6 !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage.summary-row-unverified:hover) {
  background-color: #ffe8cc !important;
}

:deep(.summary-modern-table .el-table__body tr.summary-row-unknown-usage > td.el-table__cell:first-child) {
  box-shadow: inset 3px 0 0 #f59e0b;
}

.unknown-usages-cell-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.unknown-usages-cell-text--missing {
  color: #cf1322;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .summary-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-hero__actions {
    flex-direction: row;
  }
}

@media (max-width: 640px) {
  .summary-stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
