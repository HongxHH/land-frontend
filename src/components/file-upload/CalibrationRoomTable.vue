<template>
  <section class="room-table-wrap">
    <div class="table-toolbar">
      <div class="left">
        <span class="toolbar-title">户室信息</span>
        <el-tag v-if="dirtyRowCount > 0" size="small" effect="plain" type="warning">
          未保存 {{ dirtyRowCount }} 条
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
        <el-button
          v-if="dirtyRowCount > 0"
          size="small"
          type="danger"
          plain
          @click="handleDiscardRoomEdits"
        >
          放弃修改
        </el-button>
        <el-button
          v-if="dirtyRowCount > 0"
          size="small"
          type="primary"
          :loading="batchUpdateLoading"
          @click="handleSaveRoomEdits"
        >
          保存修改
        </el-button>
      </div>
    </div>

    <div v-if="selectedRoomCount > 0" class="room-usage-batch-bar">
      <span class="room-usage-batch-bar__summary">
        已选 {{ selectedRoomCount }} 户（用途缺失 {{ selectedMissingCount }}，建筑面积为空
        {{ selectedEmptyAreaCount }}）
      </span>
      <el-button
        v-if="roomTableIsFiltering"
        size="small"
        plain
        @click="selectAllFilteredRows"
      >
        全选当前筛选的 {{ allFilteredRows.length }} 户
      </el-button>
      <el-button size="small" type="primary" plain @click="handleOpenBatchUsageDialog">
        批量更换用途
      </el-button>
      <el-button size="small" plain @click="clearRoomSelection">清除选择</el-button>
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
        class-name="room-check-col"
        label-class-name="room-check-col"
        width="46"
        align="center"
      >
        <template #header>
          <el-checkbox
            :model-value="pageAllSelected"
            :indeterminate="pageSomeSelected"
            :disabled="!filteredRoomInfoData.length || batchUpdateLoading"
            @click.stop
            @change="togglePageSelection"
          />
        </template>
        <template #default="{ row }">
          <el-checkbox
            :model-value="isRoomSelected(row)"
            :disabled="batchUpdateLoading"
            @click.stop
            @change="(checked) => toggleRowSelection(row, checked)"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="roomLevel"
        label="楼层"
        min-width="72"
        align="center"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="roomLevel"
            :display="resolveEditRow(row).roomLevel || '-'"
            :display-title="resolveEditRow(row).roomLevel || '-'"
            :active="isCellActive(row, 'roomLevel')"
            placeholder="楼层"
            @activate="startCellEdit(row, 'roomLevel')"
            @commit="commitActiveCell"
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="roomNumber"
            :display="resolveEditRow(row).roomNumber || '-'"
            :display-title="resolveEditRow(row).roomNumber || '-'"
            :active="isCellActive(row, 'roomNumber')"
            placeholder="房号"
            @activate="startCellEdit(row, 'roomNumber')"
            @commit="commitActiveCell"
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="buildingArea"
            :display="formatRoomAreaDisplay(resolveEditRow(row).buildingArea)"
            :display-title="formatRoomAreaDisplay(resolveEditRow(row).buildingArea)"
            :active="isCellActive(row, 'buildingArea')"
            input-type="number"
            non-negative
            :max-decimals="ROOM_AREA_MAX_DECIMALS"
            @activate="startCellEdit(row, 'buildingArea')"
            @commit="commitActiveCell"
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="innerArea"
            :display="formatRoomAreaDisplay(resolveEditRow(row).innerArea)"
            :display-title="formatRoomAreaDisplay(resolveEditRow(row).innerArea)"
            :active="isCellActive(row, 'innerArea')"
            input-type="number"
            non-negative
            :max-decimals="ROOM_AREA_MAX_DECIMALS"
            @activate="startCellEdit(row, 'innerArea')"
            @commit="commitActiveCell"
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="balconyArea"
            :display="formatRoomAreaDisplay(resolveEditRow(row).balconyArea)"
            :display-title="formatRoomAreaDisplay(resolveEditRow(row).balconyArea)"
            :active="isCellActive(row, 'balconyArea')"
            input-type="number"
            non-negative
            :max-decimals="ROOM_AREA_MAX_DECIMALS"
            @activate="startCellEdit(row, 'balconyArea')"
            @commit="commitActiveCell"
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="sharedArea"
            :display="formatRoomAreaDisplay(resolveEditRow(row).sharedArea)"
            :display-title="formatRoomAreaDisplay(resolveEditRow(row).sharedArea)"
            :active="isCellActive(row, 'sharedArea')"
            input-type="number"
            non-negative
            :max-decimals="ROOM_AREA_MAX_DECIMALS"
            @activate="startCellEdit(row, 'sharedArea')"
            @commit="commitActiveCell"
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
          {{ normalizeUsageCategoryText(row.usageCategory) }}
        </template>
      </el-table-column>

      <el-table-column prop="roomUsage" label="用途" min-width="148" align="center">
        <template #default="{ row }">
          <div class="usage-edit-inline">
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
                      v-model="usageEditorDraft.usageConfigId"
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
                        :value="String(item.id)"
                      />
                    </el-select>
                  </el-form-item>
                </el-form>
                <p v-if="usageEditorMatchPreview" class="usage-editor-warning">
                  保存后会归到「{{ usageEditorMatchPreview.usagePattern }}」（{{
                    usageEditorMatchPreview.usageCategoryText
                  }}
                  / {{ usageEditorMatchPreview.floorAreaTypeText }}），更高优先级的模式会先命中。
                </p>
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
                  {{ row.roomUsage && !isBlankRoomUsage(row.roomUsage) ? '更换' : '选用途' }}
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
          <RoomTableEditableCell
            :row="resolveEditRow(row)"
            field="remark"
            :display="resolveEditRow(row).remark || '-'"
            :display-title="resolveEditRow(row).remark || '-'"
            :active="isCellActive(row, 'remark')"
            placeholder="备注"
            @activate="startCellEdit(row, 'remark')"
            @commit="commitActiveCell"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="72" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            link
            type="danger"
            :disabled="roomDeleteLoading"
            @click="handleDeleteRoomRow(row)"
          >
            删除
          </el-button>
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
            :class="{
              'room-table-compare__cell--mismatch': item.mismatch,
              'room-table-compare__cell--ocr-editing': isOcrCellActive(item.key),
              'room-table-compare__cell--ocr-editable': canEditOcr,
            }"
          >
            <RoomTableEditableCell
              :row="ocrEditRow"
              :field="OCR_SUM_FIELD_BY_METRIC_KEY[item.key]"
              :display="formatRoomAreaDisplay(ocrEditRow[OCR_SUM_FIELD_BY_METRIC_KEY[item.key]])"
              :display-title="canEditOcr ? `点击修改 OCR ${item.title}` : item.ocr"
              :active="isOcrCellActive(item.key)"
              input-type="number"
              non-negative
              :max-decimals="ROOM_AREA_MAX_DECIMALS"
              :placeholder="item.title"
              @activate="startOcrCellEdit(item.key)"
              @commit="commitOcrCellEdit"
            />
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
          <el-form-item label="楼层" required>
            <el-input v-model="createRoomForm.roomLevel" placeholder="如 1层" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="房号" required>
            <el-input v-model="createRoomForm.roomNumber" placeholder="如 101" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="建筑面积(㎡)">
            <el-input
              :model-value="createRoomForm.buildingArea"
              type="number"
              min="0"
              step="any"
              @update:model-value="(v) => onCreateRoomAreaInput('buildingArea', v)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="套内面积(㎡)">
            <el-input
              :model-value="createRoomForm.innerArea"
              type="number"
              min="0"
              step="any"
              @update:model-value="(v) => onCreateRoomAreaInput('innerArea', v)"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="阳台面积(㎡)">
            <el-input
              :model-value="createRoomForm.balconyArea"
              type="number"
              min="0"
              step="any"
              @update:model-value="(v) => onCreateRoomAreaInput('balconyArea', v)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="分摊面积(㎡)">
            <el-input
              :model-value="createRoomForm.sharedArea"
              type="number"
              min="0"
              step="any"
              @update:model-value="(v) => onCreateRoomAreaInput('sharedArea', v)"
            />
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

  <el-dialog
    v-model="batchUsageDialogVisible"
    title="批量更换用途"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
  >
    <p class="usage-editor-current">
      将 <strong>{{ selectedRoomCount }}</strong> 户改为同一用途。
      <template v-if="selectedUsageSummary">当前：{{ selectedUsageSummary }}。</template>
    </p>
    <p v-if="selectedEmptyAreaCount > 0" class="usage-editor-warning">
      其中 {{ selectedEmptyAreaCount }} 户建筑面积为空，保存重算后仍为未知，不计入面积。
    </p>
    <el-form label-position="top" class="usage-editor-form" @submit.prevent>
      <el-form-item label="用途">
        <el-select
          v-model="batchUsageDraft.usageConfigId"
          filterable
          clearable
          :filter-method="onBatchUsageFilter"
          placeholder="请选择用途"
          class="usage-editor-field"
        >
          <el-option
            v-for="item in batchUsageDisplayOptions"
            :key="item.id || `${item.usageCategory}-${item.usagePattern}`"
            :label="`${item.usagePattern}（${item.usageCategoryText} / ${item.floorAreaTypeText}）`"
            :value="String(item.id)"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <p v-if="batchUsageMatchPreview" class="usage-editor-warning">
      保存后会归到「{{ batchUsageMatchPreview.usagePattern }}」（{{
        batchUsageMatchPreview.usageCategoryText
      }}
      / {{ batchUsageMatchPreview.floorAreaTypeText }}），更高优先级的模式会先命中。
    </p>
    <div class="usage-batch-create">
      <el-button text type="primary" @click="handleCreateUsageForSelection">
        新增用途
      </el-button>
      <p class="usage-batch-create__hint">
        新增会立刻写入全局配置，仅超级管理员或开发者可以成功。名称须与未知用途原文完全一致，才会关掉待处理记录。
      </p>
    </div>
    <template #footer>
      <el-button @click="closeBatchUsageDialog">取消</el-button>
      <el-button type="primary" @click="handleConfirmBatchUsage">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch, toRef } from 'vue'
import { useCalibrationRoomTableFilter } from '@/composables/file-upload/useCalibrationRoomTableFilter'
import {
  FILTER_PRESET_MISSING_USAGE,
  isBlankRoomUsage,
} from '@/composables/file-upload/surveyUsagePending'
import { useRoomTableInfiniteScroll } from '@/composables/file-upload/useRoomTableInfiniteScroll'
import { useCalibrationRoomUsageEditor } from '@/composables/file-upload/useCalibrationRoomUsageEditor'
import {
  AREA_COMPARE_TOLERANCE,
  buildSummaryMetrics,
  sortMetricsForCompare,
  OCR_SUM_FIELD_KEYS,
  OCR_SUM_FIELD_BY_METRIC_KEY,
  isAuditSummaryFieldDerivedFromVerificationReason,
} from '@/composables/file-upload/auditSummaryMetrics'
import RoomTableEditableCell from '@/components/file-upload/RoomTableEditableCell.vue'
import {
  clampRoomAreaInput,
  formatRoomAreaDisplay,
  formatRoomAreaFromApi,
  ROOM_AREA_MAX_DECIMALS,
} from '@/utils/roomInfoValidation.js'
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
  dirtyRowCount: { type: Number, default: 0 },
  batchUpdateLoading: { type: Boolean, default: false },
  isCellActive: { type: Function, required: true },
  isRowDirty: { type: Function, required: true },
  startCellEdit: { type: Function, required: true },
  commitActiveCell: { type: Function, required: true },
  discardAllChanges: { type: Function, required: true },
  handleSaveDirtyRows: { type: Function, required: true },
  syncRoomRow: { type: Function, default: null },
  getRoomRowById: { type: Function, default: null },
  notifyRowTouched: { type: Function, default: null },
  prepareRowForEdit: { type: Function, default: null },
  handleRefreshSurveyReport: { type: Function, default: null },
  handleSaveOcrSum: { type: Function, default: null },
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
  searchMissingUsageByPages: { type: Function, default: null },
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
  allFilteredRows,
  searchableTotal: roomTableSearchableTotal,
  clearKeyword: clearRoomTableKeyword,
  setKeyword: setRoomTableKeyword,
  setFilterPreset: setRoomTableFilterPreset,
  onSearchPageChange: onRoomTableSearchPageChange,
  reloadSearchRows: reloadRoomTableSearchRows,
} = useCalibrationRoomTableFilter({
  getRoomRows: () => props.roomInfoData,
  resolveRowById: (rowId) => props.getRoomRowById?.(rowId) ?? null,
  getEditRevision: () => props.dirtyRowCount,
  searchRoomPages: (keyword, opts) => props.searchRoomInfosByPages?.(keyword, opts),
  searchMissingUsagePages: (opts) => props.searchMissingUsageByPages?.(opts),
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
      if (roomTableIsFiltering.value || props.batchUpdateLoading) return
      await tryFillViewport()
    }
  }
)

watch(
  () => [props.roomInfoLoading, props.batchUpdateLoading],
  async ([loading, batchLoading], [prevLoading, prevBatchLoading]) => {
    if (loading || batchLoading) return

    const loadingFinished = prevLoading && !loading
    const batchFinished = prevBatchLoading && !batchLoading
    if (!loadingFinished && !batchFinished) return

    if (roomTableIsFiltering.value) {
      reloadRoomTableSearchRows({ immediate: batchFinished })
      return
    }

    if (loadingFinished) {
      await nextTick()
      const bodyWrapper = roomTableRef.value?.$refs?.bodyWrapper
      const scrollEl = bodyWrapper?.querySelector('.el-scrollbar__wrap') || bodyWrapper
      if (scrollEl) scrollEl.scrollTop = 0
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
    if (!open || loading || roomTableIsFiltering.value || props.batchUpdateLoading) return
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
  prepareRowForEdit: (row) => props.prepareRowForEdit?.(row),
  notifyRowTouched: (row) => props.notifyRowTouched?.(row),
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
  usageEditorMatchPreview,
  onUsageEditorFilter,
  openUsageEditor,
  handleUsageEditorVisibleChange,
  closeUsageEditor,
  confirmUsageEditor,
  openCreateUsageDialogForRow,
  openCreateUsageDialogForRows,
  batchUsageDialogVisible,
  batchUsageDraft,
  batchUsageDisplayOptions,
  batchUsageMatchPreview,
  onBatchUsageFilter,
  openBatchUsageDialog,
  closeBatchUsageDialog,
  confirmBatchUsage,
  resetUsageEditorState,
} = usageEditor

const selectedRoomMap = ref(new Map())

const selectedRoomRows = computed(() => {
  const rows = []
  for (const stored of selectedRoomMap.value.values()) {
    const live = props.getRoomRowById?.(stored?.id)
    if (live) rows.push(live)
  }
  return rows
})
const selectedRoomCount = computed(() => selectedRoomRows.value.length)
const selectedMissingCount = computed(
  () => selectedRoomRows.value.filter((row) => isBlankRoomUsage(row?.roomUsage)).length
)
const selectedEmptyAreaCount = computed(
  () => selectedRoomRows.value.filter((row) => !String(row?.buildingArea ?? '').trim()).length
)
const selectedUsageSummary = computed(() => {
  const counts = new Map()
  for (const row of selectedRoomRows.value) {
    const label = isBlankRoomUsage(row?.roomUsage) ? '用途缺失' : String(row.roomUsage).trim()
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'zh'))
    .map(([name, count]) => `${name} ${count} 户`)
    .join('、')
})

const pageRoomIds = computed(() =>
  filteredRoomInfoData.value.map((row) => String(row?.id ?? '')).filter(Boolean)
)
const pageSelectedCount = computed(
  () => pageRoomIds.value.filter((id) => selectedRoomMap.value.has(id)).length
)
const pageAllSelected = computed(
  () => pageRoomIds.value.length > 0 && pageSelectedCount.value === pageRoomIds.value.length
)
const pageSomeSelected = computed(
  () => pageSelectedCount.value > 0 && pageSelectedCount.value < pageRoomIds.value.length
)

const isRoomSelected = (row) => selectedRoomMap.value.has(String(row?.id ?? ''))

const addRoomSelection = (rows) => {
  const next = new Map(selectedRoomMap.value)
  for (const row of rows || []) {
    if (!row?.id) continue
    next.set(String(row.id), props.getRoomRowById?.(row.id) ?? row)
  }
  selectedRoomMap.value = next
}

const removeRoomSelection = (rows) => {
  const next = new Map(selectedRoomMap.value)
  for (const row of rows || []) {
    next.delete(String(row?.id ?? ''))
  }
  selectedRoomMap.value = next
}

const clearRoomSelection = () => {
  selectedRoomMap.value = new Map()
}

const dropUnresolvedSelection = () => {
  const next = new Map()
  let missing = 0
  for (const [id, stored] of selectedRoomMap.value) {
    const live = props.getRoomRowById?.(stored?.id)
    if (live) next.set(id, live)
    else missing += 1
  }
  if (missing > 0) {
    selectedRoomMap.value = next
    ElMessage.warning(`有 ${missing} 户已不在当前列表，请重新选择`)
  }
  return missing
}

const handleDiscardRoomEdits = () => {
  props.discardAllChanges?.()
  clearRoomSelection()
}

const handleSaveRoomEdits = async () => {
  const ok = await props.handleSaveDirtyRows?.()
  if (ok) clearRoomSelection()
}

const handleOpenBatchUsageDialog = async () => {
  const missing = dropUnresolvedSelection()
  if (!selectedRoomRows.value.length) {
    if (!missing) ElMessage.warning('请先选择户室')
    return
  }
  await openBatchUsageDialog()
}

const handleConfirmBatchUsage = () => {
  dropUnresolvedSelection()
  if (!selectedRoomRows.value.length) return
  confirmBatchUsage(selectedRoomRows.value)
}

const handleCreateUsageForSelection = () => {
  dropUnresolvedSelection()
  if (!selectedRoomRows.value.length) return
  openCreateUsageDialogForRows(selectedRoomRows.value)
}

const toggleRowSelection = (row, checked) => {
  if (checked) addRoomSelection([resolveEditRow(row)])
  else removeRoomSelection([row])
}

const togglePageSelection = (checked) => {
  const rows = filteredRoomInfoData.value.map((row) => resolveEditRow(row))
  if (checked) addRoomSelection(rows)
  else removeRoomSelection(rows)
}

const selectAllFilteredRows = () => {
  addRoomSelection(allFilteredRows.value.map((row) => resolveEditRow(row)))
}

const onCreateRoomAreaInput = (field, value) => {
  createRoomForm[field] = clampRoomAreaInput(value)
}

const summaryMetrics = computed(() =>
  sortMetricsForCompare(buildSummaryMetrics(props.auditSummaryData, AREA_COMPARE_TOLERANCE))
)

const ocrEditRow = reactive(
  Object.fromEntries(OCR_SUM_FIELD_KEYS.map((key) => [key, '']))
)
const activeOcrField = ref('')
const ocrCommitting = ref(false)
const canEditOcr = computed(() => typeof props.handleSaveOcrSum === 'function')

const syncOcrEditRowFromSummary = () => {
  for (const field of OCR_SUM_FIELD_KEYS) {
    if (activeOcrField.value === field) continue
    ocrEditRow[field] = formatRoomAreaFromApi(props.auditSummaryData?.[field])
  }
}

watch(
  () => OCR_SUM_FIELD_KEYS.map((field) => props.auditSummaryData?.[field]),
  () => syncOcrEditRowFromSummary(),
  { immediate: true }
)

const isOcrCellActive = (metricKey) =>
  activeOcrField.value === OCR_SUM_FIELD_BY_METRIC_KEY[metricKey]

const startOcrCellEdit = (metricKey) => {
  if (!canEditOcr.value || ocrCommitting.value) return
  props.commitActiveCell?.()
  const field = OCR_SUM_FIELD_BY_METRIC_KEY[metricKey]
  if (!field) return
  ocrEditRow[field] = formatRoomAreaFromApi(props.auditSummaryData?.[field])
  activeOcrField.value = field
}

const commitOcrCellEdit = async () => {
  const field = activeOcrField.value
  if (!field || ocrCommitting.value) return

  const previous = formatRoomAreaFromApi(props.auditSummaryData?.[field])
  const next = String(ocrEditRow[field] ?? '').trim()
  activeOcrField.value = ''

  const prevNum = Number(previous)
  const nextNum = Number(next)
  const unchanged =
    next === previous ||
    (next !== '' &&
      Number.isFinite(prevNum) &&
      Number.isFinite(nextNum) &&
      Math.abs(prevNum - nextNum) < 0.00005)
  const previousIsDerived = isAuditSummaryFieldDerivedFromVerificationReason(
    props.auditSummaryData,
    field
  )

  if ((unchanged && !previousIsDerived) || !canEditOcr.value) {
    ocrEditRow[field] = previous
    return
  }

  ocrCommitting.value = true
  try {
    const ok = await props.handleSaveOcrSum(field, next)
    if (!ok) {
      ocrEditRow[field] = previous
    }
  } finally {
    ocrCommitting.value = false
    syncOcrEditRowFromSummary()
  }
}

watch(openRef, (open) => {
  if (!open) {
    clearRoomTableKeyword()
    clearRoomSelection()
    clearRoomToolbarRefreshCooldownTimer()
    roomToolbarRefreshCooldown.value = false
    resetUsageEditorState()
    activeOcrField.value = ''
    ocrCommitting.value = false
  }
})

onBeforeUnmount(() => {
  clearRoomToolbarRefreshCooldownTimer()
})

const resolveEditRow = (row) => props.getRoomRowById?.(row?.id) ?? row

const getRoomRowClassName = ({ row }) => {
  const classes = []
  if (props.isRowDirty(row)) classes.push('room-row--dirty')
  if (isBlankRoomUsage(row?.roomUsage)) classes.push('missing-usage-row')
  else if (row?.usageCategory === '未知') classes.push('unknown-usage-row')
  if (Number(row?.isCalculate ?? 0) !== 1) classes.push('non-calculate-row')
  return classes.join(' ')
}

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
    props.auditSummaryData?.roomInfoBuildingAreaSumFromOcr,
    props.auditSummaryData?.roomInfoInnerAreaSumFromOcr,
    props.auditSummaryData?.roomInfoBalconyAreaSumFromOcr,
    props.auditSummaryData?.roomInfoSharedAreaSumFromOcr,
    props.auditSummaryData?.verificationErrorReason,
  ],
  () => {
    if (props.open && props.roomInfoData.length) {
      syncCompareTableLayout()
    }
  }
)

defineExpose({
  clearRoomTableKeyword,
  setRoomTableKeyword,
  setMissingUsageFilter: () => setRoomTableFilterPreset(FILTER_PRESET_MISSING_USAGE),
})
</script>
