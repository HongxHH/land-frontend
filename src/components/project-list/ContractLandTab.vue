<template>
  <div class="contract-workbench workspace-tab-fill workspace-ui-scale">
    <div ref="workbenchBodyRef" class="workbench-body workspace-tab-body">
      <section class="contracts-panel contracts-panel--modern project-tab-panel">
        <header class="contracts-hero">
          <div class="contracts-hero__brand">
            <div class="contracts-hero__icon-wrap" aria-hidden="true">
              <el-icon class="contracts-hero__icon"><Document /></el-icon>
            </div>
            <div class="contracts-hero__titles">
              <span class="contracts-hero__eyebrow">合同及地块</span>
              <h2 class="contracts-hero__title">合同列表</h2>
            </div>
          </div>

          <div class="contract-stat-grid" role="group" aria-label="合同列表统计">
            <div class="contract-stat-tile contract-stat-tile--slate">
              <div class="contract-stat-tile__icon"><el-icon><Files /></el-icon></div>
              <div class="contract-stat-tile__text">
                <div class="contract-stat-tile__line">
                  <span class="contract-stat-tile__value">{{ contractLandList.length }}</span>
                  <span class="contract-stat-tile__unit">条</span>
                </div>
                <span class="contract-stat-tile__label">合同总数</span>
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
                <span class="contract-stat-tile__label">当前选中</span>
              </div>
            </div>
          </div>

          <div class="contracts-hero__actions" aria-label="合同列表操作">
            <el-button
              class="ch-btn ch-btn--ghost"
              size="small"
              :loading="contractRefreshLoading"
              @click="emit('refresh-contracts')"
            >
              <el-icon><Refresh /></el-icon>
              刷新数据
            </el-button>
          </div>
        </header>

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
                  <el-button class="op-btn audit-btn" type="primary" size="small" plain @click.stop="emit('edit-contract', row)">
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
                class="project-tab-el-table contract-list-modern-table"
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
                  width="48"
                  align="center"
                  header-align="center"
                  fixed="left"
                  :index="(index) => index + 1"
                />
                <el-table-column
                  :resizable="false"
                  prop="parcelCode"
                  label="地块编号"
                  width="108"
                  align="center"
                  fixed="left"
                  header-align="center"
                  show-overflow-tooltip
                />
                <el-table-column
                  :resizable="false"
                  prop="parcelName"
                  label="地块名称"
                  width="120"
                  align="center"
                  header-align="center"
                  show-overflow-tooltip
                />
                <el-table-column :resizable="false" label="规划用途" width="92" align="center" header-align="center">
                  <template #default="{ row }">
                    {{ plannedUseLabelMap[row.plannedUse] || row.plannedUse || '-' }}
                  </template>
                </el-table-column>
                <el-table-column
                  :resizable="false"
                  prop="totalArea"
                  label="总面积(㎡)"
                  min-width="132"
                  align="center"
                  header-align="center"
                  class-name="col-area"
                  label-class-name="col-area"
                />
                <el-table-column
                  :resizable="false"
                  prop="residentialArea"
                  label="住宅面积(㎡)"
                  min-width="132"
                  align="center"
                  header-align="center"
                  class-name="col-area"
                  label-class-name="col-area"
                />
                <el-table-column
                  :resizable="false"
                  prop="commercialArea"
                  label="商业面积(㎡)"
                  min-width="132"
                  align="center"
                  header-align="center"
                  class-name="col-area"
                  label-class-name="col-area"
                />
                <el-table-column
                  :resizable="false"
                  prop="commercialResidentialRatio"
                  label="商住比"
                  width="86"
                  align="center"
                  header-align="center"
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

              <div
                v-show="parcelsShowXScroll"
                class="contract-table-x-float"
                role="presentation"
                aria-hidden="true"
              >
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, toRef, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { clampTableBodyHeight, clampMainListTableHeight } from '@/composables/project-list/useElTableHeightClamp.js'
import {
  Document,
  Files,
  CircleCheck,
  Warning,
  Refresh,
  DArrowLeft,
  DArrowRight,
  Grid
} from '@element-plus/icons-vue'
import { useSummaryTableHorizontalScroll } from '@/composables/project-list/useSummaryTableHorizontalScroll'
import { useClientTablePagination } from '@/composables/shared/useClientTablePagination.js'

const props = defineProps({
  contractLandList: {
    type: Array,
    default: () => []
  },
  selectedContract: {
    type: Object,
    default: () => ({ id: '', contractNumber: '' })
  },
  currentLandParcelList: {
    type: Array,
    default: () => []
  },
  contractRefreshLoading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'refresh-contracts',
  'add-contract',
  'contract-row-click',
  'edit-contract',
  'delete-contract',
  'add-land-parcel',
  'edit-land-parcel',
  'delete-land-parcel'
])

const selectionSummaryText = computed(() => {
  if (props.selectedContract?.id) {
    const n = props.selectedContract.contractNumber || `ID ${props.selectedContract.id}`
    return n.length > 18 ? `${n.slice(0, 18)}…` : n
  }
  return '未选择'
})

const workbenchBodyRef = ref(null)
const parcelsPanelRef = ref(null)

const contractsTableRef = ref(null)

const parcelsTableRef = ref(null)
const parcelsTableWrapRef = ref(null)
const parcelsTableCap = ref(260)

let workbenchResizeObserver = null

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
  const cap = Math.max(100, Math.floor(ph - hh - 1))
  parcelsTableCap.value = cap
}

function measureAllWorkbenchCaps() {
  measureParcelsTableCap()
}

const contractsTableHeight = computed(() => clampMainListTableHeight(props.contractLandList.length))

const parcelsTableHeight = computed(() => {
  if (!props.selectedContract?.id) return 120
  return clampTableBodyHeight(parcelsTableCap.value, props.currentLandParcelList.length)
})

onMounted(() => {
  nextTick(() => {
    measureAllWorkbenchCaps()
    if (typeof ResizeObserver === 'undefined') return
    workbenchResizeObserver = new ResizeObserver(() => measureAllWorkbenchCaps())
    if (workbenchBodyRef.value) workbenchResizeObserver.observe(workbenchBodyRef.value)
  })
})

onBeforeUnmount(() => {
  workbenchResizeObserver?.disconnect()
  workbenchResizeObserver = null
})

watch(parcelCollapsed, () => {
  nextTick(() => measureAllWorkbenchCaps())
})

watch(
  () => [props.contractLandList.length, props.currentLandParcelList.length, props.selectedContract?.id],
  () => nextTick(measureAllWorkbenchCaps)
)

const {
  pagedRows: pagedContractRows,
  pageNum: contractTablePageNum,
  pageSize: contractTablePageSize,
  total: contractTableTotal,
  showPagination: showContractPagination,
  onPageChange: onContractTablePageChange
} = useClientTablePagination(() => props.contractLandList)

const contractRowIndex = (index) =>
  (contractTablePageNum.value - 1) * contractTablePageSize + index + 1

const {
  showXScrollProxy: contractsShowXScroll,
  canScrollLeft: contractsCanScrollLeft,
  canScrollRight: contractsCanScrollRight,
  scrollTableBy: contractsScrollBy
} = useSummaryTableHorizontalScroll(contractsTableRef, pagedContractRows)

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

const formatDateTime = (value) => {
  if (!value) return '-'
  const str = String(value)
  return str.replace('T', ' ').slice(0, 19)
}
</script>

<style scoped>
.contract-workbench {
  gap: 0;
}

.workbench-body {
  gap: 12px;
}

.contracts-panel {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.contracts-panel--modern.project-tab-panel,
.parcels-panel--modern.project-tab-panel {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 40px -22px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.contracts-hero,
.parcels-hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.92) 45%, rgba(241, 245, 249, 0.88) 100%);
  min-height: 64px;
  box-sizing: border-box;
  flex-shrink: 0;
}

.contracts-hero::after,
.parcels-hero::after {
  content: '';
  position: absolute;
  right: -16%;
  top: -50%;
  width: 40%;
  height: 180%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.08), transparent 72%);
  pointer-events: none;
}

.parcels-hero--collapsed {
  flex-wrap: nowrap;
  align-items: center;
}

.parcels-collapsed-hint {
  position: relative;
  z-index: 1;
  flex: 1 1 200px;
  margin: 0;
  min-width: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #64748b;
}

.contracts-hero__brand,
.parcels-hero__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 200px;
  min-width: 0;
  z-index: 1;
}

.parcels-hero__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 18px -10px rgba(15, 118, 110, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.parcels-hero__icon-wrap--teal {
  background: linear-gradient(145deg, #14b8a6 0%, #0f766e 100%);
}

.parcels-hero__icon {
  font-size: 21px;
  color: #fff;
}

.parcels-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.parcels-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.contracts-hero__icon-wrap {
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

.contracts-hero__icon {
  font-size: 21px;
  color: #fff;
}

.contracts-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.contracts-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.contract-stat-grid {
  position: relative;
  z-index: 1;
  flex: 1 1 260px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.contract-stat-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.contract-stat-tile--slate .contract-stat-tile__icon {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.contract-stat-tile--teal .contract-stat-tile__icon {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.contract-stat-tile--amber .contract-stat-tile__icon {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.contract-stat-tile__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.contract-stat-tile__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.contract-stat-tile__text--wide {
  flex: 1;
}

.contract-stat-tile__line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1.1;
}

.contract-stat-tile__line--single {
  width: 100%;
}

.contract-stat-tile__value {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.contract-stat-tile__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.contract-stat-tile__pick {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.contract-stat-tile__label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.contracts-hero__actions,
.parcels-hero__actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.ch-btn {
  width: auto;
  min-width: 104px;
  justify-content: center;
  border-radius: 9px;
  font-weight: 600;
}

:deep(.ch-btn--ghost) {
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
}

:deep(.ch-btn--ghost:hover) {
  border-color: #94a3b8;
  background: #fff;
  color: #0f172a;
}

:deep(.ch-btn--primary.el-button--primary) {
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 20px -10px rgba(29, 78, 216, 0.65);
}

:deep(.ch-btn--primary.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

:deep(.ch-btn--primary.el-button--primary.is-disabled) {
  opacity: 0.55;
  box-shadow: none;
}

.contracts-table-wrap {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0;
  background: #fff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

/* 合同列表：仅包裹表格高度，不向下撑开空白；剩余高度留给地块面板 */
.contracts-table-wrap--contract-list {
  flex: 0 0 auto;
}

.contract-table-client-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 4px 0;
}

.contract-table-x-float {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}

.contract-table-x-float__edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 36px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.contract-table-x-float__edge--left {
  left: 0;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.06), transparent);
}

.contract-table-x-float__edge--right {
  right: 0;
  background: linear-gradient(270deg, rgba(15, 23, 42, 0.06), transparent);
}

.contract-table-x-float__edge.is-active {
  opacity: 1;
}

.contract-table-x-float__fab {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: auto;
  box-shadow: 0 8px 24px -8px rgba(29, 78, 216, 0.55);
  border: none;
}

.contract-table-x-float__fab--left {
  left: 6px;
}

.contract-table-x-float__fab--right {
  right: 6px;
}

.parcels-panel {
  flex: 1 1 auto;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.parcels-panel.collapsed {
  min-height: auto;
  height: fit-content;
  flex: 0 0 auto;
}

:deep(.contract-list-modern-table.el-table) {
  width: 100%;
}

:deep(.contract-list-modern-table .el-table__inner-wrapper::before) {
  display: none;
}

:deep(.contract-list-modern-table th.el-table__cell) {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%) !important;
  font-weight: 700;
  color: #334155;
  text-align: center;
  vertical-align: middle;
}

:deep(.contract-list-modern-table td.el-table__cell > .cell) {
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.contract-list-modern-table td.el-table__cell.is-center > .cell) {
  text-align: center;
}

:deep(.contract-list-modern-table td.el-table__cell.col-area > .cell),
:deep(.contract-list-modern-table th.el-table__cell.col-area > .cell) {
  text-align: center !important;
  font-variant-numeric: tabular-nums;
}

:deep(.contract-list-modern-table td.el-table__cell.col-area.el-table__cell),
:deep(.contract-list-modern-table th.el-table__cell.col-area.el-table__cell) {
  text-align: center;
}

:deep(.contract-list-modern-table td.el-table__cell.is-right > .cell) {
  text-align: right;
}

:deep(.contract-list-modern-table td.el-table__cell.col-actions > .cell) {
  overflow: visible;
  text-overflow: clip;
}

:deep(.contract-list-modern-table th.el-table__cell > .cell) {
  text-align: center;
  line-height: 1.35;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .contract-stat-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .contracts-hero__actions,
  .parcels-hero__actions {
    width: 100%;
    justify-content: flex-start;
  }

  .workbench-body {
    height: auto;
    min-height: 0;
  }

  .contracts-panel {
    max-height: none;
  }

  .parcels-panel:not(.collapsed) {
    min-height: 280px;
  }

  .parcels-panel.collapsed {
    height: auto;
  }
}
</style>
