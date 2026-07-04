<template>
  <section class="contracts-panel contracts-panel--modern project-tab-panel">
    <ProjectTabHero
      eyebrow="合同及地块"
      title="合同列表"
      :icon="Document"
      stat-grid-label="合同列表统计"
      actions-label="合同列表操作"
      :stats="heroStats"
    >
      <template #actions>
        <el-button
          class="project-tab-hero__btn project-tab-hero__btn--ghost"
          size="small"
          :loading="contractRefreshLoading"
          @click="emit('refresh-contracts')"
        >
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </template>
    </ProjectTabHero>

    <div class="contracts-table-wrap contracts-table-wrap--contract-list">
      <el-empty
        v-if="!contractLandList.length"
        description="当前项目暂无合同，可点击「刷新数据」或前往归档上传合同文件"
        :image-size="88"
        class="contracts-empty"
      />
      <el-table
        v-else
        ref="contractsTableRef"
        class="project-tab-el-table contract-list-modern-table"
        :data="pagedContractRows"
        border
        stripe
        :max-height="contractsTableHeight"
        scrollbar-always-on
        highlight-current-row
        row-key="id"
        @row-click="(row) => emit('contract-row-click', row)"
      >
        <el-table-column
          :resizable="false"
          label="序号"
          type="index"
          width="50"
          align="center"
          header-align="center"
          fixed="left"
          :index="contractRowIndex"
        />
        <el-table-column
          :resizable="false"
          prop="contractNumber"
          label="合同编号"
          min-width="130"
          fixed="left"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          :resizable="false"
          prop="transferor"
          label="出让方"
          min-width="140"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          :resizable="false"
          prop="transferee"
          label="受让方"
          min-width="140"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          :resizable="false"
          prop="totalArea"
          label="总面积(㎡)"
          width="118"
          align="right"
          header-align="center"
        />
        <el-table-column
          :resizable="false"
          prop="residentialArea"
          label="住宅面积(㎡)"
          width="118"
          align="right"
          header-align="center"
        />
        <el-table-column
          :resizable="false"
          prop="commercialArea"
          label="商业面积(㎡)"
          width="118"
          align="right"
          header-align="center"
        />
        <el-table-column
          :resizable="false"
          label="创建时间"
          width="156"
          align="center"
          header-align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column
          :resizable="false"
          label="更新时间"
          width="156"
          align="center"
          header-align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column
          :resizable="false"
          prop="remark"
          label="备注"
          min-width="100"
          header-align="center"
          show-overflow-tooltip
        />
        <el-table-column
          :resizable="false"
          label="操作"
          width="80"
          align="center"
          header-align="center"
          fixed="right"
          class-name="col-actions"
          label-class-name="col-actions"
        >
          <template #default="{ row }">
            <span class="tab-table-row-actions">
              <el-button
                class="op-btn audit-btn"
                type="primary"
                size="small"
                plain
                @click.stop="emit('edit-contract', row)"
              >
                编辑
              </el-button>
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="showContractPagination" class="contract-table-client-pagination">
        <el-pagination
          small
          background
          layout="total, prev, pager, next"
          :total="contractTableTotal"
          :page-size="contractTablePageSize"
          :current-page="contractTablePageNum"
          @current-change="onContractTablePageChange"
        />
      </div>

      <div
        v-show="contractsShowXScroll"
        class="contract-table-x-float"
        role="presentation"
        aria-hidden="true"
      >
        <div
          class="contract-table-x-float__edge contract-table-x-float__edge--left"
          :class="{ 'is-active': contractsCanScrollLeft }"
        />
        <div
          class="contract-table-x-float__edge contract-table-x-float__edge--right"
          :class="{ 'is-active': contractsCanScrollRight }"
        />
        <el-tooltip content="向左" placement="left">
          <el-button
            v-show="contractsCanScrollLeft"
            class="contract-table-x-float__fab contract-table-x-float__fab--left"
            circle
            type="primary"
            aria-label="向左查看更多列"
            @click="contractsScrollBy(-300)"
          >
            <el-icon><DArrowLeft /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="向右" placement="right">
          <el-button
            v-show="contractsCanScrollRight"
            class="contract-table-x-float__fab contract-table-x-float__fab--right"
            circle
            type="primary"
            aria-label="向右查看更多列"
            @click="contractsScrollBy(300)"
          >
            <el-icon><DArrowRight /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { clampMainListTableHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import { Document, Files, Refresh, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import { useClientTablePagination } from '@/composables/shared/useClientTablePagination.js'

const props = defineProps({
  contractLandList: { type: Array, default: () => [] },
  selectedContract: { type: Object, default: () => ({ id: '', contractNumber: '' }) },
  contractRefreshLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh-contracts', 'contract-row-click', 'edit-contract'])

const selectionSummaryText = computed(() => {
  if (props.selectedContract?.id) {
    const n = props.selectedContract.contractNumber || `ID ${props.selectedContract.id}`
    return n.length > 18 ? `${n.slice(0, 18)}…` : n
  }
  return '未选择'
})

const heroStats = computed(() => [
  {
    variant: 'slate',
    icon: Files,
    value: props.contractLandList.length,
    unit: '条',
    label: '合同总数',
  },
  {
    variant: props.selectedContract?.id ? 'teal' : 'amber',
    status: props.selectedContract?.id ? 'ok' : 'warn',
    pick: selectionSummaryText.value,
    wide: true,
    label: '当前选中',
  },
])

const contractsTableRef = ref(null)
const contractsTableHeight = computed(() => clampMainListTableHeight(props.contractLandList.length))

const {
  pagedRows: pagedContractRows,
  pageNum: contractTablePageNum,
  pageSize: contractTablePageSize,
  total: contractTableTotal,
  showPagination: showContractPagination,
  onPageChange: onContractTablePageChange,
} = useClientTablePagination(() => props.contractLandList)

const contractRowIndex = (index) =>
  (contractTablePageNum.value - 1) * contractTablePageSize + index + 1

const {
  showXScrollProxy: contractsShowXScroll,
  canScrollLeft: contractsCanScrollLeft,
  canScrollRight: contractsCanScrollRight,
  scrollTableBy: contractsScrollBy,
} = useSummaryTableHorizontalScroll(contractsTableRef, pagedContractRows)

const formatDateTime = (value) => {
  if (!value) return '-'
  const str = String(value)
  return str.replace('T', ' ').slice(0, 19)
}
</script>
