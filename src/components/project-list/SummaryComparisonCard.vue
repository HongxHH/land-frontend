<template>
  <el-card class="info-config-card no-print" shadow="never">
    <div class="comparison-shell">
      <div class="comparison-head">
        <div class="comparison-head__title-wrap">
          <div class="comparison-head__title">面积核算对比</div>
        </div>
        <el-checkbox-group v-model="checkedGroupKeys" class="comparison-group-picker">
          <el-checkbox v-for="group in groupMeta" :key="group.key" :label="group.key">
            {{ group.title }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <div class="comparison-grid-wrap">
        <article v-for="group in displayGroups" :key="group.key" class="comparison-card">
          <header class="comparison-card__header">
            <h4 class="comparison-card__title">{{ group.title }}</h4>
            <el-tag size="small" effect="plain" :type="group.available ? 'success' : 'info'">
              {{ group.available ? '数据可用' : '暂无数据' }}
            </el-tag>
          </header>
          <el-table
            class="comparison-table project-tab-el-table"
            :data="group.rows"
            border
            stripe
            :show-header="true"
          >
            <el-table-column prop="label" label="维度" min-width="130" />
            <el-table-column
              prop="contractAgreedArea"
              label="合同约定面积"
              min-width="140"
              align="right"
            />
            <el-table-column prop="buildableArea" label="计容面积" min-width="120" align="right" />
            <el-table-column prop="difference" label="差值" min-width="120" align="right" />
          </el-table>
        </article>
      </div>

      <!-- 仅界面展示：不参与打印/导出（整块汇总区已在 #app，打印走 #print-target） -->
      <section class="comparison-cross no-print" aria-label="计容面积两侧差值">
        <header class="comparison-cross__header">
          <div class="comparison-cross__titles">
            <h4 class="comparison-cross__title">计容面积差值（实测 − 项目方）</h4>
          </div>
          <el-tag
            size="small"
            effect="plain"
            :type="crossBuildableDiff.available ? 'success' : 'info'"
          >
            {{ crossBuildableDiff.available ? '可计算' : '暂无两侧计容' }}
          </el-tag>
        </header>
        <el-table
          class="comparison-table comparison-cross__table project-tab-el-table"
          :data="crossBuildableDiff.rows"
          border
          stripe
        >
          <el-table-column prop="label" label="维度" min-width="120" />
          <el-table-column prop="diff" label="差值（㎡）" min-width="140" align="right">
            <template #default="{ row }">
              <span :class="{ 'comparison-cross__diff--muted': row.diff === '-' }">{{
                row.diff
              }}</span>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { SUMMARY_COMPARISON_GROUP_META } from '@/composables/project-list/summaryComparisonGroupMeta.js'

const props = defineProps({
  areaComparison: {
    type: Object,
    default: () => ({
      systemCalculated: {},
      projectPartyDeclared: {},
      planningCalculated: {},
      capacityIndicatorCalculated: {},
      dataCompleteness: {},
    }),
  },
  selectedGroups: {
    type: Array,
    default: () => SUMMARY_COMPARISON_GROUP_META.map((item) => item.key),
  },
})

const emit = defineEmits(['update:selectedGroups'])

const groupMeta = SUMMARY_COMPARISON_GROUP_META

const formatArea = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

const TRIPLE_KEYS = [
  { lineKey: 'totalBuilding', label: '建筑面积' },
  { lineKey: 'commercial', label: '商业面积' },
  { lineKey: 'residential', label: '住宅面积' },
]

const parseAreaNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** 实测报告计容 − 项目方计容，按维度对齐；任一侧缺失则该行差值为「-」 */
const crossBuildableDiff = computed(() => {
  const sys = props.areaComparison?.systemCalculated
  const party = props.areaComparison?.projectPartyDeclared
  const rows = TRIPLE_KEYS.map(({ lineKey, label }) => {
    const a = parseAreaNumber(sys?.[lineKey]?.buildableArea)
    const b = parseAreaNumber(party?.[lineKey]?.buildableArea)
    if (a === null || b === null) {
      return { label, diff: '-' }
    }
    return { label, diff: formatArea(a - b) }
  })
  const available = rows.some((r) => r.diff !== '-')
  return { rows, available }
})

const checkedGroupKeys = computed({
  get: () => props.selectedGroups,
  set: (value) => emit('update:selectedGroups', value),
})

const buildRows = (tripleLine) => [
  {
    label: '建筑面积',
    contractAgreedArea: formatArea(tripleLine?.totalBuilding?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.totalBuilding?.buildableArea),
    difference: formatArea(tripleLine?.totalBuilding?.difference),
  },
  {
    label: '商业面积',
    contractAgreedArea: formatArea(tripleLine?.commercial?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.commercial?.buildableArea),
    difference: formatArea(tripleLine?.commercial?.difference),
  },
  {
    label: '住宅面积',
    contractAgreedArea: formatArea(tripleLine?.residential?.contractAgreedArea),
    buildableArea: formatArea(tripleLine?.residential?.buildableArea),
    difference: formatArea(tripleLine?.residential?.difference),
  },
]

const displayGroups = computed(() =>
  groupMeta
    .filter((meta) => checkedGroupKeys.value.includes(meta.key))
    .map((meta) => ({
      key: meta.key,
      title: meta.title,
      available: Boolean(props.areaComparison?.dataCompleteness?.[meta.availableField]),
      rows: buildRows(props.areaComparison?.[meta.key]),
    }))
)
</script>

<style scoped>
.comparison-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comparison-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px 20px;
  flex-wrap: wrap;
}

.comparison-head__title {
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
}

.comparison-group-picker {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.comparison-grid-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 12px;
}

.comparison-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 6px 20px -16px rgba(15, 23, 42, 0.45);
}

.comparison-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.85);
}

.comparison-card__title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.comparison-cross {
  margin-top: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px dashed #c7d2fe;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 55%, #ffffff 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.comparison-cross__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.comparison-cross__titles {
  min-width: 0;
}

.comparison-cross__title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 700;
  color: #312e81;
}

.comparison-cross__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}

.comparison-cross__table {
  background: rgba(255, 255, 255, 0.92);
}

.comparison-cross__diff--muted {
  color: #94a3b8;
}

::deep(.comparison-table .el-table__header th) {
  background-color: #f8fafc !important;
  color: #334155;
  font-weight: 700;
}
</style>
