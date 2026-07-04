<template>
  <el-card class="user-card admin-mgmt-page">
    <div class="toolbar admin-mgmt-toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索用户名（模糊）"
        clearable
        class="user-search"
        @keyup.enter="loadList"
      />
      <el-button type="primary" :icon="Search" @click="loadList">查询</el-button>
      <el-button :icon="Refresh" @click="loadList">刷新</el-button>
    </div>

    <el-table v-loading="loading" class="admin-mgmt-table user-list-table" :data="rows" stripe border style="width: 100%">
      <el-table-column prop="id" label="ID" width="90" align="center" header-align="center" />
      <el-table-column prop="username" label="用户名" width="140" align="center" header-align="center" />
      <el-table-column prop="realName" label="姓名" width="120" align="center" header-align="center" />
      <el-table-column label="权限类型" width="1" min-width="160" align="center" header-align="center">
        <template #default="{ row }">
          <el-select
            v-if="showUserTypeEditor(row)"
            :model-value="normalizeUserTypeForSelect(row.userType)"
            class="user-type-select"
            :loading="assigningTypeId === row.id"
            :disabled="assigningTypeId === row.id"
            @update:model-value="(v) => onUserTypeChange(row, v)"
          >
            <el-option
              v-for="opt in userTypeSelectOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-tag v-else :type="tagType(row.userType)" size="small">{{ userTypeLabel(row.userType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机" width="1" min-width="160" align="center" header-align="center" />
      <el-table-column
        prop="email"
        label="邮箱"
        width="1"
        min-width="160"
        align="center"
        header-align="center"
        show-overflow-tooltip
      />
      <el-table-column label="密码" width="150" align="center" header-align="center">
        <template #default="{ row }">
          <div class="user-password-cell">
            <span class="user-password-mask">******</span>
            <el-button
              v-if="canResetUserPassword"
              link
              type="primary"
              size="small"
              @click="openPasswordDialog(row)"
            >
              重置
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center" header-align="center">
        <template #default="{ row }">
          <el-switch
            v-if="canManageUsers"
            :model-value="row.isActive === 1"
            :disabled="togglingId === row.id"
            @change="(v) => onToggleActive(row, v)"
          />
          <el-tag v-else :type="row.isActive === 1 ? 'success' : 'info'" size="small">
            {{ row.isActive === 1 ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后登录" width="170" align="center" header-align="center">
        <template #default="{ row }">
          {{ formatTime(row.lastLogin) }}
        </template>
      </el-table-column>
      <el-table-column v-if="canManageUsers" label="操作" width="120" fixed="right" align="center" header-align="center">
        <template #default="{ row }">
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager admin-mgmt-pager">
      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @current-change="loadList"
        @size-change="loadList"
      />
    </div>

    <el-dialog
      v-model="passwordDialogVisible"
      class="app-form-dialog"
      title="重置用户密码"
      width="440px"
      destroy-on-close
      @closed="resetPasswordForm"
    >
      <p v-if="passwordTarget" class="password-dialog-tip">
        为用户「{{ passwordTarget.username }}」（{{ passwordTarget.realName || '—' }}）设置新密码
      </p>
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="88px">
        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            placeholder="6-20 位"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="password2">
          <el-input
            v-model="passwordForm.password2"
            type="password"
            show-password
            placeholder="再次输入新密码"
            autocomplete="new-password"
            @keyup.enter="submitPasswordReset"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingPassword" @click="submitPasswordReset">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import axios from 'axios'
import { USER_TYPE_OPTIONS, userTypeLabel } from '@/constants/userTypes'
import { setUserSession } from '@/utils/auth-session.js'
import { listUsersPage, updateUserPassword } from '@/services/user.service'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const togglingId = ref(null)
const me = ref(null)
const assigningTypeId = ref(null)
const passwordDialogVisible = ref(false)
const passwordTarget = ref(null)
const passwordFormRef = ref(null)
const savingPassword = ref(false)
const passwordForm = reactive({
  password: '',
  password2: ''
})

const passwordRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度 6-20 位', trigger: 'blur' }
  ],
  password2: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_r, v, cb) => {
        if (v !== passwordForm.password) cb(new Error('两次密码不一致'))
        else cb()
      },
      trigger: 'blur'
    }
  ]
}

/** 以 /api/auth/me 为准，避免 sessionStorage 中 userType 过期导致按钮不显示 */
const isSuperAdmin = computed(() => me.value?.userType === 'SUPER_ADMIN')
const canManageUsers = computed(() => isSuperAdmin.value)
const canResetUserPassword = computed(() => isSuperAdmin.value)
const canAssignUserTypes = computed(() => isSuperAdmin.value)

const userTypeSelectOptions = computed(() => USER_TYPE_OPTIONS)

function showUserTypeEditor(row) {
  if (!canAssignUserTypes.value || !me.value) return false
  if (row.id === me.value.id) return false
  return true
}

function openPasswordDialog(row) {
  passwordTarget.value = row
  resetPasswordForm()
  passwordDialogVisible.value = true
}

function resetPasswordForm() {
  passwordForm.password = ''
  passwordForm.password2 = ''
  passwordFormRef.value?.clearValidate()
}

/** 历史 DEPT_USER、ADMIN 在下拉中与 USER 等价展示 */
function normalizeUserTypeForSelect(userType) {
  return userType === 'DEPT_USER' || userType === 'ADMIN' ? 'USER' : userType
}

function tagType(userType) {
  if (userType === 'SUPER_ADMIN') return 'danger'
  if (userType === 'DEVELOPER') return 'success'
  return 'info'
}

function formatTime(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') return v.replace('T', ' ').slice(0, 19)
  return String(v)
}

async function loadList() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    const k = keyword.value.trim()
    if (k) params.username = k
    const data = await listUsersPage(params)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '加载失败')
      return
    }
    rows.value = Array.isArray(data.data) ? data.data : []
    total.value = typeof data.total === 'number' ? data.total : 0
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function onToggleActive(row, active) {
  togglingId.value = row.id
  try {
    const url = active ? `/api/user/enable/${row.id}` : `/api/user/disable/${row.id}`
    const { data } = await axios.put(url)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '操作失败')
      return
    }
    row.isActive = active ? 1 : 0
    ElMessage.success(data.msg || '已更新')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '操作失败')
  } finally {
    togglingId.value = null
  }
}

async function loadMe() {
  try {
    const { data } = await axios.get('/api/auth/me')
    if (Number(data.code) !== 200) {
      me.value = null
      return
    }
    me.value = data.data || null
    if (me.value) setUserSession(me.value)
  } catch {
    me.value = null
  }
}

async function onUserTypeChange(row, newType) {
  if (newType === normalizeUserTypeForSelect(row.userType)) return
  assigningTypeId.value = row.id
  try {
    const { data } = await axios.put(`/api/user/user-type/${row.id}`, { userType: newType })
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '更新失败')
      return
    }
    row.userType = newType
    ElMessage.success(data.msg || '已更新权限类型')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '更新失败')
  } finally {
    assigningTypeId.value = null
  }
}

async function submitPasswordReset() {
  if (!passwordFormRef.value || !passwordTarget.value) return
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }
  try {
    await ElMessageBox.confirm(`确定重置用户「${passwordTarget.value.username}」的密码？`, '确认', {
      type: 'warning'
    })
  } catch {
    return
  }
  savingPassword.value = true
  try {
    const data = await updateUserPassword(passwordTarget.value.id, passwordForm.password)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '密码更新失败')
      return
    }
    ElMessage.success(data.msg || '密码已更新')
    passwordDialogVisible.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '密码更新失败')
  } finally {
    savingPassword.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」？`, '确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    const { data } = await axios.delete(`/api/user/delete/${row.id}`)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '删除失败')
      return
    }
    ElMessage.success(data.msg || '已删除')
    loadList()
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '删除失败')
  }
}

onMounted(async () => {
  await loadMe()
  loadList()
})
</script>

<style scoped>
.user-card {
  border-radius: 12px;
}

.user-card :deep(.el-card__body) {
  padding: 16px 18px 18px;
}

.user-search {
  width: 260px;
}

.toolbar {
  margin-bottom: 16px;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e8eef5;
}

.user-list-table :deep(.user-type-select) {
  width: 160px;
}

.user-password-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.user-password-mask {
  color: #909399;
  letter-spacing: 2px;
}

.password-dialog-tip {
  margin: 0 0 16px;
  color: #606266;
  font-size: 14px;
}

/* 主表固定列总宽：90 + 140 + 120 + 150 + 100 + 170 = 770px，中间三列均分剩余宽度 */
.user-list-table {
  --user-list-fixed-cols-width: 770px;
}

.user-list-table :deep(.el-table__header-wrapper table),
.user-list-table :deep(.el-table__body-wrapper table) {
  table-layout: fixed !important;
  width: 100% !important;
}

.user-list-table :deep(.el-table__header-wrapper colgroup col:nth-child(4)),
.user-list-table :deep(.el-table__header-wrapper colgroup col:nth-child(5)),
.user-list-table :deep(.el-table__header-wrapper colgroup col:nth-child(6)),
.user-list-table :deep(.el-table__body-wrapper colgroup col:nth-child(4)),
.user-list-table :deep(.el-table__body-wrapper colgroup col:nth-child(5)),
.user-list-table :deep(.el-table__body-wrapper colgroup col:nth-child(6)) {
  width: calc((100% - var(--user-list-fixed-cols-width)) / 3) !important;
}

.user-list-table :deep(.el-table__cell .cell) {
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-list-table :deep(.el-table__cell .cell.el-tooltip) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
