<template>
  <div class="planning-table-wrap">
    <el-table
      ref="tableRef"
      class="project-tab-el-table planning-el-table"
      :data="rows"
      border
      stripe
      row-key="id"
      :max-height="tableHeight"
      scrollbar-always-on
    >
      <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
      <el-table-column
        prop="engineeringProject"
        label="工程项目/楼栋"
        width="160"
        show-overflow-tooltip
      />
      <el-table-column label="面积类别" width="180" align="center">
        <template #default="{ row }">{{ areaCategoryText(row) }}</template>
      </el-table-column>
      <el-table-column prop="constructionNature" label="建设性质" width="200" align="center" />
      <el-table-column prop="buildingCount" label="栋数" width="150" align="center" />
      <el-table-column prop="aboveGroundFloors" label="地上层数" width="160" align="center" />
      <el-table-column prop="belowGroundFloors" label="地下层数" width="160" align="center" />
      <el-table-column prop="heightM" label="高度(m)" width="140" align="right">
        <template #default="{ row }">{{ formatNum(row.heightM) }}</template>
      </el-table-column>
      <el-table-column prop="baseAreaM2" label="基底面积(㎡)" width="170" align="right">
        <template #default="{ row }">{{ formatNum(row.baseAreaM2) }}</template>
      </el-table-column>
      <el-table-column prop="totalArea" label="总建筑面积(㎡)" width="180" align="right">
        <template #default="{ row }">{{ formatNum(row.totalArea) }}</template>
      </el-table-column>
      <el-table-column prop="farAboveGround" label="计容地上(㎡)" width="180" align="right">
        <template #default="{ row }">{{ formatNum(row.farAboveGround) }}</template>
      </el-table-column>
      <el-table-column prop="farBelowGround" label="计容地下(㎡)" width="180" align="right">
        <template #default="{ row }">{{ formatNum(row.farBelowGround) }}</template>
      </el-table-column>
    </el-table>

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
</template>

<script setup>
import { ref, toRef } from 'vue'
import { DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import '@/styles/project-tab-table.css'

const AREA_CATEGORY_TEXT = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  OTHER_PENDING: '其他待定',
}

const props = defineProps({
  rows: { type: Array, default: () => [] },
  tableHeight: { type: Number, default: 260 },
})

const tableRef = ref(null)

const {
  showXScrollProxy: showXScroll,
  canScrollLeft,
  canScrollRight,
  scrollTableBy: scrollBy,
} = useSummaryTableHorizontalScroll(tableRef, toRef(props, 'rows'))

const areaCategoryText = (row) => AREA_CATEGORY_TEXT[row.areaCategory] || row.areaCategory || '-'

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const value = Number(num)
  return Number.isNaN(value) ? '-' : value.toFixed(2)
}
</script>
