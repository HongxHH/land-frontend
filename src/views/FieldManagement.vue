<template>
  <div class="field-mgmt-container admin-mgmt-page">
    <el-card class="section-card" shadow="never">
      <div class="table-toolbar admin-mgmt-toolbar">
        <div class="table-toolbar__main">
          <span class="title">已知用途</span>
          <el-input
            v-model="knownSearchKeyword"
            class="table-search"
            clearable
            placeholder="搜索匹配模式、类别、备注等"
            :prefix-icon="Search"
          />
        </div>
        <div class="table-toolbar__actions">
          <span class="count">{{ knownCountText }}</span>
          <el-button class="biz-btn" type="primary" plain :icon="Refresh" @click="handleRefresh"
            >刷新</el-button
          >
          <el-button class="biz-btn" type="primary" :icon="Plus" @click="openAddDialog"
            >新增映射</el-button
          >
        </div>
      </div>
      <div class="table-container">
        <el-table
          class="admin-mgmt-table"
          :data="filteredStandardFields"
          border
          stripe
          table-layout="fixed"
          :max-height="tableMaxHeight"
          v-loading="loading"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column
            prop="usagePattern"
            label="用途匹配模式"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column label="用途类别" width="180" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              {{ usageCategoryLabel(row.usageCategory) }}
            </template>
          </el-table-column>
          <el-table-column label="面积类型" width="140" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" :type="floorAreaTypeTagType(row.floorAreaType)">
                {{ floorAreaTypeLabel(row.floorAreaType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">{{ Number(row.status) === 1 ? '启用' : '禁用' }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" align="center" show-overflow-tooltip />
          <el-table-column label="操作" width="320" align="center" fixed="right">
            <template #default="{ row }">
              <span class="field-table-actions">
                <el-button
                  class="op-btn audit-btn"
                  type="primary"
                  size="small"
                  plain
                  :icon="View"
                  @click="openRelatedFilesDrawer(row)"
                >
                  涉及文件
                </el-button>
                <el-button
                  class="op-btn audit-btn"
                  type="primary"
                  size="small"
                  plain
                  :icon="Edit"
                  @click="openEditDialog(row)"
                  >编辑</el-button
                >
                <el-popconfirm title="确认删除该映射？" @confirm="handleDelete(row)">
                  <template #reference>
                    <el-button
                      class="op-btn delete-btn"
                      type="danger"
                      size="small"
                      plain
                      :icon="Delete"
                      >删除</el-button
                    >
                  </template>
                </el-popconfirm>
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-card class="section-card" shadow="never">
      <div class="table-toolbar admin-mgmt-toolbar">
        <div class="table-toolbar__main">
          <span class="title">未知用途</span>
          <el-input
            v-model="unknownSearchKeyword"
            class="table-search"
            clearable
            placeholder="搜索用途名称、项目、文件等"
            :prefix-icon="Search"
          />
        </div>
        <span class="count">{{ unknownCountText }}</span>
      </div>
      <div class="table-container">
        <el-table
          class="admin-mgmt-table"
          :data="filteredSpecialFields"
          border
          stripe
          table-layout="fixed"
          :max-height="tableMaxHeight"
          v-loading="loading"
        >
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column
            prop="usageName"
            label="未知用途名称"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column prop="occurrenceCount" label="出现次数" width="100" align="center" />
          <el-table-column label="最近来源" min-width="200">
            <template #default="{ row }">
              <div v-if="row.recentProjectName || row.recentFileName" class="unknown-source-cell">
                <div
                  v-if="row.recentProjectName"
                  class="unknown-source-line"
                  :title="row.recentProjectName"
                >
                  项目：{{ row.recentProjectName }}
                </div>
                <div
                  v-if="row.recentFileName"
                  class="unknown-source-line"
                  :title="row.recentFileName"
                >
                  文件：{{ row.recentFileName }}
                </div>
              </div>
              <span v-else class="unknown-source-empty">-</span>
            </template>
          </el-table-column>
          <el-table-column label="归属类别" min-width="200">
            <template #default="{ row }">
              <el-select
                v-model="row.targetCategory"
                placeholder="请选择归属类别"
                style="width: 100%"
              >
                <el-option-group label="计容面积">
                  <el-option label="商业" value="calcCommercial" />
                  <el-option label="住宅" value="calcResidential" />
                  <el-option label="物管" value="calcPropMgmt" />
                  <el-option label="其他计容" value="calcOther" />
                </el-option-group>
                <el-option-group label="不计容面积">
                  <el-option label="社区用房" value="nonCalcCommunity" />
                  <el-option label="其他公用" value="nonCalcOther" />
                </el-option-group>
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="170" align="center">
            <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240" align="center" fixed="right">
            <template #default="{ row }">
              <span class="field-table-actions">
                <el-button
                  class="op-btn audit-btn"
                  type="primary"
                  size="small"
                  plain
                  :icon="View"
                  :disabled="!row.fileRecordId || !row.projectId"
                  @click="goOpenSourceAudit(row)"
                >
                  打开审核
                </el-button>
                <el-button
                  class="op-btn parse-btn"
                  type="primary"
                  size="small"
                  :icon="Check"
                  @click="saveSpecialConfig(row)"
                  >保存</el-button
                >
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog v-model="addDialogVisible" title="新增用途映射" width="560px" @close="resetAddForm">
      <el-form ref="addFormRef" :model="addForm" :rules="formRules" label-width="110px">
        <el-form-item label="用途匹配模式" prop="usagePattern">
          <el-input v-model="addForm.usagePattern" placeholder="如：住宅、商业办公" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select
            v-model="addForm.usageCategory"
            style="width: 100%"
            placeholder="请选择用途类别"
          >
            <el-option-group label="计容面积">
              <el-option
                v-for="item in usageCategoryBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option
                v-for="item in usageCategoryNonBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="addForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="addForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddForm">确认新增</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑用途映射"
      width="560px"
      @close="resetEditForm"
    >
      <el-form ref="editFormRef" :model="editForm" :rules="formRules" label-width="110px">
        <el-form-item label="用途匹配模式" prop="usagePattern">
          <el-input v-model="editForm.usagePattern" />
        </el-form-item>
        <el-form-item label="用途类别" prop="usageCategory">
          <el-select
            v-model="editForm.usageCategory"
            style="width: 100%"
            placeholder="请选择用途类别"
          >
            <el-option-group label="计容面积">
              <el-option
                v-for="item in usageCategoryBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
            <el-option-group label="不计容面积">
              <el-option
                v-for="item in usageCategoryNonBuildableOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="editForm.status">
            <el-radio label="1">启用</el-radio>
            <el-radio label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm">确认更新</el-button>
      </template>
    </el-dialog>

    <UsageConfigRelatedFilesDrawer
      :visible="relatedFilesDrawerVisible"
      :config="relatedFilesConfig"
      :loading="relatedFilesLoading"
      :records="relatedFilesRecords"
      v-model:keyword="relatedFilesKeyword"
      :summary="relatedFilesSummary"
      :pagination="relatedFilesPagination"
      @close="closeRelatedFilesDrawer"
      @search="handleRelatedFilesSearch"
      @page-change="handleRelatedFilesPageChange"
      @size-change="handleRelatedFilesSizeChange"
      @open-audit="goOpenSourceAudit"
    />
  </div>
</template>

<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Delete, Edit, Plus, Refresh, Search, View } from '@element-plus/icons-vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import UsageConfigRelatedFilesDrawer from '@/components/field-management/UsageConfigRelatedFilesDrawer.vue'
import { useUsageConfigRelatedFiles } from '@/composables/field-management/useUsageConfigRelatedFiles.js'
import {
  TARGET_CATEGORY_LABEL_MAP,
  TARGET_CATEGORY_MAP,
  USAGE_CATEGORY_BUILDABLE_OPTIONS,
  USAGE_CATEGORY_NON_BUILDABLE_OPTIONS,
  floorAreaTypeLabel,
  floorAreaTypeTagType,
  resolveFloorAreaTypeByCategory,
  usageCategoryLabel,
} from '@/constants/usageCategory.js'

const router = useRouter()

const {
  drawerVisible: relatedFilesDrawerVisible,
  currentConfig: relatedFilesConfig,
  loading: relatedFilesLoading,
  records: relatedFilesRecords,
  keyword: relatedFilesKeyword,
  summary: relatedFilesSummary,
  pagination: relatedFilesPagination,
  openDrawer: openRelatedFilesDrawer,
  closeDrawer: closeRelatedFilesDrawer,
  handleSearch: handleRelatedFilesSearch,
  handlePageChange: handleRelatedFilesPageChange,
  handleSizeChange: handleRelatedFilesSizeChange,
} = useUsageConfigRelatedFiles()

const loading = ref(false)
const standardFields = ref([])
const specialFields = ref([])
const knownSearchKeyword = ref('')
const unknownSearchKeyword = ref('')

const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const addFormRef = ref(null)
const editFormRef = ref(null)

const tableMaxHeight = computed(() => Math.max(220, Math.floor((window.innerHeight - 274) / 2)))

/** 后端仍需要 priority / isRegex；界面不展示，固定为默认值 */
const DEFAULT_USAGE_PRIORITY = 100
const DEFAULT_IS_REGEX = 0

const categoryMap = TARGET_CATEGORY_MAP

const formRules = reactive({
  usagePattern: [{ required: true, message: '请输入用途匹配模式', trigger: 'blur' }],
  usageCategory: [{ required: true, message: '请选择用途类别', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
})

const usageCategoryBuildableOptions = USAGE_CATEGORY_BUILDABLE_OPTIONS
const usageCategoryNonBuildableOptions = USAGE_CATEGORY_NON_BUILDABLE_OPTIONS

const addForm = reactive({
  usagePattern: '',
  usageCategory: '',
  floorAreaType: 'BUILDABLE',
  priority: DEFAULT_USAGE_PRIORITY,
  status: '1',
  remark: '',
  collectionName: '',
})

const editForm = reactive({
  id: '',
  usagePattern: '',
  usageCategory: '',
  floorAreaType: 'BUILDABLE',
  priority: DEFAULT_USAGE_PRIORITY,
  status: '1',
  remark: '',
  collectionName: '',
})

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const text = String(timeStr).replace('T', ' ')
  return text.split('.')[0]
}

const normalizeSearchText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const rowMatchesKeyword = (parts, keyword) => {
  if (!keyword) return true
  const haystack = parts.map((part) => normalizeSearchText(part)).join(' ')
  return haystack.includes(keyword)
}

const filteredStandardFields = computed(() => {
  const keyword = normalizeSearchText(knownSearchKeyword.value)
  if (!keyword) return standardFields.value
  return standardFields.value.filter((row) =>
    rowMatchesKeyword(
      [
        row.usagePattern,
        row.usageCategory,
        usageCategoryLabel(row.usageCategory, ''),
        floorAreaTypeLabel(row.floorAreaType, ''),
        Number(row.status) === 1 ? '启用' : '禁用',
        row.remark,
      ],
      keyword
    )
  )
})

const filteredSpecialFields = computed(() => {
  const keyword = normalizeSearchText(unknownSearchKeyword.value)
  if (!keyword) return specialFields.value
  return specialFields.value.filter((row) =>
    rowMatchesKeyword(
      [
        row.usageName,
        row.occurrenceCount,
        row.recentProjectName,
        row.recentFileName,
        TARGET_CATEGORY_LABEL_MAP[row.targetCategory],
        row.targetCategory,
        formatTime(row.updateTime),
      ],
      keyword
    )
  )
})

const knownCountText = computed(() => {
  const total = standardFields.value.length
  const shown = filteredStandardFields.value.length
  if (!normalizeSearchText(knownSearchKeyword.value)) return `共 ${total} 条`
  return `共 ${shown} 条（筛选自 ${total} 条）`
})

const unknownCountText = computed(() => {
  const total = specialFields.value.length
  const shown = filteredSpecialFields.value.length
  if (!normalizeSearchText(unknownSearchKeyword.value)) return `共 ${total} 条`
  return `共 ${shown} 条（筛选自 ${total} 条）`
})

const fetchUsageConfigList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/list', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      standardFields.value = (res.data.data || []).map((item) => ({
        ...item,
        priority: Number(item.priority),
        status: Number(item.status),
      }))
    }
  } catch (error) {
    console.error('获取用途配置失败:', error)
    ElMessage.error('获取用途配置失败，请重试')
  } finally {
    loading.value = false
  }
}

const fetchUnknownUsageList = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/usage-config/unknown/pending', { params: { _t: Date.now() } })
    if (res.data.code === 200) {
      specialFields.value = (res.data.data || []).map((item) => ({
        id: item.id,
        usageName: item.usageName,
        occurrenceCount: item.occurrenceCount,
        updateTime: item.updateTime,
        targetCategory: item.suggestedCategory || '',
        projectId: item.projectId,
        fileRecordId: item.fileRecordId,
        recentFileName: item.recentFileName || '',
        recentProjectName: item.recentProjectName || '',
        handleRemark: item.handleRemark || '',
      }))
    }
  } catch (error) {
    console.error('获取未知用途失败:', error)
    ElMessage.error('获取未知用途失败，请重试')
  } finally {
    loading.value = false
  }
}

const addUsageConfig = async (formData) => {
  const loadingInst = ElLoading.service({ lock: true, text: '正在新增配置...' })
  try {
    const submitData = { ...formData }
    delete submitData.id
    const res = await axios.post('/api/usage-config', submitData)
    if (res.data.code === 200) return true
    ElMessage.error(res.data.msg || '新增失败')
    return false
  } catch (error) {
    console.error('新增用途配置失败:', error)
    ElMessage.error('新增失败，请重试')
    return false
  } finally {
    loadingInst.close()
  }
}

const updateUsageConfig = async (id, formData) => {
  const loadingInst = ElLoading.service({ lock: true, text: '正在更新配置...' })
  try {
    const submitData = { ...formData }
    delete submitData.id
    const res = await axios.put(`/api/usage-config/${id}`, submitData)
    if (res.data.code === 200) return true
    ElMessage.error(res.data.msg || '更新失败')
    return false
  } catch (error) {
    console.error('更新用途配置失败:', error)
    ElMessage.error('更新失败，请重试')
    return false
  } finally {
    loadingInst.close()
  }
}

const refreshProjectSurveyReports = async (projectId) => {
  if (!projectId) return false
  try {
    const res = await axios.post(`/api/project/${projectId}/refresh-survey-reports`)
    return res.data?.code === 200
  } catch {
    return false
  }
}

const goOpenSourceAudit = (row) => {
  if (!row?.fileRecordId || !row?.projectId) {
    ElMessage.warning('缺少文件或项目信息，无法打开审核')
    return
  }
  router.push({
    name: 'ProjectList',
    query: {
      projectId: String(row.projectId),
      openAuditFileId: String(row.fileRecordId),
      returnTo: 'fields',
    },
  })
}

const createUsageConfigFromUnknown = async (row) => {
  if (!row.projectId) {
    ElMessage.error('缺少项目ID，无法处理')
    return
  }
  const loadingInst = ElLoading.service({ lock: true, text: '正在处理未知用途...' })
  try {
    const { usageCategory, floorAreaType } = categoryMap[row.targetCategory]
    const params = {
      unknownUsageId: row.id,
      usageCategory,
      floorAreaType,
      isRegex: DEFAULT_IS_REGEX,
      priority: 1000,
    }
    const res = await axios.post('/api/usage-config/create-from-unknown', {}, { params })
    if (res.data.code !== 200) {
      ElMessage.error(res.data.msg || '处理失败')
      return
    }
    await refreshProjectSurveyReports(row.projectId)
    ElMessage.success(`已将【${row.usageName}】纳入已知用途映射`)
    await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
  } catch (error) {
    console.error('处理未知用途失败:', error)
    ElMessage.error('处理失败，请重试')
  } finally {
    loadingInst.close()
  }
}

const openAddDialog = () => {
  addDialogVisible.value = true
  resetAddForm()
}

const resetAddForm = () => {
  addFormRef.value?.resetFields()
  Object.assign(addForm, {
    usagePattern: '',
    usageCategory: '',
    floorAreaType: 'BUILDABLE',
    priority: DEFAULT_USAGE_PRIORITY,
    status: '1',
    remark: '',
    collectionName: '',
  })
}

const submitAddForm = async () => {
  if (!addFormRef.value) return
  try {
    await addFormRef.value.validate()
    const payload = {
      ...addForm,
      isRegex: DEFAULT_IS_REGEX,
      floorAreaType: resolveFloorAreaTypeByCategory(addForm.usageCategory),
    }
    const ok = await addUsageConfig(payload)
    if (!ok) return
    addDialogVisible.value = false
    ElMessage.success('新增成功')
    await fetchUsageConfigList()
  } catch {
    ElMessage.warning('请完善必填项后提交')
  }
}

const openEditDialog = (row) => {
  editDialogVisible.value = true
  Object.assign(editForm, {
    id: row.id,
    usagePattern: row.usagePattern,
    usageCategory: row.usageCategory,
    floorAreaType: resolveFloorAreaTypeByCategory(row.usageCategory),
    priority: Number(row.priority),
    status: String(row.status),
    remark: row.remark || '',
    collectionName: row.collectionName || '',
  })
}

const resetEditForm = () => {
  editFormRef.value?.resetFields()
  Object.assign(editForm, {
    id: '',
    usagePattern: '',
    usageCategory: '',
    floorAreaType: 'BUILDABLE',
    priority: DEFAULT_USAGE_PRIORITY,
    status: '1',
    remark: '',
    collectionName: '',
  })
}

const submitEditForm = async () => {
  if (!editFormRef.value || !editForm.id) return
  try {
    await editFormRef.value.validate()
    const payload = {
      ...editForm,
      isRegex: DEFAULT_IS_REGEX,
      floorAreaType: resolveFloorAreaTypeByCategory(editForm.usageCategory),
    }
    const ok = await updateUsageConfig(editForm.id, payload)
    if (!ok) return
    editDialogVisible.value = false
    ElMessage.success('更新成功')
    await fetchUsageConfigList()
  } catch {
    ElMessage.warning('请完善必填项后提交')
  }
}

const handleRefresh = async () => {
  await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
  ElMessage.success('已同步最新配置')
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确认删除该映射？', '删除确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await axios.delete(`/api/usage-config/${row.id}`)
    if (res.data.code !== 200) {
      ElMessage.error(res.data.msg || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    await fetchUsageConfigList()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用途配置失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

const saveSpecialConfig = async (row) => {
  if (!row.targetCategory) {
    ElMessage.warning('请先选择归属类别')
    return
  }
  if (!categoryMap[row.targetCategory]) {
    ElMessage.error('归属类别无效，请重新选择')
    return
  }
  await createUsageConfigFromUnknown(row)
}

onMounted(async () => {
  await Promise.all([fetchUsageConfigList(), fetchUnknownUsageList()])
})

onActivated(() => {
  fetchUnknownUsageList()
})
</script>

<style scoped>
.field-mgmt-container {
  padding: 12px 16px;
  background: #f5f7fa;
  height: calc(100vh - 120px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.table-toolbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.biz-btn {
  min-width: 104px;
  height: 36px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
}

.section-card {
  margin-bottom: 0;
  border-radius: 16px;
  border: 1px solid var(--home-soft-border, #dbe4ef);
  overflow: hidden;
  box-shadow: var(--home-soft-shadow, 0 14px 36px -24px rgba(15, 23, 42, 0.2));
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(219, 228, 239, 0.9);
  background: linear-gradient(
    180deg,
    var(--home-header-grad-start, #f8fbff) 0%,
    var(--home-header-grad-end, #f1f6fc) 100%
  );
}

.table-toolbar .title {
  font-size: 17px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.2px;
}

.table-toolbar__main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.table-search {
  width: min(320px, 100%);
  flex: 1;
  max-width: 360px;
}

.table-toolbar .count {
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
}

.table-container {
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.7) 0%, rgba(241, 245, 249, 0.55) 100%);
  flex: 1;
  min-height: 0;
}

.field-table-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

:deep(.el-card__body) {
  padding: 0;
  overflow: hidden;
}

:deep(.el-table .el-table__body-wrapper) {
  overflow-y: auto;
}

:deep(.el-table__cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unknown-source-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  line-height: 1.45;
}

.unknown-source-line {
  font-size: 14px;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unknown-source-empty {
  color: #94a3b8;
  font-size: 15px;
}
</style>
