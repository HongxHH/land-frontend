<template>
  <el-dialog
    v-model="visible"
    class="app-form-dialog user-profile-dialog"
    title="个人信息"
    width="520px"
    destroy-on-close
    @open="onOpen"
  >
    <el-form ref="formRef" v-loading="loading" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="用户名">
        <el-input :model-value="profile.username" disabled />
      </el-form-item>
      <el-form-item label="权限类型">
        <el-input :model-value="userTypeLabel(profile.userType)" disabled />
      </el-form-item>
      <el-form-item label="真实姓名" prop="realName">
        <el-input
          v-model="form.realName"
          placeholder="请输入真实姓名"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" placeholder="手机号（可选）" maxlength="11" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" placeholder="邮箱（可选）" maxlength="100" />
      </el-form-item>
      <el-form-item label="最后登录">
        <el-input :model-value="formatTime(profile.lastLogin)" disabled />
      </el-form-item>

      <el-divider content-position="left">修改密码（可选）</el-divider>

      <el-form-item label="原密码" prop="oldPassword">
        <el-input
          v-model="form.oldPassword"
          type="password"
          placeholder="不修改密码请留空"
          show-password
          autocomplete="current-password"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          v-model="form.newPassword"
          type="password"
          placeholder="6-20 位，留空表示不修改"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="newPassword2">
        <el-input
          v-model="form.newPassword2"
          type="password"
          placeholder="再次输入新密码"
          show-password
          autocomplete="new-password"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { userTypeLabel } from '@/constants/userTypes'
import { fetchCurrentUser, updateProfile } from '@/services/user.service'

const visible = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved'])

const formRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const profile = ref({})

const form = reactive({
  realName: '',
  phone: '',
  email: '',
  oldPassword: '',
  newPassword: '',
  newPassword2: '',
})

const rules = computed(() => ({
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    {
      validator: (_r, v, cb) => {
        const s = String(v || '').trim()
        if (!s) return cb()
        if (!/^1[3-9]\d{9}$/.test(s)) cb(new Error('手机号格式不正确'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  email: [
    {
      validator: (_r, v, cb) => {
        const s = String(v || '').trim()
        if (!s) return cb()
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s))
          cb(new Error('邮箱格式不正确'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  oldPassword: [
    {
      validator: (_r, v, cb) => {
        if (String(form.newPassword || '').trim() && !String(v || '').trim()) {
          cb(new Error('修改密码请输入原密码'))
        } else cb()
      },
      trigger: 'blur',
    },
  ],
  newPassword: [
    {
      validator: (_r, v, cb) => {
        const s = String(v || '').trim()
        if (!s) return cb()
        if (s.length < 6 || s.length > 20) cb(new Error('新密码长度 6-20 位'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  newPassword2: [
    {
      validator: (_r, v, cb) => {
        const np = String(form.newPassword || '').trim()
        if (!np) return cb()
        if (String(v || '').trim() !== np) cb(new Error('两次密码不一致'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}))

function formatTime(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'string') return v.replace('T', ' ').slice(0, 19)
  return String(v)
}

function resetForm(data) {
  form.realName = data?.realName || ''
  form.phone = data?.phone || ''
  form.email = data?.email || ''
  form.oldPassword = ''
  form.newPassword = ''
  form.newPassword2 = ''
}

async function onOpen() {
  loading.value = true
  try {
    const data = await fetchCurrentUser()
    if (Number(data?.code) !== 200 || !data?.data) {
      ElMessage.error(data?.msg || '加载个人信息失败')
      visible.value = false
      return
    }
    profile.value = data.data
    resetForm(data.data)
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '加载个人信息失败')
    visible.value = false
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const payload = {
    realName: form.realName.trim(),
    phone: String(form.phone || '').trim(),
    email: String(form.email || '').trim(),
  }
  const newPassword = String(form.newPassword || '').trim()
  if (newPassword) {
    payload.oldPassword = form.oldPassword
    payload.newPassword = newPassword
  }

  submitting.value = true
  try {
    const data = await updateProfile(payload)
    if (Number(data?.code) !== 200) {
      ElMessage.error(data?.msg || '保存失败')
      return
    }
    ElMessage.success(data.msg || '保存成功')
    profile.value = data.data || profile.value
    resetForm(profile.value)
    emit('saved', profile.value)
    visible.value = false
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>
