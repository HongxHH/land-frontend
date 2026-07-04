<template>
  <div ref="tableWrapRef" class="planning-table-wrap">
    <el-table
      ref="tableRef"
      class="project-tab-el-table planning-el-table"
      :data="forms"
      border
      stripe
      row-key="id"
      :max-height="tableHeight"
      scrollbar-always-on
      highlight-current-row
      @row-click="(row) => emit('row-click', row)"
    >
      <el-table-column type="index" width="52" label="序号" align="center" fixed="left" />
      <el-table-column
        prop="projectName"
        label="项目名称"
        min-width="200"
        fixed="left"
        show-overflow-tooltip
      />
      <el-table-column
        prop="constructionUnit"
        label="建设单位"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column prop="designUnit" label="设计单位" min-width="180" show-overflow-tooltip />
      <el-table-column
        prop="constructionLocation"
        label="建设地点"
        min-width="140"
        show-overflow-tooltip
      />
      <el-table-column label="解析状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag
            :type="Number(row.isParsed) === 1 ? 'success' : 'info'"
            size="small"
            effect="light"
          >
            {{ Number(row.isParsed) === 1 ? '已解析' : '未解析' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="88"
        align="center"
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
              @click.stop="emit('audit', row)"
            >
              审核
            </el-button>
          </span>
        </template>
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

const props = defineProps({
  forms: { type: Array, default: () => [] },
  tableHeight: { type: Number, default: 260 },
})

const emit = defineEmits(['row-click', 'audit'])

const tableRef = ref(null)

const {
  showXScrollProxy: showXScroll,
  canScrollLeft,
  canScrollRight,
  scrollTableBy: scrollBy,
} = useSummaryTableHorizontalScroll(tableRef, toRef(props, 'forms'))
</script>
