<template>
  <section class="rows-panel audit-split-layout__right">
    <div class="summary-card">
      <div class="summary-title">复核基础信息</div>
      <div class="summary-grid">
        <div>
          <label>项目名称：</label><span>{{ formData?.projectName || '-' }}</span>
        </div>
        <div>
          <label>建设单位：</label><span>{{ formData?.constructionUnit || '-' }}</span>
        </div>
        <div>
          <label>设计单位：</label><span>{{ formData?.designUnit || '-' }}</span>
        </div>
        <div>
          <label>建设地点：</label><span>{{ formData?.constructionLocation || '-' }}</span>
        </div>
      </div>
      <div class="summary-remark">
        <label>备注：</label>
        <span>{{ formData?.remarks || '-' }}</span>
      </div>
    </div>

    <div class="rows-filter">
      <el-select
        v-model="rowQuery.areaCategory"
        class="filter-item"
        placeholder="面积类别"
        clearable
      >
        <el-option label="住宅" value="RESIDENTIAL" />
        <el-option label="商业" value="COMMERCIAL" />
        <el-option label="其他待定" value="OTHER_PENDING" />
      </el-select>
      <el-input
        v-model.trim="rowQuery.engineeringProject"
        class="filter-item"
        placeholder="工程项目/楼栋名称"
        clearable
        @keyup.enter="handleSearchRows"
      />
      <div class="filter-actions">
        <el-button type="primary" @click="handleSearchRows">查询</el-button>
        <el-button @click="handleResetRows">重置</el-button>
        <el-button :icon="Refresh" @click="fetchRows">刷新</el-button>
        <el-button type="primary" plain @click="openCreateDialog">新增行</el-button>
      </div>
    </div>

    <div ref="rowsTableWrapRef" class="rows-table-wrap" v-loading="rowsLoading">
      <el-table
        class="rows-table planning-audit-table"
        :data="rows"
        border
        stripe
        size="small"
        :height="tableHeightPx"
        row-key="id"
        :header-cell-style="AUDIT_TABLE_HEADER_STYLE"
        :cell-style="AUDIT_TABLE_CELL_STYLE"
      >
        <el-table-column
          type="index"
          label="#"
          width="48"
          align="center"
          fixed="left"
          :index="planningRowIndex"
        />
        <el-table-column
          prop="engineeringProject"
          label="工程项目/楼栋"
          min-width="160"
          fixed="left"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <template v-if="isEditingRow(row.id)">
              <el-input v-model.trim="editForm.engineeringProject" class="cell-input" />
            </template>
            <template v-else>{{ row.engineeringProject || '-' }}</template>
          </template>
        </el-table-column>
        <el-table-column label="面积类别" min-width="100" align="center">
          <template #default="{ row }">
            <template v-if="isEditingRow(row.id)">
              <el-select v-model="editForm.areaCategory" class="cell-input" placeholder="请选择">
                <el-option label="住宅" value="RESIDENTIAL" />
                <el-option label="商业" value="COMMERCIAL" />
                <el-option label="其他待定" value="OTHER_PENDING" />
              </el-select>
            </template>
            <template v-else>{{
              areaCategoryTextMap[row.areaCategory] || row.areaCategory || '-'
            }}</template>
          </template>
        </el-table-column>

        <el-table-column label="面积（㎡）" align="center" min-width="320">
          <el-table-column prop="totalArea" label="总面积" min-width="108" align="right">
            <template #default="{ row }">
              <template v-if="isEditingRow(row.id)">
                <el-input-number
                  v-model="editForm.totalArea"
                  :min="0"
                  :precision="2"
                  controls-position="right"
                  class="cell-input"
                />
              </template>
              <template v-else>{{ formatNum(row.totalArea) }}</template>
            </template>
          </el-table-column>
          <el-table-column prop="farAboveGround" label="计容地上" min-width="108" align="right">
            <template #default="{ row }">
              <template v-if="isEditingRow(row.id)">
                <el-input-number
                  v-model="editForm.farAboveGround"
                  :min="0"
                  :precision="2"
                  controls-position="right"
                  class="cell-input"
                />
              </template>
              <template v-else>{{ formatNum(row.farAboveGround) }}</template>
            </template>
          </el-table-column>
          <el-table-column prop="farBelowGround" label="计容地下" min-width="108" align="right">
            <template #default="{ row }">
              <template v-if="isEditingRow(row.id)">
                <el-input-number
                  v-model="editForm.farBelowGround"
                  :min="0"
                  :precision="2"
                  controls-position="right"
                  class="cell-input"
                />
              </template>
              <template v-else>{{ formatNum(row.farBelowGround) }}</template>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="操作" width="148" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="isEditingRow(row.id)">
              <el-button
                class="op-btn parse-btn"
                size="small"
                type="primary"
                :loading="rowActionLoading"
                @click="submitRowEdit"
                >保存</el-button
              >
              <el-button size="small" @click="cancelRowEdit">取消</el-button>
            </template>
            <template v-else>
              <span class="planning-audit-row-actions">
                <el-button
                  class="op-btn audit-btn"
                  size="small"
                  type="primary"
                  plain
                  @click="startRowEdit(row)"
                  >编辑</el-button
                >
                <el-popconfirm title="确认删除该行？" width="220" @confirm="deleteRow(row)">
                  <template #reference>
                    <el-button
                      class="op-btn delete-btn"
                      size="small"
                      type="danger"
                      plain
                      :loading="rowActionLoading"
                      >删除</el-button
                    >
                  </template>
                </el-popconfirm>
              </span>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="pager-row">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next"
        :total="rowTotal"
        :page-size="rowQuery.pageSize"
        :current-page="rowQuery.pageNum"
        :page-sizes="[10, 20, 50, 100]"
        @size-change="handleRowSizeChange"
        @current-change="handleRowPageChange"
      />
    </div>
  </section>

  <el-dialog
    v-model="createDialogVisible"
    title="新增规划复核行"
    width="720px"
    align-center
    destroy-on-close
    append-to-body
    class="planning-create-dialog"
    :close-on-click-modal="false"
  >
    <el-form :model="createForm" label-position="top" class="planning-create-form">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="行号">
            <el-input-number
              v-model="createForm.rowIndex"
              :min="0"
              controls-position="right"
              class="cell-input"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="面积类别">
            <el-select v-model="createForm.areaCategory" class="cell-input" clearable>
              <el-option label="住宅" value="RESIDENTIAL" />
              <el-option label="商业" value="COMMERCIAL" />
              <el-option label="其他待定" value="OTHER_PENDING" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="工程项目/楼栋">
        <el-input v-model.trim="createForm.engineeringProject" />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="总面积(㎡)">
            <el-input-number
              v-model="createForm.totalArea"
              :min="0"
              :precision="2"
              controls-position="right"
              class="cell-input"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="计容地上(㎡)">
            <el-input-number
              v-model="createForm.farAboveGround"
              :min="0"
              :precision="2"
              controls-position="right"
              class="cell-input"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="计容地下(㎡)">
            <el-input-number
              v-model="createForm.farBelowGround"
              :min="0"
              :precision="2"
              controls-position="right"
              class="cell-input"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="createDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="rowActionLoading" @click="submitCreateRow"
        >创建</el-button
      >
    </template>
  </el-dialog>
</template>

<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  createPlanningReviewRow,
  deletePlanningReviewRow,
  queryPlanningReviewRows,
  updatePlanningReviewRow,
} from '@/services/project.service'
import { AUDIT_TABLE_HEADER_STYLE, AUDIT_TABLE_CELL_STYLE } from '@/constants/auditTableStyles'

const props = defineProps({
  formData: {
    type: Object,
    default: null,
  },
  projectId: {
    type: [String, Number],
    default: '',
  },
  active: {
    type: Boolean,
    default: false,
  },
  layoutRef: {
    type: Object,
    default: null,
  },
})

const rowsTableWrapRef = ref(null)
const tableHeightPx = ref(320)
let tableResizeObserver = null

function measureTableHeight() {
  const wrap = rowsTableWrapRef.value
  if (!wrap) return
  tableHeightPx.value = Math.max(160, Math.floor(wrap.getBoundingClientRect().height))
}

function bindTableHeightObserver() {
  if (tableResizeObserver) {
    tableResizeObserver.disconnect()
    tableResizeObserver = null
  }
  const wrap = rowsTableWrapRef.value
  if (!wrap) return
  measureTableHeight()
  if (typeof ResizeObserver === 'undefined') return
  tableResizeObserver = new ResizeObserver(() => measureTableHeight())
  tableResizeObserver.observe(wrap)
  const layout = props.layoutRef
  if (layout) tableResizeObserver.observe(layout)
}

function disconnectTableHeightObserver() {
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
}

const areaCategoryTextMap = {
  RESIDENTIAL: '住宅',
  COMMERCIAL: '商业',
  OTHER_PENDING: '其他待定',
}

const rowsLoading = ref(false)
const rowActionLoading = ref(false)
const rows = ref([])
const rowTotal = ref(0)
const editingRowId = ref('')
const createDialogVisible = ref(false)

const rowQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'rowIndex',
  sortDirection: 'asc',
  areaCategory: '',
  engineeringProject: '',
})

const planningRowIndex = (index) => (rowQuery.pageNum - 1) * rowQuery.pageSize + index + 1

const editForm = reactive({
  id: '',
  rowIndex: null,
  engineeringProject: '',
  areaCategory: '',
  constructionNature: '',
  buildingCount: null,
  aboveGroundFloors: null,
  belowGroundFloors: null,
  totalArea: null,
  farAboveGround: null,
  farBelowGround: null,
})

const createForm = reactive({
  rowIndex: null,
  engineeringProject: '',
  areaCategory: '',
  constructionNature: '',
  buildingCount: null,
  aboveGroundFloors: null,
  belowGroundFloors: null,
  totalArea: null,
  farAboveGround: null,
  farBelowGround: null,
})

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const val = Number(num)
  return Number.isNaN(val) ? '-' : val.toFixed(2)
}

const buildRowsPayload = () => {
  const payload = {
    pageNum: rowQuery.pageNum,
    pageSize: rowQuery.pageSize,
    sortField: rowQuery.sortField,
    sortDirection: rowQuery.sortDirection,
  }
  if (props.formData?.fileRecordId) payload.fileRecordId = Number(props.formData.fileRecordId)
  if (rowQuery.areaCategory) payload.areaCategory = rowQuery.areaCategory
  if (rowQuery.engineeringProject) payload.engineeringProject = rowQuery.engineeringProject
  return payload
}

const fetchRows = async () => {
  if (!props.formData?.fileRecordId) {
    rows.value = []
    rowTotal.value = 0
    return
  }
  rowsLoading.value = true
  try {
    const res = await queryPlanningReviewRows(buildRowsPayload())
    if (res.data?.code !== 200) {
      rows.value = []
      rowTotal.value = 0
      ElMessage.warning(res.data?.msg || '规划复核明细查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    rows.value = parsed.records
    rowTotal.value = parsed.total
  } catch (error) {
    console.error('查询规划复核明细失败:', error)
    rows.value = []
    rowTotal.value = 0
    ElMessage.error('查询规划复核明细失败，请稍后重试')
  } finally {
    rowsLoading.value = false
    nextTick(measureTableHeight)
  }
}

const isEditingRow = (rowId) => String(editingRowId.value) === String(rowId)

const startRowEdit = (row) => {
  editingRowId.value = row.id
  editForm.id = row.id
  editForm.rowIndex = row.rowIndex ?? null
  editForm.engineeringProject = row.engineeringProject || ''
  editForm.areaCategory = row.areaCategory || ''
  editForm.constructionNature = row.constructionNature || ''
  editForm.buildingCount = row.buildingCount ?? null
  editForm.aboveGroundFloors = row.aboveGroundFloors ?? null
  editForm.belowGroundFloors = row.belowGroundFloors ?? null
  editForm.totalArea = row.totalArea ?? null
  editForm.farAboveGround = row.farAboveGround ?? null
  editForm.farBelowGround = row.farBelowGround ?? null
}

const cancelRowEdit = () => {
  editingRowId.value = ''
}

const submitRowEdit = async () => {
  if (!editForm.id) return
  rowActionLoading.value = true
  try {
    const payload = {
      id: Number(editForm.id),
      rowIndex: editForm.rowIndex,
      engineeringProject: editForm.engineeringProject || undefined,
      areaCategory: editForm.areaCategory || undefined,
      constructionNature: editForm.constructionNature || undefined,
      buildingCount: editForm.buildingCount,
      aboveGroundFloors: editForm.aboveGroundFloors,
      belowGroundFloors: editForm.belowGroundFloors,
      totalArea: editForm.totalArea,
      farAboveGround: editForm.farAboveGround,
      farBelowGround: editForm.farBelowGround,
    }
    const res = await updatePlanningReviewRow(payload)
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '更新失败')
      return
    }
    ElMessage.success('更新成功')
    editingRowId.value = ''
    await fetchRows()
  } catch (error) {
    console.error('更新规划复核行失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    rowActionLoading.value = false
  }
}

const resetCreateForm = () => {
  createForm.rowIndex = null
  createForm.engineeringProject = ''
  createForm.areaCategory = ''
  createForm.constructionNature = ''
  createForm.buildingCount = null
  createForm.aboveGroundFloors = null
  createForm.belowGroundFloors = null
  createForm.totalArea = null
  createForm.farAboveGround = null
  createForm.farBelowGround = null
}

const openCreateDialog = () => {
  resetCreateForm()
  createDialogVisible.value = true
}

const submitCreateRow = async () => {
  if (!props.projectId || !props.formData?.id || !props.formData?.fileRecordId) return
  rowActionLoading.value = true
  try {
    const payload = {
      projectId: Number(props.projectId),
      fileRecordId: Number(props.formData.fileRecordId),
      planningReviewFormId: Number(props.formData.id),
      rowIndex: createForm.rowIndex,
      engineeringProject: createForm.engineeringProject || undefined,
      areaCategory: createForm.areaCategory || undefined,
      constructionNature: createForm.constructionNature || undefined,
      buildingCount: createForm.buildingCount,
      aboveGroundFloors: createForm.aboveGroundFloors,
      belowGroundFloors: createForm.belowGroundFloors,
      totalArea: createForm.totalArea,
      farAboveGround: createForm.farAboveGround,
      farBelowGround: createForm.farBelowGround,
    }
    const res = await createPlanningReviewRow(payload)
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '新增失败')
      return
    }
    ElMessage.success('新增成功')
    createDialogVisible.value = false
    await fetchRows()
  } catch (error) {
    console.error('新增规划复核行失败:', error)
    ElMessage.error('新增失败，请稍后重试')
  } finally {
    rowActionLoading.value = false
  }
}

const deleteRow = async (row) => {
  if (!row?.id) return
  rowActionLoading.value = true
  try {
    const res = await deletePlanningReviewRow(Number(row.id))
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    await fetchRows()
  } catch (error) {
    console.error('删除规划复核行失败:', error)
    ElMessage.error('删除失败，请稍后重试')
  } finally {
    rowActionLoading.value = false
  }
}

const handleSearchRows = () => {
  rowQuery.pageNum = 1
  fetchRows()
}

const handleResetRows = () => {
  rowQuery.pageNum = 1
  rowQuery.pageSize = 20
  rowQuery.areaCategory = ''
  rowQuery.engineeringProject = ''
  fetchRows()
}

const handleRowPageChange = (page) => {
  rowQuery.pageNum = page
  fetchRows()
}

const handleRowSizeChange = (size) => {
  rowQuery.pageSize = size
  rowQuery.pageNum = 1
  fetchRows()
}

const resetPanelState = () => {
  cancelRowEdit()
  createDialogVisible.value = false
}

const resetRowQuery = () => {
  rowQuery.pageNum = 1
  rowQuery.pageSize = 20
  rowQuery.areaCategory = ''
  rowQuery.engineeringProject = ''
}

watch(
  () => [props.active, props.projectId, props.formData?.id, props.formData?.fileRecordId],
  async ([isActive]) => {
    if (!isActive) {
      disconnectTableHeightObserver()
      return
    }
    resetPanelState()
    resetRowQuery()
    await fetchRows()
    nextTick(bindTableHeightObserver)
  }
)

watch(
  () => [rows.value.length, rowQuery.pageNum, rowQuery.pageSize],
  () => nextTick(measureTableHeight)
)

onBeforeUnmount(() => {
  disconnectTableHeightObserver()
})

defineExpose({
  fetchRows,
  measureTableHeight,
  resetPanelState,
})
</script>

<style scoped>
.planning-audit-row-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.rows-panel {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  min-height: 0;
  height: 100%;
  align-self: stretch;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.audit-split-layout__right.rows-panel {
  flex: 1 1 auto;
  min-width: 0;
}

.summary-card {
  border: 1px solid #e5ecf6;
  background: #f8fbff;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.summary-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
  font-size: 13px;
  color: #475569;
}

.summary-grid label,
.summary-remark label {
  color: #64748b;
}

.summary-remark {
  margin-top: 8px;
  max-height: 84px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.rows-filter {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.filter-item {
  width: 100%;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.rows-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:deep(.rows-table-wrap .rows-table) {
  width: 100%;
  flex: 1;
}

.pager-row {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.cell-input {
  width: 100%;
}

:deep(.rows-table-wrap .el-input-number) {
  width: 100%;
}

:deep(.rows-table-wrap .el-input-number .el-input__wrapper) {
  padding-left: 8px;
  padding-right: 28px;
}

:deep(.filter-actions .el-button) {
  min-width: 80px;
  height: 32px;
  border-radius: 6px;
  font-weight: 600;
}

:deep(.filter-actions .el-button--primary) {
  background: #e8f2fc;
  border-color: #c8ddf1;
  color: #1f4e79;
}

:deep(.filter-actions .el-button--primary:hover) {
  background: #d7e7f8;
  border-color: #b8d3ec;
  color: #163a5a;
}

:deep(.el-pagination) {
  --el-color-primary: #1f4e79;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  color: #1f4e79;
  border-color: #c8ddf1;
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .el-pager li) {
  background: #f3f4f6;
  color: #475569;
}

:deep(.planning-create-dialog .el-dialog__body) {
  padding: 12px 20px 8px;
}

.planning-create-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

@media (max-width: 1280px) {
  .rows-panel {
    height: 50vh;
    min-height: 420px;
    min-width: 0;
  }
}
</style>
