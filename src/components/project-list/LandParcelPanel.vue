<template>
  <section
    ref="parcelsPanelRef"
    class="parcels-panel parcels-panel--modern project-tab-panel"
    :class="{ collapsed: parcelCollapsed }"
  >
    <header v-if="parcelCollapsed" class="parcels-hero parcels-hero--collapsed">
      <div class="parcels-hero__brand">
        <div class="parcels-hero__icon-wrap parcels-hero__icon-wrap--teal" aria-hidden="true">
          <el-icon class="parcels-hero__icon"><Grid /></el-icon>
        </div>
        <div class="parcels-hero__titles">
          <span class="parcels-hero__eyebrow">合同及地块</span>
          <h2 class="parcels-hero__title">地块信息</h2>
        </div>
      </div>
      <p class="parcels-collapsed-hint">
        <template v-if="selectedContract.id">
          已收起 · 当前合同 {{ selectedContract.contractNumber || '-' }} · 地块 {{ currentLandParcelList.length }} 条
        </template>
        <template v-else>已收起 · 请先在上方合同列表中选择合同</template>
      </p>
      <el-button class="ch-btn ch-btn--ghost" size="small" @click="toggleParcelPanel">展开地块</el-button>
    </header>

    <template v-else>
      <header class="parcels-hero">
        <div class="parcels-hero__brand">
          <div class="parcels-hero__icon-wrap parcels-hero__icon-wrap--teal" aria-hidden="true">
            <el-icon class="parcels-hero__icon"><Grid /></el-icon>
          </div>
          <div class="parcels-hero__titles">
            <span class="parcels-hero__eyebrow">合同及地块</span>
            <h2 class="parcels-hero__title">地块信息</h2>
          </div>
        </div>

        <div class="contract-stat-grid" role="group" aria-label="地块统计">
          <div class="contract-stat-tile contract-stat-tile--slate">
            <div class="contract-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="contract-stat-tile__text">
              <div class="contract-stat-tile__line">
                <span class="contract-stat-tile__value">{{ currentLandParcelList.length }}</span>
                <span class="contract-stat-tile__unit">条</span>
              </div>
              <span class="contract-stat-tile__label">地块总数</span>
            </div>
          </div>
          <div
            class="contract-stat-tile"
            :class="selectedContract.id ? 'contract-stat-tile--teal' : 'contract-stat-tile--amber'"
          >
            <div class="contract-stat-tile__icon">
              <el-icon><CircleCheck v-if="selectedContract.id" /><Warning v-else /></el-icon>
            </div>
            <div class="contract-stat-tile__text contract-stat-tile__text--wide">
              <div class="contract-stat-tile__line contract-stat-tile__line--single">
                <span class="contract-stat-tile__pick">{{ selectionSummaryText }}</span>
              </div>
              <span class="contract-stat-tile__label">当前合同</span>
            </div>
          </div>
        </div>

        <div class="parcels-hero__actions" aria-label="地块操作">
          <el-button class="ch-btn ch-btn--ghost" size="small" @click="toggleParcelPanel">收起地块</el-button>
          <el-button
            class="ch-btn ch-btn--primary"
            type="primary"
            size="small"
            :disabled="!selectedContract.id"
            @click="emit('add-land-parcel')"
          >
            {{ selectedContract.id ? '新增地块' : '请先选择合同' }}
          </el-button>
        </div>
      </header>

      <div ref="parcelsTableWrapRef" class="contracts-table-wrap">
        <el-empty v-if="!selectedContract.id" description="请先在上方选择一条合同，再查看对应地块" />
        <template v-else>
          <el-table
            ref="parcelsTableRef"
            class="project-tab-el-table contract-list-modern-table land-parcel-table"
            :data="currentLandParcelList"
            border
            stripe
            :max-height="parcelsTableHeight"
            scrollbar-always-on
            row-key="id"
          >
            <el-table-column
              :resizable="false"
              label="序号"
              type="index"
              width="52"
              align="center"
              header-align="center"
              fixed="left"
              :index="(index) => index + 1"
            />
            <el-table-column
              :resizable="false"
              prop="parcelCode"
              label="地块编号"
              min-width="112"
              align="center"
              fixed="left"
              header-align="center"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              prop="parcelName"
              label="地块名称"
              min-width="140"
              align="center"
              header-align="center"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              label="规划用途"
              min-width="96"
              align="center"
              header-align="center"
              show-overflow-tooltip
            >
              <template #default="{ row }">
                {{ plannedUseLabelMap[row.plannedUse] || row.plannedUse || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              :resizable="false"
              prop="totalArea"
              label="总面积(㎡)"
              min-width="124"
              align="center"
              header-align="center"
              class-name="col-area"
              label-class-name="col-area"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              prop="residentialArea"
              label="住宅面积(㎡)"
              min-width="124"
              align="center"
              header-align="center"
              class-name="col-area"
              label-class-name="col-area"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              prop="commercialArea"
              label="商业面积(㎡)"
              min-width="124"
              align="center"
              header-align="center"
              class-name="col-area"
              label-class-name="col-area"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              prop="commercialResidentialRatio"
              label="商住比"
              min-width="92"
              align="center"
              header-align="center"
              class-name="col-metric"
              label-class-name="col-metric"
              show-overflow-tooltip
            />
            <el-table-column
              :resizable="false"
              label="操作"
              width="152"
              align="center"
              header-align="center"
              fixed="right"
              class-name="col-actions"
              label-class-name="col-actions"
            >
              <template #default="{ row }">
                <span class="tab-table-row-actions">
                  <el-button class="op-btn audit-btn" type="primary" size="small" plain @click="emit('edit-land-parcel', row)">
                    编辑
                  </el-button>
                  <el-button class="op-btn delete-btn" type="danger" size="small" plain @click="emit('delete-land-parcel', row)">
                    删除
                  </el-button>
                </span>
              </template>
            </el-table-column>
          </el-table>

          <div v-show="parcelsShowXScroll" class="contract-table-x-float" role="presentation" aria-hidden="true">
            <div
              class="contract-table-x-float__edge contract-table-x-float__edge--left"
              :class="{ 'is-active': parcelsCanScrollLeft }"
            />
            <div
              class="contract-table-x-float__edge contract-table-x-float__edge--right"
              :class="{ 'is-active': parcelsCanScrollRight }"
            />
            <el-tooltip content="向左" placement="left">
              <el-button
                v-show="parcelsCanScrollLeft"
                class="contract-table-x-float__fab contract-table-x-float__fab--left"
                circle
                type="primary"
                aria-label="向左查看更多列"
                @click="parcelsScrollBy(-300)"
              >
                <el-icon><DArrowLeft /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="向右" placement="right">
              <el-button
                v-show="parcelsCanScrollRight"
                class="contract-table-x-float__fab contract-table-x-float__fab--right"
                circle
                type="primary"
                aria-label="向右查看更多列"
                @click="parcelsScrollBy(300)"
              >
                <el-icon><DArrowRight /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </template>
      </div>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, toRef } from 'vue'
import { clampTableBodyHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import {
  Files,
  CircleCheck,
  Warning,
  Grid,
  DArrowLeft,
  DArrowRight
} from '@element-plus/icons-vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'

const props = defineProps({
  selectedContract: { type: Object, default: () => ({ id: '', contractNumber: '' }) },
  currentLandParcelList: { type: Array, default: () => [] }
})

const emit = defineEmits(['add-land-parcel', 'edit-land-parcel', 'delete-land-parcel'])

const selectionSummaryText = computed(() => {
  if (props.selectedContract?.id) {
    const n = props.selectedContract.contractNumber || `ID ${props.selectedContract.id}`
    return n.length > 18 ? `${n.slice(0, 18)}…` : n
  }
  return '未选择'
})

const parcelsPanelRef = ref(null)
const parcelsTableRef = ref(null)
const parcelsTableWrapRef = ref(null)
const parcelsTableCap = ref(260)

let panelResizeObserver = null

const parcelCollapsed = ref(false)
const toggleParcelPanel = () => {
  parcelCollapsed.value = !parcelCollapsed.value
}

function measureParcelsTableCap() {
  if (parcelCollapsed.value) return
  const panel = parcelsPanelRef.value
  if (!panel) return
  const hero = panel.querySelector('.parcels-hero')
  const ph = panel.getBoundingClientRect().height
  const hh = hero ? hero.getBoundingClientRect().height : 0
  parcelsTableCap.value = Math.max(100, Math.floor(ph - hh - 1))
}

const parcelsTableHeight = computed(() => {
  if (!props.selectedContract?.id) return 120
  return clampTableBodyHeight(parcelsTableCap.value, props.currentLandParcelList.length)
})

onMounted(() => {
  nextTick(() => {
    measureParcelsTableCap()
    if (typeof ResizeObserver === 'undefined') return
    panelResizeObserver = new ResizeObserver(() => measureParcelsTableCap())
    if (parcelsPanelRef.value) panelResizeObserver.observe(parcelsPanelRef.value)
  })
})

onBeforeUnmount(() => {
  panelResizeObserver?.disconnect()
  panelResizeObserver = null
})

watch(parcelCollapsed, () => {
  nextTick(() => measureParcelsTableCap())
})

watch(
  () => [props.currentLandParcelList.length, props.selectedContract?.id],
  () => nextTick(measureParcelsTableCap)
)

const {
  showXScrollProxy: parcelsShowXScroll,
  canScrollLeft: parcelsCanScrollLeft,
  canScrollRight: parcelsCanScrollRight,
  scrollTableBy: parcelsScrollBy
} = useSummaryTableHorizontalScroll(parcelsTableRef, toRef(props, 'currentLandParcelList'))

const plannedUseLabelMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  COMMERCIAL_AND_RESIDENTIAL: '商住混合'
}
</script>
