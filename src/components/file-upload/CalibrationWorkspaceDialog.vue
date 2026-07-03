<template>
<el-dialog
  v-model="dialogVisible"
  fullscreen
  append-to-body
  custom-class="calibration-dialog"
  modal-class="calibration-modal"
  :show-close="true"
  @closed="handleDialogClosed"
>
    <template #header>
      <CalibrationHeader :current-file="currentFile" />
    </template>

    <div ref="auditLayoutRef" class="split-view audit-split-layout audit-split-layout--responsive audit-split-layout--calibration">
      <section class="audit-split-layout__left audit-preview-shell" :style="leftPanelStyle">
        <AuditDocumentPreviewPanel
          :loading="pdfLoading || recognitionMdLoading"
          :current-view="currentViewType"
          :download-disabled="!currentFile?.fileId"
          :views="calibrationPreviewViews"
          @update:current-view="switchView"
          @download="downloadSourceFile"
        >
          <template #original>
            <iframe
              v-if="calibrationPdfUrl"
              :src="calibrationPdfUrl"
              class="audit-preview-iframe"
              title="原始文件预览"
              @load="pdfLoaded"
              @error="pdfLoadError"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="PDF 文件加载失败" />
            </div>
          </template>
          <template #preprocess>
            <iframe
              v-if="calibrationPdfUrl"
              :src="calibrationPdfUrl"
              class="audit-preview-iframe"
              title="预处理文件预览"
              @load="pdfLoaded"
              @error="pdfLoadError"
            />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无预处理文件" />
            </div>
          </template>
          <template #recognition>
            <div v-if="recognitionHtml" class="audit-preview-md md-content" v-html="recognitionHtml" />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无识别内容" />
            </div>
          </template>
        </AuditDocumentPreviewPanel>
      </section>

      <div
        class="audit-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调节左右区域宽度"
        @pointerdown="onSplitterMouseDown"
      />

      <div class="right-panel audit-split-layout__right">
        <div class="cali-right-panel">
          <section class="sum-info-section">
            <div
              class="cali-audit-strip"
              :class="auditStripClass"
            >
              <div class="cali-audit-strip__brand">
                <el-icon class="cali-audit-strip__icon" aria-hidden="true">
                  <component :is="isAuditPassed && !hasPendingUnknownUsage ? CircleCheck : WarningFilled" />
                </el-icon>
                <span class="cali-audit-strip__title">校验信息</span>
              </div>

              <div class="cali-audit-strip__metrics">
                <span class="cali-audit-metric">
                  <span class="cali-audit-metric__label">待确认</span>
                  <span
                    class="cali-audit-metric__value"
                    :class="{ 'cali-audit-metric__value--warn': hasPendingConfirmArea }"
                  >
                    {{ auditSummaryData.pendingConfirmArea }}㎡
                  </span>
                </span>
                <span class="cali-audit-metric__sep" aria-hidden="true" />
                <span class="cali-audit-metric">
                  <span class="cali-audit-metric__label">待确认户室</span>
                  <span class="cali-audit-metric__value">{{ auditSummaryData.unknownUsageCount }}条</span>
                  <el-tag
                    size="small"
                    effect="light"
                    round
                    :type="auditSummaryDisplay.hasUnknownUsageText === '有' ? 'warning' : 'success'"
                  >
                    {{ auditSummaryDisplay.hasUnknownUsageText }}
                  </el-tag>
                </span>
                <template v-if="missingUsageCount > 0">
                  <span class="cali-audit-metric__sep" aria-hidden="true" />
                  <span class="cali-audit-metric">
                    <span class="cali-audit-metric__label">用途缺失</span>
                    <span class="cali-audit-metric__value cali-audit-metric__value--warn">{{ missingUsageCount }}户</span>
                  </span>
                </template>
              </div>

              <div class="cali-audit-strip__actions">
                <el-tag
                  size="small"
                  effect="light"
                  round
                  :type="auditSummaryDisplay.isVerifiedTagType"
                >
                  {{ auditSummaryDisplay.isVerifiedText }}
                </el-tag>
                <el-tooltip
                  :content="auditPassDisabledReason"
                  :disabled="!auditPassDisabledReason"
                  placement="bottom"
                >
                  <el-button
                    class="audit-pass-button"
                    type="success"
                    size="small"
                    :loading="auditPassSubmitting"
                    :disabled="auditPassDisabled"
                    @click="handleAuditPassClick"
                  >
                    审核通过
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <div v-if="showUnknownUsagePolicyPanel" class="policy-card policy-card--audit no-print">
              <div class="policy-head">
                <div class="head-left">
                  <el-icon color="#e65f4d" size="18"><WarningFilled /></el-icon>
                  <span class="title">
                    检测到 {{ unknownUsageClassCount }} 类未知用途，请指定归属分类
                  </span>
                </div>
              </div>

              <div v-loading="calibrationUnknownLoading">
                <UnknownUsagePolicyList
                  v-if="calibrationUnknownRows.length > 0"
                  :rows="calibrationUnknownRows"
                  :project-id="projectId"
                  :highlight-usage-name="focusUsageName"
                  show-locate-button
                  @locate-usage="handleLocateUnknownUsage"
                />
                <div v-else-if="!calibrationUnknownLoading" class="calibration-unknown-policy__hint">
                  未找到待处理的未知用途记录（可能已在土地类型管理中处理）。
                </div>
              </div>
            </div>

            <div
              v-if="showVerificationDetailPanel"
              class="cali-audit-detail-panel"
            >
              <div class="cali-audit-detail-panel__body">
                <el-alert
                  v-if="missingUsageCount > 0"
                  class="audit-missing-usage-alert"
                  type="error"
                  :closable="false"
                  show-icon
                  :title="`存在 ${missingUsageCount} 户用途未识别，导出前请补全`"
                />
                <div v-if="hasVerificationErrorReason" class="audit-append-block">
                  <div class="audit-append-label">验证失败原因</div>
                  <div class="reason-text reason-text--panel">{{ auditSummaryData.verificationErrorReason }}</div>
                </div>
                <div v-if="hasVerificationErrorReason" class="audit-append-block verify-tip-block">
                  <div class="verify-tip-title">排查建议</div>
                  <div class="verify-tip-line">1. 请检查解析文件方向。</div>
                  <div class="verify-tip-line">2. 请审查户室面积对照表的部分数据是否被印章遮盖。</div>
                </div>
              </div>
            </div>

            <div
              v-else-if="missingUsageCount > 0 && !showUnknownUsagePolicyPanel"
              class="cali-audit-detail-panel"
            >
              <div class="cali-audit-detail-panel__body">
                <el-alert
                  class="audit-missing-usage-alert"
                  type="error"
                  :closable="false"
                  show-icon
                  :title="`存在 ${missingUsageCount} 户用途未识别，导出前请补全`"
                />
              </div>
            </div>
          </section>

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
                <el-button
                  size="small"
                  type="primary"
                  plain
                  @click="openCreateRoomDialog"
                >
                  新增户室
                </el-button>
                <el-button
                  v-if="isEditing"
                  size="small"
                  type="danger"
                  plain
                  @click="exitEditMode"
                >
                  退出编辑
                </el-button>
                <el-button v-if="isEditing" size="small" type="primary" @click="handleSaveData">保存修改</el-button>
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
              style="width: 100%;"
              :header-cell-style="ROOM_TABLE_HEADER_STYLE"
              :cell-style="ROOM_TABLE_CELL_STYLE"
            >
              <el-table-column prop="roomLevel" label="楼层" min-width="72" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomLevel || '-' }}</template>
                  <el-input v-else v-model="row.roomLevel" size="small" class="room-table-field" placeholder="楼层" />
                </template>
              </el-table-column>

              <el-table-column prop="roomNumber" label="房号" min-width="72" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.roomNumber || '-' }}</template>
                  <el-input v-else v-model="row.roomNumber" size="small" class="room-table-field" placeholder="房号" />
                </template>
              </el-table-column>

              <el-table-column prop="buildingArea" label="建筑面积" min-width="96" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.buildingArea || '0.00' }}</template>
                  <el-input v-else v-model="row.buildingArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="innerArea" label="套内面积" min-width="96" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.innerArea || '0.00' }}</template>
                  <el-input v-else v-model="row.innerArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="balconyArea" label="阳台面积" min-width="96" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.balconyArea || '0.00' }}</template>
                  <el-input v-else v-model="row.balconyArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="sharedArea" label="分摊面积" min-width="96" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ row.sharedArea || '0.00' }}</template>
                  <el-input v-else v-model="row.sharedArea" size="small" class="room-table-field" type="number" />
                </template>
              </el-table-column>

              <el-table-column prop="usageCategory" label="类别" min-width="80" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">{{ normalizeUsageCategoryText(row.usageCategory) }}</template>
                  <span v-else class="room-table-editing-tag">{{ normalizeUsageCategoryText(row.usageCategory) || '未选' }}</span>
                </template>
              </el-table-column>

              <el-table-column prop="roomUsage" label="用途" min-width="132" show-overflow-tooltip align="center">
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
                          <el-button text size="small" type="primary" @click="openCreateUsageDialogForRow(row)">新增用途</el-button>
                          <div>
                            <el-button size="small" @click="closeUsageEditor">取消</el-button>
                            <el-button
                              size="small"
                              type="primary"
                              @click="confirmUsageEditor(row)"
                            >
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

              <el-table-column prop="floorAreaType" label="类型" min-width="80" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <span
                    class="room-area-type"
                    :class="{
                      'room-area-type--buildable': row.floorAreaType === '计容',
                      'room-area-type--non-buildable': row.floorAreaType === '不计容'
                    }"
                  >
                    {{ row.floorAreaType }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="80" align="center" show-overflow-tooltip>
                <template #default="{ row }">
                  <template v-if="!isRowEditing(row)">
                    <span class="room-table-cell-ellipsis">{{ row.remark || '-' }}</span>
                  </template>
                  <el-input v-else v-model="row.remark" size="small" class="room-table-field" placeholder="备注" />
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
                <div
                  v-if="showRoomTableLoadMoreHint"
                  class="room-table-load-more"
                >
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
        </div>
      </div>
    </div>

    <el-dialog
      v-model="createRoomDialogVisible"
      title="新增户室"
      width="560px"
      append-to-body
      :close-on-click-modal="false"
    >
      <el-form ref="createRoomFormRef" :model="createRoomForm" label-width="110px">
        <el-form-item label="用途类别" required>
          <el-select v-model="createRoomForm.usageCategory" placeholder="请选择用途类别" style="width: 100%">
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
        <el-button type="primary" :loading="roomCreateLoading" @click="handleSubmitCreateRoom">确认新增</el-button>
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
        <el-input
          v-model.trim="usagePickerKeyword"
          placeholder="搜索用途名称/用途类别"
          clearable
        />
        <div class="usage-picker-actions">
          <el-button class="biz-btn action-ghost" @click="openCreateUsageDialog">新增用途</el-button>
          <el-button class="biz-btn action-ghost" :loading="usagePickerLoading" @click="loadUsagePickerOptions">刷新</el-button>
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
            <el-button size="small" type="primary" plain @click="applyUsagePicker(row)">选用</el-button>
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
      <el-form ref="createUsageFormRef" :model="createUsageForm" :rules="createUsageFormRules" label-width="100px">
        <el-form-item label="用途名称" prop="usagePattern">
          <el-input v-model.trim="createUsageForm.usagePattern" placeholder="请输入用途名称，如：酒店式公寓" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select v-model="createUsageForm.usageCategory" placeholder="请选择用途类别" style="width: 100%">
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
        <el-button type="primary" :loading="createUsageSubmitting" @click="handleSubmitCreateUsage">确认新增</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  useCalibrationUnknownUsagePolicy,
  parseUnknownUsageNames
} from '@/composables/file-upload/useCalibrationUnknownUsagePolicy'
import { useCalibrationRoomTableFilter } from '@/composables/file-upload/useCalibrationRoomTableFilter'
import { useRoomTableInfiniteScroll } from '@/composables/file-upload/useRoomTableInfiniteScroll'
import { buildSummaryMetrics, sortMetricsForCompare } from '@/composables/file-upload/auditSummaryMetrics'
import {
  isBlankRoomUsage,
  countMissingUsageFromSummary,
  countMissingUsageInRoomRows,
  countDistinctUnknownUsageClasses,
  reportHasPendingUnknownUsage
} from '@/composables/file-upload/surveyUsagePending'
import UnknownUsagePolicyList from '@/components/shared/UnknownUsagePolicyList.vue'
import { Loading, CircleCheck, WarningFilled, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { filterAndRankUsageOptions } from '@/utils/textMatchRank.js'
import CalibrationHeader from '@/components/file-upload/CalibrationHeader.vue'
import AuditDocumentPreviewPanel from '@/components/audit/AuditDocumentPreviewPanel.vue'
import { downloadGridFsFile } from '@/services/file.service'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'
import {
  USAGE_CATEGORY_BUILDABLE_OPTIONS as usageCategoryCreateBuildableOptions,
  USAGE_CATEGORY_NON_BUILDABLE_OPTIONS as usageCategoryCreateNonBuildableOptions,
  floorAreaTypeLabel,
  normalizeUsageCategoryCode,
  resolveFloorAreaTypeByCategory,
  usageCategoryLabel
} from '@/constants/usageCategory.js'
const ROOM_TABLE_HEADER_STYLE = {
  background: '#f1f5f9',
  color: '#334155',
  fontWeight: '600',
  fontSize: '14px',
  padding: '10px 8px'
}

const ROOM_TABLE_CELL_STYLE = {
  fontSize: '14px',
  padding: '10px 8px'
}

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  currentFile: { type: Object, default: null },
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
  handleAuditPass: { type: Function, default: null },
  calibrationLoading: { type: Boolean, default: false },
  currentViewType: { type: String, default: 'original' },
  isPreprocessAvailable: { type: Boolean, default: false },
  switchView: { type: Function, required: true },
  pdfLoading: { type: Boolean, default: false },
  calibrationPdfUrl: { type: String, default: '' },
  pdfLoaded: { type: Function, required: true },
  pdfLoadError: { type: Function, required: true },
  recognitionMdLoading: { type: Boolean, default: false },
  recognitionHtml: { type: String, default: '' },
  auditSummaryData: { type: Object, required: true },
  auditSummaryDisplay: { type: Object, required: true },
  roomInfoData: { type: Array, required: true },
  roomInfoLoading: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  roomInfoTotal: { type: Number, default: 0 },
  fetchAllRoomInfoRows: { type: Function, default: null },
  searchRoomInfosByPages: { type: Function, default: null },
  loadMoreRoomInfo: { type: Function, default: null },
  roomInfoHasMore: { type: Boolean, default: false },
  roomInfoLoadingMore: { type: Boolean, default: false },
  focusUsageName: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'closed'])

const calibrationPreviewViews = computed(() => [
  { id: 'original', label: '原始文件' },
  {
    id: 'preprocess',
    label: '预处理文件',
    disabled: !props.isPreprocessAvailable,
    hint: props.isPreprocessAvailable ? '' : '暂无'
  },
  { id: 'recognition', label: '识别文件(MD)' }
])

const downloadSourceFile = async () => {
  const gridfsId = props.currentFile?.fileId
  if (!gridfsId) {
    ElMessage.warning('缺少 fileId，无法下载')
    return
  }
  try {
    const res = await downloadGridFsFile(gridfsId, { responseType: 'blob' })
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = props.currentFile?.name || '实测报告.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载实测报告失败:', error)
    ElMessage.error('下载失败，请稍后重试')
  }
}

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const handleDialogClosed = () => {
  clearRoomTableKeyword()
  emit('closed')
}

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
  reloadSearchRows: reloadRoomTableSearchRows
} = useCalibrationRoomTableFilter({
  getRoomRows: () => props.roomInfoData,
  searchRoomPages: (keyword, opts) => props.searchRoomInfosByPages?.(keyword, opts),
  getTotal: () => (props.roomInfoTotal > 0 ? props.roomInfoTotal : props.roomInfoData.length)
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
  onLoadMore: () => props.loadMoreRoomInfo?.()
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
  () => [props.modelValue, props.roomInfoLoading, props.roomInfoData.length, props.roomInfoHasMore],
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

watch(dialogVisible, (open) => {
  if (!open) {
    clearRoomTableKeyword()
    clearRoomToolbarRefreshCooldownTimer()
    roomToolbarRefreshCooldown.value = false
  }
})

onBeforeUnmount(() => {
  clearRoomToolbarRefreshCooldownTimer()
})

const auditSummaryDataRef = computed(() => props.auditSummaryData)
const projectIdRef = computed(() => props.projectId)

const {
  calibrationUnknownRows,
  calibrationUnknownLoading
} = useCalibrationUnknownUsagePolicy({
  dialogOpen: dialogVisible,
  projectId: projectIdRef,
  auditSummaryData: auditSummaryDataRef
})

const unknownUsageClassCount = computed(() => {
  const fromRows = calibrationUnknownRows.value.length
  const fromSummary = countDistinctUnknownUsageClasses(props.auditSummaryData?.unknownUsages)
  return Math.max(fromRows, fromSummary)
})

const showUnknownUsagePolicyPanel = computed(() => {
  if (!dialogVisible.value) return false
  if (reportHasPendingUnknownUsage(props.auditSummaryData)) return true
  return parseUnknownUsageNames(props.auditSummaryData?.unknownUsages).length > 0
})

const handleLocateUnknownUsage = (usageName) => {
  const name = String(usageName || '').trim()
  if (!name) return
  setRoomTableKeyword(name)
  ElMessage.info(`已在户室表中筛选「${name}」`)
}

watch(
  () => [dialogVisible.value, props.focusUsageName],
  ([open, focusName]) => {
    if (!open) return
    const name = String(focusName || '').trim()
    if (name) {
      setRoomTableKeyword(name)
    }
  },
  { immediate: true }
)

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel({
  defaultLeftPercent: 40,
  onSplitEnd: () => {
    window.dispatchEvent(new Event('resize'))
  }
})

const isAuditPassed = computed(() => Number(props.auditSummaryData?.isVerified) === 1)

const hasPendingUnknownUsage = computed(() => reportHasPendingUnknownUsage(props.auditSummaryData))

const auditStripClass = computed(() => {
  if (!isAuditPassed.value) return 'cali-audit-strip--failed'
  if (hasPendingUnknownUsage.value) return 'cali-audit-strip--passed-pending'
  return 'cali-audit-strip--passed'
})

const hasVerificationErrorReason = computed(() => {
  const reason = String(props.auditSummaryData?.verificationErrorReason || '').trim()
  return !!reason && reason !== '-' && reason.toLowerCase() !== 'null'
})

const showVerificationDetailPanel = computed(
  () => !isAuditPassed.value && hasVerificationErrorReason.value
)

const missingUsageCount = computed(() => {
  const fromReport = countMissingUsageFromSummary(props.auditSummaryData?.unknownUsages)
  if (fromReport > 0) return fromReport
  return countMissingUsageInRoomRows(props.roomInfoData)
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
const toNumber = (value) => Number(value || 0)
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
    props.modelValue,
    props.roomInfoData.length,
    props.auditSummaryData?.roomInfoBuildingAreaSum,
    props.auditSummaryData?.roomInfoInnerAreaSum,
    props.auditSummaryData?.roomInfoBalconyAreaSum,
    props.auditSummaryData?.roomInfoSharedAreaSum,
    props.auditSummaryData?.verificationErrorReason
  ],
  () => {
    if (props.modelValue && props.roomInfoData.length) {
      syncCompareTableLayout()
    }
  }
)

const hasPendingConfirmArea = computed(
  () => toNumber(props.auditSummaryData?.pendingConfirmArea) > AREA_COMPARE_TOLERANCE
)

const auditPassSubmitting = ref(false)
const auditPassDisabledReason = computed(() => {
  if (typeof props.handleAuditPass !== 'function') return '当前入口不支持提交审核'
  if (props.currentFile?.status === 'AUDIT_PASS' || props.currentFile?.fileState === 'AUDIT_PASS') return '文件已审核通过'
  if (props.calibrationLoading || props.roomInfoLoading) return '数据加载中，请稍后'
  if (!isAuditPassed.value) return '校验未通过，不能审核通过'
  if (hasPendingUnknownUsage.value || missingUsageCount.value > 0) return '仍有未知或缺失用途需要确认'
  if (hasPendingConfirmArea.value) return '仍有待确认面积需要处理'
  return ''
})
const auditPassDisabled = computed(() => auditPassSubmitting.value || Boolean(auditPassDisabledReason.value))

const handleAuditPassClick = async () => {
  if (auditPassDisabledReason.value) {
    ElMessage.warning(auditPassDisabledReason.value)
    return
  }
  auditPassSubmitting.value = true
  try {
    await props.handleAuditPass()
  } catch (error) {
    console.error('审核通过处理失败:', error)
    ElMessage.error('审核通过提交失败，请稍后重试')
  } finally {
    auditPassSubmitting.value = false
  }
}

const createRoomDialogVisible = ref(false)
const createRoomFormRef = ref(null)
const createRoomForm = reactive({
  usageCategory: '',
  roomLevel: '',
  roomNumber: '',
  buildingArea: '',
  innerArea: '',
  balconyArea: '',
  sharedArea: '',
  remark: '',
  roomUsage: '',
  floorAreaType: ''
})

const usagePresetMap = {
  RESIDENTIAL: { roomUsage: '住宅', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMERCIAL: { roomUsage: '商业', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  MANAGEMENT: { roomUsage: '物管', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  OTHER_BUILDABLE: { roomUsage: '其他计容', floorAreaType: 'BUILDABLE', floorAreaTypeText: '计容' },
  COMMUNITY: { roomUsage: '社区用房', floorAreaType: 'NON_BUILDABLE', floorAreaTypeText: '不计容' },
  OTHER_PUBLIC: { roomUsage: '其他公用', floorAreaType: 'NON_BUILDABLE', floorAreaTypeText: '不计容' },
  UNKNOWN: { roomUsage: '未知', floorAreaType: 'UNKNOWN', floorAreaTypeText: '未知' }
}

const derivedRoomPreset = computed(() => {
  return usagePresetMap[createRoomForm.usageCategory] || { roomUsage: '-', floorAreaType: 'UNKNOWN', floorAreaTypeText: '-' }
})

const resetCreateRoomForm = () => {
  createRoomForm.usageCategory = ''
  createRoomForm.roomLevel = ''
  createRoomForm.roomNumber = ''
  createRoomForm.buildingArea = ''
  createRoomForm.innerArea = ''
  createRoomForm.balconyArea = ''
  createRoomForm.sharedArea = ''
  createRoomForm.remark = ''
  createRoomForm.roomUsage = ''
  createRoomForm.floorAreaType = ''
}

const openCreateRoomDialog = () => {
  resetCreateRoomForm()
  createRoomDialogVisible.value = true
}

const handleSubmitCreateRoom = async () => {
  if (!createRoomForm.usageCategory) {
    ElMessage.warning('请先选择用途类别')
    return
  }
  if (typeof props.handleCreateRoom !== 'function') return
  const ok = await props.handleCreateRoom({
    ...createRoomForm,
    roomUsage: derivedRoomPreset.value.roomUsage,
    floorAreaType: derivedRoomPreset.value.floorAreaType
  })
  if (ok) {
    createRoomDialogVisible.value = false
    resetCreateRoomForm()
  }
}

const handleDeleteRoomRow = async (row) => {
  if (typeof props.handleDeleteRoom !== 'function') return
  await props.handleDeleteRoom(row)
}

const usagePickerVisible = ref(false)
const usagePickerLoading = ref(false)
const usagePickerKeyword = ref('')
const usagePickerOptions = ref([])
const usagePickerTargetRow = ref(null)
const createUsageDialogVisible = ref(false)
const createUsageSubmitting = ref(false)
const createUsageFormRef = ref(null)
const createUsageForm = reactive({
  usagePattern: '',
  usageCategory: ''
})
const createUsageFormRules = {
  usagePattern: [{ required: true, message: '请输入用途名称', trigger: 'blur' }],
  usageCategory: [{ required: true, message: '请选择用途类别', trigger: 'change' }]
}

const normalizeUsageCategoryText = (value) => usageCategoryLabel(value, '未知')
const normalizeFloorAreaTypeText = (value) => floorAreaTypeLabel(value, '未知')

const ensureUsageOptionsLoaded = async () => {
  if (usagePickerLoading.value || usagePickerOptions.value.length) return
  await loadUsagePickerOptions()
}

const usageEditorVisibleRowId = ref('')
const usageEditorFilterQuery = ref('')
const usageEditorDraft = reactive({
  roomUsage: ''
})

const usageEditorDisplayOptions = computed(() =>
  filterAndRankUsageOptions(usagePickerOptions.value, usageEditorFilterQuery.value)
)

const onUsageEditorFilter = (query) => {
  usageEditorFilterQuery.value = query
}

const openUsageEditor = async (row) => {
  const rowId = String(row?.id || '')
  if (usageEditorVisibleRowId.value === rowId) {
    closeUsageEditor()
    return
  }
  usagePickerTargetRow.value = row
  usageEditorVisibleRowId.value = rowId
  usageEditorFilterQuery.value = ''
  usageEditorDraft.roomUsage = String(row?.roomUsage || '').trim()
  await ensureUsageOptionsLoaded()
}

const handleUsageEditorVisibleChange = (visible, row) => {
  if (visible) return
  if (usageEditorVisibleRowId.value === String(row?.id || '')) {
    closeUsageEditor()
  }
}

const closeUsageEditor = () => {
  usageEditorVisibleRowId.value = ''
  usageEditorFilterQuery.value = ''
}


const stageUsageOnRow = (row, matched) => {
  const target =
    typeof props.syncRoomRow === 'function' ? props.syncRoomRow(row) : row
  target.usageCategory = matched.usageCategoryText
  target.roomUsage = matched.usagePattern || target.roomUsage
  target.floorAreaType = matched.floorAreaTypeText || target.floorAreaType
  return target
}

const confirmUsageEditor = (row) => {
  if (!usageEditorDraft.roomUsage) {
    ElMessage.warning('请选择用途')
    return
  }
  const matched = usagePickerOptions.value.find((item) =>
    String(item.usagePattern || '').trim() === String(usageEditorDraft.roomUsage || '').trim()
  )
  if (!matched) {
    ElMessage.warning('未找到对应用途配置，请先新增用途')
    return
  }

  stageUsageOnRow(row, matched)
  closeUsageEditor()
  ElMessage.info('用途已更新，请点击「保存修改」提交')
}

const filteredUsagePickerOptions = computed(() =>
  filterAndRankUsageOptions(usagePickerOptions.value, usagePickerKeyword.value)
)

const loadUsagePickerOptions = async () => {
  usagePickerLoading.value = true
  try {
    const res = await axios.get('/api/usage-config/list', { params: { _t: Date.now() } })
    if (res.data?.code !== 200) {
      usagePickerOptions.value = []
      return
    }
    usagePickerOptions.value = (res.data?.data || []).map((item) => ({
      id: item.id,
      usagePattern: item.usagePattern || '-',
      usageCategory: String(item.usageCategory || '').toUpperCase(),
      floorAreaType: String(item.floorAreaType || '').toUpperCase(),
      usageCategoryText: normalizeUsageCategoryText(item.usageCategory),
      floorAreaTypeText: normalizeFloorAreaTypeText(item.floorAreaType)
    }))
  } catch (error) {
    console.error('获取用途映射失败:', error)
    ElMessage.error('获取用途映射失败，请稍后重试')
    usagePickerOptions.value = []
  } finally {
    usagePickerLoading.value = false
  }
}

const applyUsagePicker = (item) => {
  const target = usagePickerTargetRow.value
  if (!target || !item) return
  stageUsageOnRow(target, item)
  usagePickerVisible.value = false
}

const handleUsagePickerRowClick = (row) => {
  applyUsagePicker(row)
}

const resetCreateUsageForm = () => {
  if (createUsageFormRef.value) {
    createUsageFormRef.value.clearValidate()
  }
  createUsageForm.usagePattern = ''
  createUsageForm.usageCategory = ''
}

const openCreateUsageDialog = () => {
  resetCreateUsageForm()
  createUsageDialogVisible.value = true
}

const openCreateUsageDialogForRow = async (row) => {
  usagePickerTargetRow.value = row
  await ensureUsageOptionsLoaded()
  resetCreateUsageForm()
  createUsageForm.usageCategory = normalizeUsageCategoryCode(row?.usageCategory) === 'UNKNOWN'
    ? ''
    : normalizeUsageCategoryCode(row?.usageCategory)
  createUsageDialogVisible.value = true
}

const handleSubmitCreateUsage = async () => {
  if (!createUsageFormRef.value || createUsageSubmitting.value) return
  try {
    await createUsageFormRef.value.validate()
  } catch {
    return
  }

  createUsageSubmitting.value = true
  try {
    const usageCategory = String(createUsageForm.usageCategory || '').toUpperCase()
    const usagePattern = String(createUsageForm.usagePattern || '').trim()
    const floorAreaType = resolveFloorAreaTypeByCategory(usageCategory)

    const payload = {
      usagePattern,
      usageCategory,
      floorAreaType,
      isRegex: 0,
      priority: 100,
      status: 1,
      remark: '审核界面新增',
      collectionName: ''
    }
    const res = await axios.post('/api/usage-config', payload)
    if (res.data?.code !== 200) {
      ElMessage.error(res.data?.msg || '新增用途失败')
      return
    }

    ElMessage.success('新增用途成功')
    createUsageDialogVisible.value = false
    await loadUsagePickerOptions()

    const created = usagePickerOptions.value.find((item) => {
      return String(item.usagePattern || '').trim() === usagePattern &&
        String(item.usageCategory || '').trim().toUpperCase() === usageCategory
    })
    if (created) {
      applyUsagePicker(created)
      ElMessage.info('已选用新用途，请点击「保存修改」提交')
    }
  } catch (error) {
    console.error('新增用途失败:', error)
    ElMessage.error('新增用途失败，请稍后重试')
  } finally {
    createUsageSubmitting.value = false
  }
}
</script>


<style>
/* 只针对这个 dialog 的遮罩层（modal-class） */
.el-overlay.calibration-modal {
  overflow: hidden !important;
}

/* overlay 内层容器：撑满视口，禁止滚动 */
.el-overlay.calibration-modal .el-overlay-dialog {
  padding: 0 !important;
  align-items: stretch !important;
  overflow: hidden !important;
}

/* fullscreen dialog：改成 flex 布局，彻底禁用 dialog 自身滚动 */
.el-overlay.calibration-modal .el-dialog.is-fullscreen {
  margin: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;

  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;   /* ✅ 不允许整页滚 */
}

/* header 固定 */
.el-overlay.calibration-modal .el-dialog__header {
  flex: 0 0 auto;
  padding: 0 !important;
  position: relative;
}

.el-overlay.calibration-modal .el-dialog__headerbtn {
  top: 18px;
  right: 16px;
  z-index: 2;
}

/* body 吃满剩余高度，且自身不滚（滚动交给你指定的区域，比如表格 body-wrapper） */
.el-overlay.calibration-modal .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 0 !important;

  overflow: hidden !important;   /* ✅ body 不滚 */
  display: flex;
  flex-direction: column;        /* ✅ split-view 才能按高度伸展 */
}
</style>

<style scoped>


.split-view.audit-split-layout {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  background: #f0f2f5;
  height: 100%;
}

.audit-split-layout--calibration .audit-splitter {
  background: #94a3b8;
}

.audit-split-layout--calibration .audit-splitter:hover {
  background: #7c8aa0;
}

.audit-split-layout--calibration .audit-splitter::after {
  background: #e2e8f0;
  opacity: 0.95;
}

.audit-preview-shell :deep(.audit-doc-preview) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.right-panel{
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  background: #f2f4f7;
  padding: 16px;
  box-sizing: border-box;
}

.cali-right-panel{
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;   /* ✅不滚 */
  display: flex;
  flex-direction: column;
}

/* summary 固定高度，不参与滚动，避免展开详情时挤压下方表格 */
.sum-info-section{
  flex: 0 0 auto;
  padding-right: 2px;
}

/* 表格容器占剩余高度，但自身不滚 */
.room-table-wrap{
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;   /* ✅不滚 */
  display: flex;
  flex-direction: column;
}

/* el-table 必须拿到高度（不然 body-wrapper 没法算出滚动区） */
:deep(.room-table){
  flex: 1 1 auto;
  min-height: 0;
  height: 0;          /* ✅关键：让它吃剩余高度 */
}

:deep(.room-table--readable.el-table) {
  width: 100% !important;
}

:deep(.room-table--readable .el-table__header),
:deep(.room-table--readable .el-table__body) {
  width: 100% !important;
}

:deep(.room-table .el-table__inner-wrapper){
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
:deep(.room-table .el-table__body-wrapper){
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto !important;
}
/* 如果内部用了 el-scrollbar，补齐高度 */
:deep(.room-table .el-scrollbar){ height: 100%; }
:deep(.room-table .el-scrollbar__wrap){ overflow: auto !important; }




.cali-audit-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: #fff;
  box-shadow: 0 8px 22px -18px rgba(15, 23, 42, 0.18);
}

.cali-audit-strip--passed {
  border-color: rgba(34, 197, 94, 0.35);
  background: linear-gradient(90deg, rgba(240, 253, 244, 0.95) 0%, #fff 42%);
}

.cali-audit-strip--passed-pending {
  border-color: rgba(251, 146, 60, 0.45);
  background: linear-gradient(90deg, rgba(255, 247, 237, 0.95) 0%, #fff 42%);
}

.cali-audit-strip--failed {
  border-color: rgba(248, 113, 113, 0.35);
  background: linear-gradient(90deg, rgba(254, 242, 242, 0.92) 0%, #fff 42%);
}

.cali-audit-strip__brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cali-audit-strip__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

.cali-audit-strip--passed .cali-audit-strip__icon {
  background: linear-gradient(145deg, #22c55e 0%, #16a34a 100%);
}

.cali-audit-strip--passed-pending .cali-audit-strip__icon {
  background: linear-gradient(145deg, #fb923c 0%, #ea580c 100%);
}

.cali-audit-strip--failed .cali-audit-strip__icon {
  background: linear-gradient(145deg, #f97316 0%, #dc2626 100%);
}

.cali-audit-strip__title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
}

.cali-audit-strip__metrics {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.cali-audit-metric {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cali-audit-metric__label {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
}

.cali-audit-metric__value {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  white-space: nowrap;
}

.cali-audit-metric__value--warn {
  color: #c2410c;
}

.cali-audit-metric__sep {
  width: 1px;
  height: 14px;
  background: rgba(148, 163, 184, 0.45);
  flex-shrink: 0;
}

.cali-audit-strip__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.cali-audit-detail-panel {
  margin-top: 8px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  max-height: min(220px, 28vh);
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.2);
}

.cali-audit-detail-panel__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-append-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.unknown-list {
  display: block;
  max-height: 110px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  border: 1px solid #e5eaf3;
  border-radius: 6px;
  background: #f8fbff;
  color: #2563eb;
  white-space: pre-wrap;
  line-height: 1.5;
}

.unknown-list--panel,
.reason-text--panel {
  max-height: none;
}

.unknown-list__line {
  font-size: 13px;
  line-height: 1.55;
  color: #334155;
}

.policy-card--audit {
  margin-top: 8px;
  margin-bottom: 0;
  border: 1px solid #f2c4be;
  background: linear-gradient(180deg, #fff5f4 0%, #fffaf9 100%);
  border-radius: 10px;
  padding: 12px;
}

.policy-card--audit .policy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.policy-card--audit .head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.policy-card--audit .title {
  color: #7f1d1d;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.35;
}

.audit-append-block--nested {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(251, 146, 60, 0.35);
}

.calibration-unknown-policy__hint {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  padding: 4px 0;
}

.room-table-compare {
  flex: 0 0 auto;
  margin-top: 8px;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.room-table-compare__hint {
  margin: 0;
  padding: 8px 12px;
  font-size: 13px;
  color: #64748b;
  border-bottom: 1px solid #eef2f7;
  background: #fffbeb;
}

.room-table-compare__title {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.room-table-compare__table {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

.room-table-compare__row {
  display: grid;
  grid-template-columns: 96px repeat(4, minmax(108px, 1fr));
  align-items: center;
  min-height: 44px;
  min-width: 560px;
  border-top: 1px solid #f1f5f9;
}

.room-table-compare__row:first-child {
  border-top: none;
}

.room-table-compare__row--head {
  background: #fafbfd;
}

.room-table-compare__label {
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  border-right: 1px solid #f1f5f9;
}

.room-table-compare__cell {
  padding: 10px 12px;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
  text-align: center;
  border-right: 1px solid #f1f5f9;
}

.room-table-compare__cell:last-child {
  border-right: none;
}

.room-table-compare__cell--head {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.room-table-compare__cell--ocr {
  color: #2563eb;
}

.room-table-compare__cell--mismatch {
  color: #dc2626 !important;
  background: #fef2f2;
}

.room-table-load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #64748b;
  background: #fafbfd;
  border-top: 1px solid #eef2f7;
}

.room-table-load-more__icon {
  font-size: 16px;
}

.room-table-search-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 8px 4px 0;
}

.reason-text {
  display: block;
  max-height: 76px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff3f2;
  color: #b42318;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-all;
}


.verify-tip-block {
  display: block;
  padding: 8px 10px;
  border: 1px dashed #fbc4c4;
  border-radius: 8px;
  background: #fff7f7;
}

.verify-tip-title {
  font-size: 13px;
  font-weight: 600;
  color: #b42318;
  margin-bottom: 4px;
}

.verify-tip-line {
  font-size: 12px;
  line-height: 1.6;
  color: #b54708;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin: 10px 0 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e6ebf2;
  border-radius: 8px;
}

.table-toolbar .left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
}

.table-toolbar__search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 360px;
}

.room-table-search-input {
  flex: 1 1 auto;
  min-width: 0;
}

.toolbar-title {
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
}

.toolbar-count,
.table-toolbar .right {
  font-size: 14px;
  color: #6b7280;
}

.row-op-group {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.usage-picker-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.usage-picker-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.usage-edit-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  vertical-align: middle;
}

.usage-edit-inline__value {
  flex: 0 1 auto;
  min-width: 0;
}

.usage-edit-inline__action {
  flex-shrink: 0;
  white-space: nowrap;
}

.usage-editor-current {
  margin: 0 0 10px;
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  word-break: break-all;
}

.usage-editor-current strong {
  color: #0f172a;
  font-weight: 600;
}

.usage-editor-pop {
  padding: 2px 2px 0;
  overflow: visible;
}

.usage-editor-pop :deep(.usage-editor-select-popper) {
  z-index: 1;
}

.usage-editor-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 8px;
}

.usage-editor-form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.usage-editor-field {
  width: 100%;
}

.usage-editor-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

:deep(.table-toolbar .el-button--primary),
:deep(.el-dialog__footer .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
  font-weight: 600;
}

:deep(.table-toolbar .el-button--primary:hover),
:deep(.el-dialog__footer .el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

:deep(.table-toolbar .el-button--danger),
:deep(.el-dialog__footer .el-button--danger) {
  background: #fff3f2;
  border-color: #f7c4bf;
  color: #b42318;
  font-weight: 600;
}

:deep(.table-toolbar .el-button--danger:hover),
:deep(.el-dialog__footer .el-button--danger:hover) {
  background: #ffe9e7;
  border-color: #f1a9a1;
  color: #912018;
}

:deep(.room-table--readable .el-table__cell .cell) {
  padding-left: 8px;
  padding-right: 8px;
  line-height: 1.5;
}

:deep(.room-table--readable .el-table__body td.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

:deep(.room-table--readable .el-table__header th.el-table__cell) {
  padding-top: 10px;
  padding-bottom: 10px;
}

:deep(.room-table--readable .el-table__body tr) {
  font-variant-numeric: tabular-nums;
}

:deep(.room-table--readable .el-table__body tr td.el-table__cell) {
  height: 44px;
}

.room-table-cell-ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.room-table-field {
  width: 100%;
}

.room-table-field :deep(.el-input__wrapper) {
  padding: 0 8px;
}

.room-table-editing-tag {
  font-size: 14px;
  color: #64748b;
}

.room-area-type {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.room-area-type--buildable {
  color: #15803d;
}

.room-area-type--non-buildable {
  color: #b45309;
}

.room-table-usage-btn {
  padding: 0;
  font-size: 14px;
}

:deep(.row-op-group .el-button) {
  font-size: 14px;
  min-height: 28px;
}

:deep(.room-table .missing-usage-row > td.el-table__cell) {
  background: #ffe7e7 !important;
}

:deep(.room-table .unknown-usage-row > td.el-table__cell),
:deep(.room-table .non-calculate-row > td.el-table__cell) {
  background: #fff1f0 !important;
}

.usage-missing-tag {
  font-size: 13px;
  padding: 2px 8px;
}

.audit-missing-usage-alert {
  margin-bottom: 10px;
}

:global(.usage-picker-dialog .el-dialog__header),
:global(.create-usage-dialog .el-dialog__header) {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #edf2f8;
}

:global(.usage-picker-dialog .el-dialog__body),
:global(.create-usage-dialog .el-dialog__body) {
  padding: 14px 16px;
}

:global(.usage-picker-dialog .el-dialog__footer),
:global(.create-usage-dialog .el-dialog__footer) {
  padding: 10px 16px 14px;
  border-top: 1px solid #edf2f8;
}





@media (max-width: 1280px) {
  .split-view.audit-split-layout--calibration .audit-preview-shell {
    height: 42%;
    min-height: 320px;
    border-bottom: 1px solid #dcdfe6;
  }

  .split-view.audit-split-layout--calibration .right-panel {
    flex: 1 1 auto;
    height: auto;
    min-height: 0;
    padding: 12px;
  }

  .table-toolbar {
    flex-wrap: wrap;
    align-items: flex-start;
  }
}

</style>
