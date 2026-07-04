<template>
  <div class="planning-table-wrap">
    <el-table
      ref="tableRef"
      class="project-tab-el-table planning-el-table"
      :data="logs"
      border
      stripe
      row-key="id"
      :max-height="tableHeight"
      scrollbar-always-on
    >
      <el-table-column
        :resizable="false"
        type="index"
        label="序号"
        width="72"
        align="center"
        :index="(idx) => idx + 1"
      />
      <el-table-column
        :resizable="false"
        prop="operatorName"
        label="操作人"
        width="160"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">{{ row.operatorName || '-' }}</template>
      </el-table-column>
      <el-table-column
        :resizable="false"
        prop="operateTime"
        label="操作时间"
        width="200"
        align="center"
      >
        <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
      </el-table-column>
      <el-table-column
        :resizable="false"
        prop="operation"
        label="操作类型"
        width="140"
        align="center"
      >
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ getOperationLabel(row.operation) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        :resizable="false"
        prop="targetType"
        label="目标类型"
        width="150"
        align="center"
      >
        <template #default="{ row }">{{ getTargetTypeLabel(row.targetType) }}</template>
      </el-table-column>
      <el-table-column
        :resizable="false"
        prop="targetId"
        label="目标ID"
        width="140"
        align="center"
        show-overflow-tooltip
      />
      <el-table-column
        :resizable="false"
        prop="changeSummary"
        label="行为"
        min-width="280"
        show-overflow-tooltip
      >
        <template #default="{ row }">{{
          formatAuditChangeSummary(row.changeSummary, row.operation)
        }}</template>
      </el-table-column>
      <el-table-column :resizable="false" label="详情" width="88" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="emit('open-detail', row)"
            >查看</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!loading && projectId && logs.length === 0"
      description="暂无审计日志，可调整筛选条件或点击刷新"
      :image-size="80"
      class="audit-empty"
    />

    <div v-show="showXScroll" class="planning-table-x-float" role="presentation" aria-hidden="true">
      <div
        class="planning-table-x-float__edge planning-table-x-float__edge--left"
        :class="{ 'is-active': canScrollLeft }"
      />
      <div
        class="planning-table-x-float__edge planning-table-x-float__edge--right"
        :class="{ 'is-active': canScrollRight }"
      />
      <el-tooltip content="向左" placement="left">
        <el-button
          v-show="canScrollLeft"
          class="planning-table-x-float__fab planning-table-x-float__fab--left"
          circle
          type="primary"
          aria-label="向左查看更多列"
          @click="scrollBy(-300)"
        >
          <el-icon><DArrowLeft /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="向右" placement="right">
        <el-button
          v-show="canScrollRight"
          class="planning-table-x-float__fab planning-table-x-float__fab--right"
          circle
          type="primary"
          aria-label="向右查看更多列"
          @click="scrollBy(300)"
        >
          <el-icon><DArrowRight /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>

  <div ref="pagerRef" class="audit-pager">
    <el-pagination
      background
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      :current-page="pageNum"
      :page-sizes="[10, 20, 50, 100]"
      @size-change="(size) => emit('size-change', size)"
      @current-change="(page) => emit('page-change', page)"
    />
  </div>

  <el-dialog
    :model-value="detailVisible"
    title="审计日志详情"
    width="640px"
    destroy-on-close
    append-to-body
    @update:model-value="emit('update:detailVisible', $event)"
  >
    <dl v-if="detailRow" class="audit-detail-list">
      <div class="audit-detail-item">
        <dt>操作人</dt>
        <dd>{{ detailRow.operatorName || '-' }}</dd>
      </div>
      <div class="audit-detail-item">
        <dt>操作时间</dt>
        <dd>{{ formatDateTime(detailRow.operateTime) }}</dd>
      </div>
      <div class="audit-detail-item">
        <dt>操作类型</dt>
        <dd>{{ getOperationLabel(detailRow.operation) }}</dd>
      </div>
      <div class="audit-detail-item">
        <dt>目标</dt>
        <dd>{{ getTargetTypeLabel(detailRow.targetType) }} / {{ detailRow.targetId || '-' }}</dd>
      </div>
      <div class="audit-detail-item audit-detail-item--block">
        <dt>行为摘要</dt>
        <dd>{{ formatAuditChangeSummary(detailRow.changeSummary, detailRow.operation) }}</dd>
      </div>
      <div class="audit-detail-item audit-detail-item--block">
        <dt>变更详情</dt>
        <dd class="audit-detail-pre">
          {{ formatAuditChangeDetail(detailRow.changeSummary, detailRow.operation) }}
        </dd>
      </div>
    </dl>
  </el-dialog>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import {
  formatAuditChangeDetail,
  formatAuditChangeSummary,
  getOperationLabel,
  getTargetTypeLabel,
} from '@/utils/auditLogFormatter.js'
import '@/styles/operation-audit-tab.css'

const props = defineProps({
  loading: { type: Boolean, default: false },
  logs: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  tableHeight: { type: Number, default: 320 },
  pageNum: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  projectId: { type: [String, Number], default: '' },
  detailVisible: { type: Boolean, default: false },
  detailRow: { type: Object, default: null },
})

const emit = defineEmits(['size-change', 'page-change', 'open-detail', 'update:detailVisible'])

const tableRef = ref(null)
const pagerRef = ref(null)

const {
  showXScrollProxy: showXScroll,
  canScrollLeft,
  canScrollRight,
  scrollTableBy: scrollBy,
} = useSummaryTableHorizontalScroll(tableRef, toRef(props, 'logs'))

const formatDateTime = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

defineExpose({ pagerRef })
</script>
