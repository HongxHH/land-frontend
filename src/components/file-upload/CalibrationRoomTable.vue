<template>
  <section class="room-table-wrap">
    <div class="table-toolbar">
      <div class="left">
        <span class="toolbar-title">户室信息</span>
        <el-tag size="small" effect="plain" :type="isEditing ? 'warning' : 'info'">
          {{ isEditing ? '编辑模式' : '查看模式' }}
        </el-tag>
        <span class="toolbar-count">{{ roomTableCountText }}</span>
      </div>
      <div class="table-toolbar__search">
        <el-input
          v-model="roomTableKeyword"
          size="small"
          clearable
          placeholder="搜索用途类别、用途、面积类型、备注…"
          class="room-table-search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="right">
        <el-button
          v-if="hasRoomToolbarRefresh"
          size="small"
          type="default"
          plain
          :loading="reportRefreshLoading"
          :disabled="roomToolbarRefreshCooldown || reportRefreshLoading"
          title="按实测报告重新汇总用途与户室相关统计，每 5 秒可操作一次"
          @click="handleRoomToolbarRefreshClick"
        >
          重新计算
        </el-button>
        <el-button size="small" type="primary" plain @click="openCreateRoomDialog">
          新增户室
        </el-button>
        <el-button v-if="isEditing" size="small" type="danger" plain @click="exitEditMode">
          退出编辑
        </el-button>
        <el-button v-if="isEditing" size="small" type="primary" @click="handleSaveData"
          >保存修改</el-button
        >
      </div>
    </div>

    <el-table
      ref="roomTableRef"
      class="room-table room-table--readable"
      :data="filteredRoomInfoData"
      :row-class-name="getRoomRowClassName"
      border
      stripe
      v-loading="roomInfoLoading || roomTableAllRowsLoading"
      element-loading-text="加载户室数据中..."
      row-key="id"
      style="width: 100%"
      :header-cell-style="ROOM_TABLE_HEADER_STYLE"
      :cell-style="ROOM_TABLE_CELL_STYLE"
    >
      <el-table-column
        prop="roomLevel"
        label="楼层"
        min-width="72"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.roomLevel || '-' }}</template>
          <el-input
            v-else
            v-model="row.roomLevel"
            size="small"
            class="room-table-field"
            placeholder="楼层"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="roomNumber"
        label="房号"
        min-width="72"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.roomNumber || '-' }}</template>
          <el-input
            v-else
            v-model="row.roomNumber"
            size="small"
            class="room-table-field"
            placeholder="房号"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="buildingArea"
        label="建筑面积"
        min-width="96"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.buildingArea || '0.00' }}</template>
          <el-input
            v-else
            v-model="row.buildingArea"
            size="small"
            class="room-table-field"
            type="number"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="innerArea"
        label="套内面积"
        min-width="96"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.innerArea || '0.00' }}</template>
          <el-input
            v-else
            v-model="row.innerArea"
            size="small"
            class="room-table-field"
            type="number"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="balconyArea"
        label="阳台面积"
        min-width="96"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.balconyArea || '0.00' }}</template>
          <el-input
            v-else
            v-model="row.balconyArea"
            size="small"
            class="room-table-field"
            type="number"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="sharedArea"
        label="分摊面积"
        min-width="96"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{ row.sharedArea || '0.00' }}</template>
          <el-input
            v-else
            v-model="row.sharedArea"
            size="small"
            class="room-table-field"
            type="number"
          />
        </template>
      </el-table-column>

      <el-table-column
        prop="usageCategory"
        label="类别"
        min-width="80"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">{{
            normalizeUsageCategoryText(row.usageCategory)
          }}</template>
          <span v-else class="room-table-editing-tag">{{
            normalizeUsageCategoryText(row.usageCategory) || '未选'
          }}</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="roomUsage"
        label="用途"
        min-width="132"
        show-overflow-tooltip
        align="center"
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">
            <el-tag
              v-if="isBlankRoomUsage(row.roomUsage)"
              type="danger"
              size="small"
              effect="light"
              class="usage-missing-tag"
            >
              用途缺失
            </el-tag>
            <span v-else class="room-table-cell-ellipsis">{{ row.roomUsage }}</span>
          </template>
          <div v-else class="usage-edit-inline">
            <el-tag
              v-if="isBlankRoomUsage(row.roomUsage)"
              type="danger"
              size="small"
              effect="light"
              class="usage-missing-tag usage-edit-inline__value"
            >
              用途缺失
            </el-tag>
            <span
              v-else
              class="room-table-cell-ellipsis usage-edit-inline__value"
              :title="row.roomUsage"
            >
              {{ row.roomUsage }}
            </span>
            <el-popover
              placement="bottom"
              trigger="manual"
              persistent
              :width="360"
              :visible="usageEditorVisibleRowId === String(row.id)"
              @update:visible="(visible) => handleUsageEditorVisibleChange(visible, row)"
            >
              <div class="usage-editor-pop" @mousedown.stop @click.stop>
                <div class="usage-editor-title">选择用途</div>
                <p v-if="row.roomUsage" class="usage-editor-current">
                  当前用途：<strong>{{ row.roomUsage }}</strong>
                </p>
                <el-form label-position="top" class="usage-editor-form">
                  <el-form-item label="用途">
                    <el-select
                      v-model="usageEditorDraft.roomUsage"
                      filterable
                      clearable
                      :teleported="false"
                      :filter-method="onUsageEditorFilter"
                      placeholder="请选择用途"
                      class="usage-editor-field"
                      popper-class="usage-editor-select-popper"
                    >
                      <el-option
                        v-for="item in usageEditorDisplayOptions"
                        :key="item.id || `${item.usageCategory}-${item.usagePattern}`"
                        :label="`${item.usagePattern}（${item.usageCategoryText} / ${item.floorAreaTypeText}）`"
                        :value="item.usagePattern"
                      />
                    </el-select>
                  </el-form-item>
                </el-form>
                <div class="usage-editor-actions">
                  <el-button
                    text
                    size="small"
                    type="primary"
                    @click="openCreateUsageDialogForRow(row)"
                    >新增用途</el-button
                  >
                  <div>
                    <el-button size="small" @click="closeUsageEditor">取消</el-button>
                    <el-button size="small" type="primary" @click="confirmUsageEditor(row)">
                      确定
                    </el-button>
                  </div>
                </div>
              </div>
              <template #reference>
                <el-button
                  link
                  type="primary"
                  class="room-table-usage-btn usage-edit-inline__action"
                  @click.stop="openUsageEditor(row)"
                >
                  {{ row.roomUsage ? '更换' : '选用途' }}
                </el-button>
              </template>
            </el-popover>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        prop="floorAreaType"
        label="类型"
        min-width="80"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span
            class="room-area-type"
            :class="{
              'room-area-type--buildable': row.floorAreaType === '计容',
              'room-area-type--non-buildable': row.floorAreaType === '不计容',
            }"
          >
            {{ row.floorAreaType }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        prop="remark"
        label="备注"
        min-width="80"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <template v-if="!isRowEditing(row)">
            <span class="room-table-cell-ellipsis">{{ row.remark || '-' }}</span>
          </template>
          <el-input
            v-else
            v-model="row.remark"
            size="small"
            class="room-table-field"
            placeholder="备注"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="108" align="center" fixed="right">
        <template #default="{ row }">
          <div class="row-op-group">
            <el-button
              link
              type="primary"
              :disabled="isEditing && !isRowEditing(row)"
              @click="startRowEdit(row)"
            >
              {{ isRowEditing(row) ? '…' : '编辑' }}
            </el-button>
            <el-button
              link
              type="danger"
              :disabled="roomDeleteLoading"
              @click="handleDeleteRoomRow(row)"
            >
              删除
            </el-button>
          </div>
        </template>
      </el-table-column>

      <template #append>
        <div v-if="showRoomTableLoadMoreHint" class="room-table-load-more">
          <el-icon v-if="roomInfoLoadingMore" class="room-table-load-more__icon is-loading">
            <Loading />
          </el-icon>
          <span>{{ roomTableLoadMoreText }}</span>
        </div>
      </template>
    </el-table>

    <div v-if="roomTableShowSearchPagination" class="room-table-search-pagination">
      <el-pagination
        small
        background
        layout="total, prev, pager, next"
        :total="roomTableSearchMatchTotal"
        :page-size="50"
        :current-page="roomTableSearchDisplayPageNum"
        @current-change="onRoomTableSearchPageChange"
      />
    </div>

    <div v-if="roomInfoData.length" class="room-table-compare">
      <p v-if="compareTableScrollable" class="room-table-compare__hint">
        左右滑动可查看全部面积指标；建筑面积固定在最左侧，其余不一致项优先展示
      </p>
      <div ref="compareTableRef" class="room-table-compare__table">
        <div class="room-table-compare__row room-table-compare__row--head">
          <span class="room-table-compare__label" />
          <span
            v-for="item in summaryMetrics"
            :key="`head-${item.key}`"
            class="room-table-compare__cell room-table-compare__cell--head"
            :class="{ 'room-table-compare__cell--mismatch': item.mismatch }"
          >
            {{ item.title }}
          </span>
        </div>
        <div class="room-table-compare__row">
          <span class="room-table-compare__label">列表汇总</span>
          <span
            v-for="item in summaryMetrics"
            :key="`manual-${item.key}`"
            class="room-table-compare__cell"
            :class="{ 'room-table-compare__cell--mismatch': item.mismatch }"
          >
            {{ item.manual }}
          </span>
        </div>
        <div class="room-table-compare__row">
          <span class="room-table-compare__label">OCR</span>
          <span
            v-for="item in summaryMetrics"
            :key="`ocr-${item.key}`"
            class="room-table-compare__cell room-table-compare__cell--ocr"
            :class="{ 'room-table-compare__cell--mismatch': item.mismatch }"
          >
            {{ item.ocr }}
          </span>
        </div>
      </div>
    </div>

    <el-empty
      v-if="!roomInfoLoading && filteredRoomInfoData.length === 0"
      :description="roomTableIsFiltering ? '未找到匹配的户室' : '暂无户室面积数据'"
    />
  </section>

  <el-dialog
    v-model="createRoomDialogVisible"
    title="新增户室"
    width="560px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form ref="createRoomFormRef" :model="createRoomForm" label-width="110px">
      <el-form-item label="用途类别" required>
        <el-select
          v-model="createRoomForm.usageCategory"
          placeholder="请选择用途类别"
          style="width: 100%"
        >
          <el-option-group label="计容面积">
            <el-option label="商业" value="COMMERCIAL" />
            <el-option label="住宅" value="RESIDENTIAL" />
            <el-option label="物管" value="MANAGEMENT" />
            <el-option label="其他计容" value="OTHER_BUILDABLE" />
          </el-option-group>
          <el-option-group label="不计容面积">
            <el-option label="社区用房" value="COMMUNITY" />
            <el-option label="其他公用" value="OTHER_PUBLIC" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="楼层">
            <el-input v-model="createRoomForm.roomLevel" placeholder="如 1层" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="房号">
            <el-input v-model="createRoomForm.roomNumber" placeholder="如 101" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="建筑面积(㎡)">
            <el-input v-model="createRoomForm.buildingArea" type="number" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="套内面积(㎡)">
            <el-input v-model="createRoomForm.innerArea" type="number" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="阳台面积(㎡)">
            <el-input v-model="createRoomForm.balconyArea" type="number" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="分摊面积(㎡)">
            <el-input v-model="createRoomForm.sharedArea" type="number" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="createRoomForm.remark" type="textarea" :rows="2" placeholder="可选" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createRoomDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="roomCreateLoading" @click="handleSubmitCreateRoom"
        >确认新增</el-button
      >
    </template>
  </el-dialog>

  <el-dialog
    v-model="usagePickerVisible"
    title="选择用途"
    width="760px"
    custom-class="usage-picker-dialog"
    append-to-body
    :close-on-click-modal="false"
  >
    <div class="usage-picker-toolbar">
      <el-input v-model.trim="usagePickerKeyword" placeholder="搜索用途名称/用途类别" clearable />
      <div class="usage-picker-actions">
        <el-button class="biz-btn action-ghost" @click="openCreateUsageDialog">新增用途</el-button>
        <el-button
          class="biz-btn action-ghost"
          :loading="usagePickerLoading"
          @click="loadUsagePickerOptions"
          >刷新</el-button
        >
      </div>
    </div>

    <el-table
      :data="filteredUsagePickerOptions"
      height="360"
      border
      stripe
      row-key="id"
      highlight-current-row
      @row-click="handleUsagePickerRowClick"
    >
      <el-table-column type="index" label="序号" width="68" align="center" />
      <el-table-column prop="usagePattern" label="用途名称" min-width="220" show-overflow-tooltip />
      <el-table-column prop="usageCategoryText" label="用途类别" width="140" align="center" />
      <el-table-column prop="floorAreaTypeText" label="面积类型" width="120" align="center" />
      <el-table-column label="操作" width="100" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="applyUsagePicker(row)"
            >选用</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="usagePickerVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="createUsageDialogVisible"
    title="新增用途"
    width="520px"
    custom-class="create-usage-dialog"
    append-to-body
    :close-on-click-modal="false"
    @closed="resetCreateUsageForm"
  >
    <el-form
      ref="createUsageFormRef"
      :model="createUsageForm"
      :rules="createUsageFormRules"
      label-width="100px"
    >
      <el-form-item label="用途名称" prop="usagePattern">
        <el-input
          v-model.trim="createUsageForm.usagePattern"
          placeholder="请输入用途名称，如：酒店式公寓"
        />
      </el-form-item>
      <el-form-item label="用途类别" prop="usageCategory">
        <el-select
          v-model="createUsageForm.usageCategory"
          placeholder="请选择用途类别"
          style="width: 100%"
        >
          <el-option-group label="计容面积">
            <el-option
              v-for="item in usageCategoryCreateBuildableOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
          <el-option-group label="不计容面积">
            <el-option
              v-for="item in usageCategoryCreateNonBuildableOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-option-group>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createUsageDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="createUsageSubmitting" @click="handleSubmitCreateUsage"
        >确认新增</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch, toRef } from 'vue'
import { useCalibrationRoomTableFilter } from '@/composables/file-upload/useCalibrationRoomTableFilter'
import { useRoomTableInfiniteScroll } from '@/composables/file-upload/useRoomTableInfiniteScroll'
import { useCalibrationRoomUsageEditor } from '@/composables/file-upload/useCalibrationRoomUsageEditor'
import {
  buildSummaryMetrics,
  sortMetricsForCompare,
} from '@/composables/file-upload/auditSummaryMetrics'
import { isBlankRoomUsage } from '@/composables/file-upload/surveyUsagePending'
import { Loading, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const ROOM_TABLE_HEADER_STYLE = {
  background: '#f1f5f9',
  color: '#334155',
  fontWeight: '600',
  fontSize: '14px',
  padding: '10px 8px',
}

const ROOM_TABLE_CELL_STYLE = {
  fontSize: '14px',
  padding: '10px 8px',
}

const props = defineProps({
  open: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false },
  editingRowId: { type: [String, Number], default: '' },
  startRowEdit: { type: Function, required: true },
  exitEditMode: { type: Function, required: true },
  handleSaveData: { type: Function, required: true },
  syncRoomRow: { type: Function, default: null },
  handleRefreshSurveyReport: { type: Function, default: null },
  handleCreateRoom: { type: Function, default: null },
  handleDeleteRoom: { type: Function, default: null },
  roomCreateLoading: { type: Boolean, default: false },
  roomDeleteLoading: { type: Boolean, default: false },
  reportRefreshLoading: { type: Boolean, default: false },
  auditSummaryData: { type: Object, required: true },
  roomInfoData: { type: Array, required: true },
  roomInfoLoading: { type: Boolean, default: false },
  roomInfoTotal: { type: Number, default: 0 },
  searchRoomInfosByPages: { type: Function, default: null },
  loadMoreRoomInfo: { type: Function, default: null },
  roomInfoHasMore: { type: Boolean, default: false },
  roomInfoLoadingMore: { type: Boolean, default: false },
})

const openRef = toRef(props, 'open')
const roomTableRef = ref(null)

const {
  keyword: roomTableKeyword,
  isFiltering: roomTableIsFiltering,
  allRowsLoading: roomTableAllRowsLoading,
  searchScanning: roomTableSearchScanning,
  searchProgress: roomTableSearchProgress,
  searchMatchTotal: roomTableSearchMatchTotal,
  searchDisplayPageNum: roomTableSearchDisplayPageNum,
  showSearchPagination: roomTableShowSearchPagination,
  filteredRoomInfoData,
  searchableTotal: roomTableSearchableTotal,
  clearKeyword: clearRoomTableKeyword,
  setKeyword: setRoomTableKeyword,
  onSearchPageChange: onRoomTableSearchPageChange,
  reloadSearchRows: reloadRoomTableSearchRows,
} = useCalibrationRoomTableFilter({
  getRoomRows: () => props.roomInfoData,
  searchRoomPages: (keyword, opts) => props.searchRoomInfosByPages?.(keyword, opts),
  getTotal: () => (props.roomInfoTotal > 0 ? props.roomInfoTotal : props.roomInfoData.length),
})

const roomTableCountText = computed(() => {
  const total = roomTableSearchableTotal.value
  const loaded = props.roomInfoData?.length ?? 0
  if (roomTableIsFiltering.value) {
    const progress = roomTableSearchProgress.value
    if (roomTableSearchScanning.value && progress && !progress.done) {
      return `搜索中：已扫描 ${progress.scannedPages}/${progress.totalPages} 页，命中 ${progress.matchCount} 条`
    }
    return `匹配 ${roomTableSearchMatchTotal.value} / 共 ${total} 条`
  }
  if (loaded < total) {
    return `已加载 ${loaded} / 共 ${total} 条`
  }
  return `共 ${total} 条`
})

const infiniteScrollEnabled = computed(
  () => !roomTableIsFiltering.value && typeof props.loadMoreRoomInfo === 'function'
)

const roomInfoHasMoreRef = computed(() => Boolean(props.roomInfoHasMore))
const roomInfoLoadingMoreRef = computed(() => Boolean(props.roomInfoLoadingMore))
const roomInfoLoadingRef = computed(() => Boolean(props.roomInfoLoading))

const { tryFillViewport, rebindScroll } = useRoomTableInfiniteScroll({
  tableRef: roomTableRef,
  enabled: infiniteScrollEnabled,
  hasMore: roomInfoHasMoreRef,
  loading: roomInfoLoadingRef,
  loadingMore: roomInfoLoadingMoreRef,
  onLoadMore: () => props.loadMoreRoomInfo?.(),
})

watch(
  () => props.roomInfoLoadingMore,
  async (loadingMore, prevLoadingMore) => {
    if (prevLoadingMore && !loadingMore) {
      await tryFillViewport()
    }
  }
)

watch(
  () => props.roomInfoLoading,
  (loading, prevLoading) => {
    if (prevLoading && !loading && roomTableIsFiltering.value) {
      reloadRoomTableSearchRows()
    }
  }
)

const showRoomTableLoadMoreHint = computed(
  () => infiniteScrollEnabled.value && (props.roomInfoLoadingMore || props.roomInfoHasMore)
)

const roomTableLoadMoreText = computed(() => {
  if (props.roomInfoLoadingMore) return '正在加载更多户室…'
  if (props.roomInfoHasMore) return '向下滚动加载更多'
  return '已加载全部户室'
})

watch(
  () => [props.open, props.roomInfoLoading, props.roomInfoData.length, props.roomInfoHasMore],
  async ([open, loading]) => {
    if (!open || loading) return
    await tryFillViewport()
    rebindScroll()
  }
)

const hasRoomToolbarRefresh = computed(() => typeof props.handleRefreshSurveyReport === 'function')
const reportRefreshLoading = computed(() => Boolean(props.reportRefreshLoading))
const roomToolbarRefreshCooldown = ref(false)
let roomToolbarRefreshCooldownTimer = null

const clearRoomToolbarRefreshCooldownTimer = () => {
  if (roomToolbarRefreshCooldownTimer != null) {
    clearTimeout(roomToolbarRefreshCooldownTimer)
    roomToolbarRefreshCooldownTimer = null
  }
}

const handleRoomToolbarRefreshClick = async () => {
  const fn = props.handleRefreshSurveyReport
  if (typeof fn !== 'function') return
  if (roomToolbarRefreshCooldown.value || reportRefreshLoading.value) {
    ElMessage.warning('请稍后再试（每 5 秒最多刷新一次）')
    return
  }
  roomToolbarRefreshCooldown.value = true
  clearRoomToolbarRefreshCooldownTimer()
  roomToolbarRefreshCooldownTimer = setTimeout(() => {
    roomToolbarRefreshCooldown.value = false
    roomToolbarRefreshCooldownTimer = null
  }, 5000)
  try {
    await fn()
  } catch (e) {
    console.error(e)
  }
}

const usageEditor = useCalibrationRoomUsageEditor({
  syncRoomRow: (row) => props.syncRoomRow?.(row),
  handleCreateRoom: (payload) => props.handleCreateRoom?.(payload),
  handleDeleteRoom: (row) => props.handleDeleteRoom?.(row),
})

const {
  usageCategoryCreateBuildableOptions,
  usageCategoryCreateNonBuildableOptions,
  normalizeUsageCategoryText,
  createRoomDialogVisible,
  createRoomFormRef,
  createRoomForm,
  openCreateRoomDialog,
  handleSubmitCreateRoom,
  handleDeleteRoomRow,
  usagePickerVisible,
  usagePickerLoading,
  usagePickerKeyword,
  filteredUsagePickerOptions,
  loadUsagePickerOptions,
  handleUsagePickerRowClick,
  applyUsagePicker,
  openCreateUsageDialog,
  createUsageDialogVisible,
  createUsageFormRef,
  createUsageForm,
  createUsageFormRules,
  createUsageSubmitting,
  resetCreateUsageForm,
  handleSubmitCreateUsage,
  usageEditorVisibleRowId,
  usageEditorDraft,
  usageEditorDisplayOptions,
  onUsageEditorFilter,
  openUsageEditor,
  handleUsageEditorVisibleChange,
  closeUsageEditor,
  confirmUsageEditor,
  openCreateUsageDialogForRow,
  resetUsageEditorState,
} = usageEditor

watch(openRef, (open) => {
  if (!open) {
    clearRoomTableKeyword()
    clearRoomToolbarRefreshCooldownTimer()
    roomToolbarRefreshCooldown.value = false
    resetUsageEditorState()
  }
})

onBeforeUnmount(() => {
  clearRoomToolbarRefreshCooldownTimer()
})

const getRoomRowClassName = ({ row }) => {
  const classes = []
  if (isBlankRoomUsage(row?.roomUsage)) classes.push('missing-usage-row')
  else if (row?.usageCategory === '未知') classes.push('unknown-usage-row')
  if (Number(row?.isCalculate ?? 0) !== 1) classes.push('non-calculate-row')
  return classes.join(' ')
}

const isRowEditing = (row) => {
  if (!props.isEditing || !props.editingRowId || !row?.id) return false
  return String(row.id) === String(props.editingRowId)
}

const AREA_COMPARE_TOLERANCE = 0.01

const summaryMetrics = computed(() =>
  sortMetricsForCompare(buildSummaryMetrics(props.auditSummaryData, AREA_COMPARE_TOLERANCE))
)

const compareTableRef = ref(null)
const compareTableScrollable = ref(false)

const syncCompareTableLayout = async () => {
  await nextTick()
  const el = compareTableRef.value
  if (!el) {
    compareTableScrollable.value = false
    return
  }
  compareTableScrollable.value = el.scrollWidth > el.clientWidth + 2
  el.scrollLeft = 0
}

watch(
  () => [
    props.open,
    props.roomInfoData.length,
    props.auditSummaryData?.roomInfoBuildingAreaSum,
    props.auditSummaryData?.roomInfoInnerAreaSum,
    props.auditSummaryData?.roomInfoBalconyAreaSum,
    props.auditSummaryData?.roomInfoSharedAreaSum,
    props.auditSummaryData?.verificationErrorReason,
  ],
  () => {
    if (props.open && props.roomInfoData.length) {
      syncCompareTableLayout()
    }
  }
)

defineExpose({ clearRoomTableKeyword, setRoomTableKeyword })
</script>
