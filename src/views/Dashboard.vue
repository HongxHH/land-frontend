<template>
  <div class="dashboard-page admin-mgmt-page workspace-ui-scale">
    <el-card shadow="never" class="dashboard-card filter-card">
      <div class="filter-panel">
        <div class="filter-brand">
          <div class="brand-icon-wrap">
            <el-icon class="brand-icon"><DataAnalysis /></el-icon>
          </div>
          <div class="brand-copy">
            <div class="brand-title-row">
              <span class="brand-title">项目列表</span>
              <span class="brand-pill">总项目 {{ total }}</span>
            </div>
          </div>
        </div>
        <div class="filter-row-wrap">
          <div class="filter-row">
            <el-input
              v-model.trim="queryForm.projectName"
              class="filter-item"
              placeholder="项目名称"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix
                ><el-icon><OfficeBuilding /></el-icon
              ></template>
            </el-input>
            <el-date-picker
              v-model="queryForm.projectTimeRange"
              class="filter-item"
              type="daterange"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              clearable
              unlink-panels
            />
          </div>
          <el-tooltip content="清除筛选条件" placement="top">
            <button
              type="button"
              class="filter-clear-x"
              :disabled="tableLoading"
              aria-label="清除筛选条件"
              @click="handleReset"
            >
              <el-icon><Close /></el-icon>
            </button>
          </el-tooltip>
        </div>
        <div class="filter-actions">
          <el-button class="biz-btn action-primary" :loading="tableLoading" @click="handleSearch"
            >查询</el-button
          >
          <el-tooltip content="创建新的征收/开发项目档案" placement="top">
            <el-button class="create-btn ghost-cta" @click="handleCreateProject">
              <el-icon class="btn-ico"><Plus /></el-icon>
              新建项目
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="dashboard-card table-card">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          <div class="table-title">项目清单</div>
          <div class="project-count">共有项目：{{ total }} 个</div>
          <div class="selected-count">已勾选：{{ selectedRows.length }} 个</div>
        </div>
        <div class="table-actions">
          <el-button
            class="biz-btn action-ghost"
            :disabled="selectedRows.length === 0"
            @click="handlePrintSelected"
          >
            打印报表
          </el-button>
          <el-button class="biz-btn action-ghost" :loading="tableLoading" @click="fetchList"
            >刷新</el-button
          >
        </div>
      </div>

      <el-table
        :data="tableData"
        border
        stripe
        class="project-table admin-mgmt-table"
        height="calc(100vh - 300px)"
        :row-class-name="getRowClassName"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column
          prop="projectName"
          label="项目名称"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="projectTime" label="项目时间" min-width="120" align="center">
          <template #default="{ row }">
            {{ formatProjectTimeForDisplay(row.projectTime) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="surveyReportFileCount"
          label="实测报告数"
          width="120"
          align="center"
        />
        <el-table-column prop="contractFileCount" label="合同文件数" width="120" align="center" />
        <el-table-column prop="transferor" label="出让方" min-width="160" show-overflow-tooltip />
        <el-table-column prop="transferee" label="受让方" min-width="180" show-overflow-tooltip />
        <el-table-column
          label="操作"
          width="220"
          align="center"
          fixed="right"
          class-name="col-actions"
          label-class-name="col-actions"
        >
          <template #default="{ row }">
            <div class="project-table-actions">
              <el-button class="biz-btn action-primary btn-sm" @click="goProject(row)"
                >进入项目</el-button
              >
              <el-button class="biz-btn action-danger btn-sm" @click="handleDeleteProject(row)"
                >删除项目</el-button
              >
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager-wrap admin-mgmt-pager">
        <el-pagination
          v-model:current-page="queryForm.pageNum"
          v-model:page-size="queryForm.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <DashboardPrintBlock
      :is-printing="isPrinting"
      :print-title="printTitle"
      :print-time="printTime"
      :headers="printData.headers"
      :records="printData.records"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, DataAnalysis, OfficeBuilding, Plus } from '@element-plus/icons-vue'
import { deleteProjectById, queryProjectDetails } from '@/services/project.service'
import { getApiErrorMessage } from '@/utils/apiErrorMessage'
import { useDashboardPrint } from '@/composables/dashboard/useDashboardPrint'
import { usePrint } from '@/hooks/usePrint.ts'
import DashboardPrintBlock from '@/components/dashboard/DashboardPrintBlock.vue'
import { formatProjectTimeForDisplay } from '@/utils/projectTimePresent'

const router = useRouter()

const queryForm = reactive({
  pageNum: 1,
  pageSize: 20,
  projectName: '',
  projectTimeRange: [],
})

const tableLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedRows = ref([])

let listAbortController = null

const { buildPrintData } = useDashboardPrint()
const { isPrinting, triggerPrint } = usePrint()
const printRows = ref([])
const printTitle = ref('项目详情打印报表')

const buildPayload = () => {
  const [start, end] = queryForm.projectTimeRange || []
  const startIso = typeof start === 'string' && start.trim() ? start.trim() : undefined
  const endIso = typeof end === 'string' && end.trim() ? end.trim() : undefined
  return {
    pageNum: queryForm.pageNum,
    pageSize: queryForm.pageSize,
    sortField: 'updateTime',
    sortDirection: 'desc',
    projectName: queryForm.projectName || undefined,
    projectTimeStart: startIso,
    projectTimeEnd: endIso,
  }
}

const fetchList = async () => {
  listAbortController?.abort()
  listAbortController = new AbortController()
  const { signal } = listAbortController
  tableLoading.value = true
  try {
    const res = await queryProjectDetails(buildPayload(), { signal })
    const data = res.data?.data || {}
    tableData.value = Array.isArray(data.records) ? data.records : []
    total.value = Number(data.total || 0)
  } catch (error) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return
    console.error('查询项目详情失败:', error)
    ElMessage.error(getApiErrorMessage(error, '查询失败，请稍后重试'))
  } finally {
    if (!signal.aborted) {
      tableLoading.value = false
    }
  }
}

const handleSearch = async () => {
  queryForm.pageNum = 1
  await fetchList()
}

const handleReset = async () => {
  queryForm.projectName = ''
  queryForm.projectTimeRange = []
  queryForm.pageNum = 1
  queryForm.pageSize = 20
  await fetchList()
}

const handleCreateProject = () => {
  router.push({ name: 'ProjectList', query: { openCreate: '1' } })
}

const goProject = (row) => {
  const projectId = row?.id
  if (!projectId) {
    ElMessage.warning('当前项目ID缺失，无法进入项目页')
    return
  }
  router.push({
    name: 'ProjectList',
    query: { projectId: String(projectId) },
  })
}

const handlePrintSelected = () => {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先勾选需要打印的项目')
    return
  }
  printRows.value = [...selectedRows.value]
  printTitle.value = `项目详情打印报表（共 ${selectedRows.value.length} 项）`
  triggerPrint()
}

const handleSelectionChange = (rows) => {
  selectedRows.value = Array.isArray(rows) ? rows : []
}

const getRowClassName = ({ row }) => {
  const id = row?.id
  if (!id) return ''
  return selectedRows.value.some((item) => item?.id === id) ? 'row-selected' : ''
}

const handleDeleteProject = async (row) => {
  const projectId = row?.id
  if (!projectId) {
    ElMessage.warning('当前项目ID缺失，无法删除')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定删除项目“${row.projectName || projectId}”吗？删除前需确保项目下无文件且无进行中的文件任务。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    const res = await deleteProjectById(projectId)
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '项目删除成功')
      await fetchList()
      return
    }
    ElMessage.error(res.data?.msg || '项目删除失败')
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    console.error('删除项目失败:', error)
    ElMessage.error(error?.response?.data?.msg || '删除失败，请稍后重试')
  }
}

const printTime = computed(() => new Date().toLocaleString())
const printData = computed(() => buildPrintData(printRows.value))

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 96px);
  padding: 4px 2px 0;
}

.dashboard-card {
  border-color: #d7dfe9;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.filter-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  overflow-x: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
}

.filter-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 12px 10px;
  padding: 14px;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, #ffffff 0%, var(--home-panel-grad-start) 100%);
}

.filter-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
  max-width: 340px;
}

.brand-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(145deg, #2563eb 0%, #1e40af 100%);
  box-shadow: 0 8px 18px -10px rgba(30, 64, 175, 0.72);
}

.brand-icon {
  color: #fff;
  font-size: 18px;
}

.brand-copy {
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  line-height: 1.25;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  color: #1e293b;
}

.brand-pill {
  font-size: 11px;
  font-weight: 600;
  color: #1e40af;
  padding: 1px 8px;
  line-height: 1.5;
  border-radius: 999px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.brand-desc {
  margin: 6px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: #607286;
}

.filter-row-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.filter-row {
  /* 项目名称 + 日期范围；第二列用 1fr，避免 EP 默认 350px 超出栅格后与右侧虚线分界重叠 */
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(220px, 1fr);
  gap: 10px;
  align-items: center;
}

.filter-clear-x {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 8px;
  color: #ef4444;
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.filter-clear-x:hover:not(:disabled) {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.12);
}

.filter-clear-x:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filter-clear-x .el-icon {
  font-size: 16px;
}

.btn-ico {
  margin-right: 4px;
  font-size: 16px;
}

.filter-actions :deep(.ghost-cta.el-button) {
  min-height: 40px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: var(--biz-btn-soft-text, #1f4e79);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.55);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.filter-actions :deep(.ghost-cta.el-button:hover) {
  background: #fff;
  border-color: #94a3b8;
  color: #0f172a;
}

.filter-item {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

/* EP daterange 默认 width:350px（双 class 特异性高于 .filter-item），须强制适配栅格 */
.filter-card :deep(.filter-item.el-date-editor.el-input__wrapper) {
  width: 100%;
  max-width: 100%;
  --el-date-editor-width: 100%;
  box-sizing: border-box;
}

.filter-card :deep(.filter-item.el-date-editor .el-range-input) {
  flex: 1 1 0;
  width: auto;
  min-width: 4.5em;
}

.filter-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  padding-left: 10px;
  margin-left: 4px;
  border-left: 1px dashed #d3ddea;
}

.filter-card :deep(.el-input__wrapper),
.filter-card :deep(.el-range-editor.el-input__wrapper) {
  border-radius: 8px;
  min-height: 36px;
  font-size: 14px;
}

.filter-card :deep(.el-input__prefix .el-icon) {
  color: #64748b;
}

.btn-sm {
  min-width: 88px;
  height: 36px;
  padding: 0 12px;
  flex-shrink: 0;
  font-size: 14px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 12px 14px 14px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--home-soft-border);
  border-radius: var(--home-card-radius);
  background: linear-gradient(180deg, #f9fbff 0%, #f2f7fc 100%);
  padding: 12px 14px;
  margin-bottom: 10px;
}

.table-toolbar-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.project-count {
  font-size: 14px;
  font-weight: 600;
  color: #5f6f87;
}

.selected-count {
  font-size: 14px;
  color: #516173;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #dbe4ef;
  background: #fff;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-table {
  flex: 1;
}

.project-table-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: nowrap;
  vertical-align: middle;
}

:deep(.project-table-actions .el-button + .el-button) {
  margin-left: 0;
}

:deep(.project-table th.col-actions .cell),
:deep(.project-table td.col-actions .cell) {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 10px;
  padding-right: 10px;
  overflow: visible;
}

:deep(.project-table .el-table__body tr.row-selected > td.el-table__cell) {
  background: #edf4fb !important;
}

:deep(.project-table .el-table__header th.el-table__cell) {
  background: #f1f6fc;
  color: #445468;
  font-weight: 600;
}

:deep(.project-table td.el-table__cell) {
  color: #374a62;
}

.biz-btn.action-primary {
  color: #1f4e79 !important;
  background: #e8f2fc !important;
  border-color: #c8ddf1 !important;
  font-weight: 600;
}

.biz-btn.action-primary:hover {
  color: #163a5a !important;
  background: #d7e7f8 !important;
  border-color: #b8d3ec !important;
}

.biz-btn.action-ghost {
  color: #44566e;
  background: #f4f7fb;
  border-color: #d2dce8;
  font-weight: 600;
}

.biz-btn.action-ghost:hover {
  color: #1f2937;
  background: #eaf0f7;
  border-color: #b6c4d8;
}

.biz-btn.action-danger {
  color: #b42318;
  background: #fff3f2;
  border-color: #f7c4bf;
}

.biz-btn.action-danger:hover {
  color: #912018;
  background: #ffe9e7;
  border-color: #f1a9a1;
}

:deep(.pager-wrap .el-pagination.is-background .el-pager li.is-active) {
  background: #e8f2fc !important;
  border-color: #c8ddf1 !important;
  color: #1f4e79 !important;
}

:deep(.pager-wrap .el-pagination.is-background .btn-next),
:deep(.pager-wrap .el-pagination.is-background .btn-prev),
:deep(.pager-wrap .el-pagination.is-background .el-pager li) {
  background: #f8fafc;
  color: #64748b;
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
}

@media (max-width: 1400px) {
  .filter-panel {
    align-items: stretch;
  }

  .filter-brand {
    max-width: none;
  }

  .filter-row-wrap {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .filter-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .filter-clear-x {
    align-self: flex-end;
  }

  .filter-actions {
    justify-content: flex-end;
    border-left: none;
    padding-left: 0;
  }
}

@media (max-width: 992px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .table-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
