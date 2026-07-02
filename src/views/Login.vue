<template>
  <div class="login-container">
    <el-card class="login-card" shadow="always">
      <template #header>
        <div class="card-header">
          <div class="logo-text">国土房产测绘数据归档系统</div>
        </div>
      </template>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        label-width="0px"
        size="large"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入管理员账号"
            :prefix-icon="User" 
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin" 
          />
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            class="login-btn" 
            :loading="isLoading" 
            @click="handleLogin"
          >
            {{ isLoading ? '登录中...' : '立即登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="tips">
        <span>可使用已注册或管理员创建的账号登录</span>
      </div>
      <div class="footer-links">
        <router-link to="/register">没有账号？立即注册</router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { setToken } from '@/utils/auth-token'
import { setUserSession } from '@/utils/auth-session.js'
import { fetchUnreadStationNotificationsAfterLogin } from '@/services/station-notification.service'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const loginFormRef = ref(null)
const isLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 3, message: '密码长度不能小于3位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  try {
    await loginFormRef.value.validate()
  } catch {
    return
  }
  isLoading.value = true
  try {
    const { data } = await axios.post('/api/auth/login', {
      username: loginForm.username.trim(),
      password: loginForm.password
    })
    if (Number(data.code) !== 200) {
      ElMessage.error(data.msg || '登录失败')
      return
    }
    const token = data.data?.token
    if (!token) {
      ElMessage.error('服务端未返回 token')
      return
    }
    setToken(token)
    sessionStorage.setItem('isAuthenticated', 'true')
    const user = data.data?.user
    if (user?.id != null) {
      sessionStorage.setItem('userId', String(user.id))
    }
    setUserSession(user)
    try {
      await fetchUnreadStationNotificationsAfterLogin()
    } catch {
      /* 未读预热失败不影响登录 */
    }
    ElMessage.success('登录成功')
    router.push('/')
  } catch (e) {
    const msg = e.response?.data?.msg || e.message || '登录失败'
    ElMessage.error(msg)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 保持你刚才截图里那个好看的背景 */
  background: linear-gradient(to bottom right, #2c3e50, #4ca1af); 
}
.login-card { width: 400px; border-radius: 8px; }
.card-header { text-align: center; }
.logo-text { font-size: 20px; font-weight: bold; color: #303133; }
.login-btn { width: 100%; font-weight: bold; }
.tips { text-align: center; font-size: 12px; color: #909399; margin-top: 10px; }
.footer-links { text-align: center; margin-top: 14px; font-size: 14px; }
.footer-links a { color: #409eff; text-decoration: none; }
.footer-links a:hover { text-decoration: underline; }
</style>