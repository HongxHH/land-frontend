<template>
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
        <el-table-column
          label="序号"
          type="index"
          width="50"
          align="center"
          header-align="center"
          fixed="left"
          :index="summaryRowIndex"
        />
        <el-table-column
          label="工程名称"
          width="160"
          fixed="left"
          align="center"
          header-align="center"
          class-name="summary-col-project-name"
        >
          <template #default="{ row }">
            <el-tooltip :content="String(row.projectName || '')" placement="top" :show-after="300">
              <span class="project-name-trigger">
                <el-link
                  type="primary"
                  :underline="false"
                  class="project-name-link"
                  @click="$emit('view-detail', row)"
                >
                  <span class="project-name-text">{{ row.projectName }}</span>
                  <el-icon class="view-ico"><View /></el-icon>
                </el-link>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          label="不动产权证编号"
          prop="certNo"
          :width="colW.certNo"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column
          label="合同/批文编号"
          prop="contractNo"
          :width="colW.contractNo"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column
          label="期数"
          prop="phase"
          :width="colW.phase"
          align="center"
          header-align="center"
        />
        <el-table-column
          label="实测报告总建筑面积"
          prop="totalArea"
          :width="colW.totalArea"
          header-align="center"
        />

        <el-table-column label="计容" align="center" header-align="center">
          <el-table-column
            prop="calcCommercial"
            label="商业(办公)面积"
            :width="colW.calcCommercial"
            header-align="center"
          >
            <template #default="{ row }">{{ row.calcCommercial }}</template>
          </el-table-column>
          <el-table-column
            prop="calcResidential"
            label="住宅面积"
            :width="colW.calcResidential"
            header-align="center"
          >
            <template #default="{ row }">{{ row.calcResidential }}</template>
          </el-table-column>
          <el-table-column
            prop="calcPropMgmt"
            label="物管用房"
            :width="colW.calcPropMgmt"
            header-align="center"
          >
            <template #default="{ row }">{{ row.calcPropMgmt }}</template>
          </el-table-column>
          <el-table-column
            prop="calcOther"
            label="其他计容"
            :width="colW.calcOther"
            header-align="center"
          >
            <template #default="{ row }">{{ row.calcOther }}</template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="不计容" align="center" header-align="center">
          <el-table-column
            prop="nonCalcCommunity"
            label="社区用房面积"
            :width="colW.nonCalcCommunity"
            header-align="center"
          >
            <template #default="{ row }">{{ row.nonCalcCommunity }}</template>
          </el-table-column>
          <el-table-column
            prop="nonCalcOther"
            label="其他公用面积"
            :width="colW.nonCalcOther"
            header-align="center"
          >
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
        <el-table-column
          label="房地产勘测报告书编号"
          prop="reportNo"
          :width="colW.reportNo"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column
          label="备注"
          prop="remarks"
          v-bind="remarksColProps"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column
          label="文件原始名"
          prop="fileOriginalName"
          :width="colW.fileOriginalName"
          show-overflow-tooltip
          header-align="center"
        />
        <el-table-column
          label="待确认面积"
          prop="pendingConfirmArea"
          :width="colW.pendingConfirmArea"
          align="center"
        />
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
                :class="{
                  'unknown-usages-cell-text--missing': summaryHasMissingUsage(row.unknownUsages),
                }"
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { View, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { normalizeVerifiedFlag } from '@/utils/fileStatePresent.js'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import { useClientTablePagination } from '@/composables/shared/useClientTablePagination.js'
import {
  formatPendingUsageDisplay,
  isEmptyUnknownUsagesJson,
  isPlaceholderVerificationReason,
  pendingUsageTooltip,
  rowHasUnknownUsagesDetail,
  summaryHasMissingUsage,
} from '@/composables/file-upload/surveyUsagePending'

/** 数据少时表体随内容增高；超出后表内滚动，避免底部大块留白 */
const SUMMARY_TABLE_MAX_HEIGHT = 600

const props = defineProps({
  currentProjectInfo: {
    type: Object,
    required: true,
  },
  displayTableData: {
    type: Array,
    default: () => [],
  },
  dataLoading: {
    type: Boolean,
    default: false,
  },
  searchKeyword: {
    type: String,
    default: '',
  },
})

defineEmits(['view-detail'])

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
    isVerified: colWidth(rows, 'isVerified', '验证状态', 104),
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
  (props.displayTableData || []).some(
    (row) => !isPlaceholderVerificationReason(row.verificationErrorReason)
  )
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
  'verificationErrorReason',
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
  const raw = String(props.searchKeyword || '')
    .trim()
    .toLowerCase()
  if (!raw) return rows
  const tokens = raw.split(/\s+/).filter(Boolean)
  return rows.filter((row) => {
    const hay = buildSummarySearchHaystack(row)
    return tokens.every((t) => hay.includes(t))
  })
})

defineExpose({ filteredDisplayTableData })

const {
  pagedRows: summaryPagedRows,
  pageNum: summaryTablePageNum,
  pageSize: summaryTablePageSize,
  total: summaryTableTotal,
  showPagination: showSummaryTablePagination,
  onPageChange: onSummaryTablePageChange,
} = useClientTablePagination(filteredDisplayTableData)

const summaryRowIndex = (index) =>
  (summaryTablePageNum.value - 1) * summaryTablePageSize + index + 1

const tableRef = ref(null)
const { showXScrollProxy, canScrollLeft, canScrollRight, scrollTableBy } =
  useSummaryTableHorizontalScroll(tableRef, summaryPagedRows)
</script>
