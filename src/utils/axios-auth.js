import axios from 'axios'
import { clearAuth, getToken, SA_TOKEN_HEADER_NAME } from '@/utils/auth-token'

function redirectToLogin() {
  clearAuth()
  const path = window.location?.pathname || ''
  if (path.includes('/login') || path.includes('/register')) {
    return
  }
  window.location.href = '/login'
}

axios.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers[SA_TOKEN_HEADER_NAME] = token
  }
  return config
})

axios.interceptors.response.use(
  (response) => {
    const d = response?.data
    if (d && typeof d === 'object' && Number(d.code) === 401) {
      redirectToLogin()
      return Promise.reject(new Error(d.msg || '未登录'))
    }
    return response
  },
  (error) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    if (status === 401 || Number(code) === 401) {
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)
