<template>
  <Teleport v-if="isPrinting" to="#print-target">
    <div class="print-info-section">
      <div class="print-title">{{ currentProjectInfo.name || '项目' }}房产实测信息汇总表</div>
      <div class="print-meta-row">
        <span>打印日期：{{ currentPrintDate }}</span>
        <span>单位：平方米</span>
      </div>
    </div>

    <table class="native-print-table data-table">
      <thead>
        <tr>
          <template v-for="(cell, ti) in headerModel.topCells" :key="'pt-' + ti">
            <th v-if="cell.rowspan > 1" :rowspan="cell.rowspan" :colspan="cell.colspan">{{ cell.text }}</th>
            <th v-else :colspan="cell.colspan">{{ cell.text }}</th>
          </template>
        </tr>
        <tr v-if="headerModel.bottomCells.length">
          <th v-for="(cell, bi) in headerModel.bottomCells" :key="'pb-' + bi">{{ cell.text }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in displayTableData" :key="row.id ?? `r-${index}`">
          <td v-for="col in resolvedMainColumns" :key="col.id">{{ cellText(col, row, index) }}</td>
        </tr>
      </tbody>
    </table>

    <section v-for="group in selectedPrintGroups" :key="group.key" class="print-comparison-group">
      <div class="print-group-title">{{ group.title }}</div>
      <table class="native-print-table info-table" style="margin-top: 8px;">
        <thead>
          <tr>
            <th>维度</th>
            <th>合同约定面积</th>
            <th>计容面积</th>
            <th>差值</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in group.rows" :key="`${group.key}-${row.label}`">
            <td>{{ row.label }}</td>
            <td>{{ row.contractAgreedArea }}</td>
            <td>{{ row.buildableArea }}</td>
            <td>{{ row.difference }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <div class="print-footer">
      <div class="print-signatures">
        <div>制表人：__________</div>
        <div>审核人：__________</div>
        <div>日期：__________</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { buildTwoRowHeaderModel, formatSummaryCellValue } from '@/composables/project-list/summaryExportColumnSchema.js'
import { buildSelectedComparisonGroups } from '@/composables/project-list/summaryAreaComparisonTables.js'
import { SUMMARY_COMPARISON_GROUP_KEYS } from '@/composables/project-list/summaryComparisonGroupMeta.js'

const props = defineProps({
  isPrinting: {
    type: Boolean,
    default: false
  },
  /** 打印主表列（与导出一致，由「打印与导出设置」生成） */
  resolvedMainColumns: {
    type: Array,
    default: () => []
  },
  currentProjectInfo: {
    type: Object,
    required: true
  },
  currentPrintDate: {
    type: String,
    required: true
  },
  displayTableData: {
    type: Array,
    default: () => []
  },
  areaComparison: {
    type: Object,
    default: () => ({
      systemCalculated: {},
      projectPartyDeclared: {},
      planningCalculated: {},
      capacityIndicatorCalculated: {}
    })
  },
  selectedComparisonGroups: {
    type: Array,
    default: () => [...SUMMARY_COMPARISON_GROUP_KEYS]
  }
})

const headerModel = computed(() => buildTwoRowHeaderModel(props.resolvedMainColumns || []))

const cellText = (col, row, index) => formatSummaryCellValue(col, row, index)

const selectedPrintGroups = computed(() =>
  buildSelectedComparisonGroups(props.areaComparison, props.selectedComparisonGroups)
)
</script>
