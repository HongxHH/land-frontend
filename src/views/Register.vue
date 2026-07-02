<template>
  <div class="register-container">
    <el-card class="register-card" shadow="always">
      <template #header>
        <div class="card-header">
          <div class="logo-text">用户注册</div>
          <div class="sub">注册账号默认为「普通用户」，管理员等类型由超级管理员在后台分配</div>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="0" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名（3-20 位字母数字下划线）" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（6-20 位）"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="password2">
          <el-input
            v-model="form.password2"
            type="password"
            placeholder="确认密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-form-item prop="realName">
          <el-input v-model="form.realName" placeholder="真实姓名" :prefix-icon="UserFilled" />
        </el-form-item>
        <el-form-item prop="phone">
          <el-input v-model="form.phone" placeholder="手机号（可选）" :prefix-icon="Iphone" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱（可选）" :prefix-icon="Message" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="submit-btn" :loading="loading" @click="submit">
            {{ loading ? '提交中...' : '注册' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer-links">
        <router-link to="/login">已有账号？去登录</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, UserFilled, Iphone, Message } from '@element-plus/icons-vue'
import { registerUser } from '@/services/user.service'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  password2: '',
  realName: '',
  phone: '',
  email: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度 3-20', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '仅字母、数字、下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度 6-20', trigger: 'blur' }
  ],
  password2: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_r, v, cb) => {
        if (v !== form.password) cb(new Error('两次密码不一致'))
        else cb()
      },
      trigger: 'blur'
    }
  ],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  phone: [
    {
      validator: (_r, v, cb) => {
        const s = String(v || '').trim()
        if (!s) return cb()
        if (!/^1[3-9]\d{9}$/.test(s)) cb(new Error('手机号格式不正确'))
        else cb()
      },
      trigger: 'blur'
    }
  ],
  email: [
    {
      validator: (_r, v, cb) => {
        const s = String(v || '').trim()
        if (!s) return cb()
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s)) cb(new Error('邮箱格式不正确'))
        else cb()
      },
      trigger: 'blur'
    }
  ]
}

const submit = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    const payload = {
      username: form.username.trim(),
      password: form.password,
      realName: form.realName.trim(),
      phone: String(form.phone || '').trim(),
      email: String(form.email || '').trim()
    }
    const data = await registerUser(payload)
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '注册失败')
      return
    }
    ElMessage.success(data.msg || '注册成功')
    router.push('/login')
  } catch (e) {
    ElMessage.error(e.response?.data?.msg || e.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: linear-gradient(to bottom right, #2c3e50, #4ca1af);
}
.register-card {
  width: 100%;
  max-width: 440px;
  border-radius: 12px;
}
.card-header {
  text-align: center;
}
.logo-text {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
}
.sub {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.submit-btn {
  width: 100%;
  font-weight: bold;
}
.footer-links {
  text-align: center;
  font-size: 14px;
}
.footer-links a {
  color: #409eff;
  text-decoration: none;
}
.footer-links a:hover {
  text-decoration: underline;
}
</style>
