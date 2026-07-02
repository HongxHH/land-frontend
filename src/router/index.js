import axios from 'axios'
import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/utils/auth-token'
import { getUserSession, setUserSession } from '@/utils/auth-session.js'
import { isRouteAccessDenied } from '@/router/routeAccess.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'projects',
        name: 'ProjectList',
        component: () => import('../views/ProjectList.vue'),
        meta: { title: '项目信息', keepAlive: true }
      },
      {
        path: 'upload',
        name: 'FileUpload',
        component: () => import('../views/FileUpload.vue'),
        meta: { title: '项目/文件上传', keepAlive: true }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/UserList.vue'),
        meta: { title: '用户权限管理', requiresUserManagement: true }
      },
      {
        path: 'fields',
        name: 'FieldManagement',
        component: () => import('../views/FieldManagement.vue'),
        meta: { title: '土地类型管理' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const PUBLIC_ROUTE_NAMES = ['Login', 'Register']

async function ensureUserSessionHydrated() {
  if (!isLoggedIn() || getUserSession()?.userType) return
  try {
    const { data } = await axios.get('/api/auth/me')
    if (Number(data?.code) === 200 && data?.data) {
      setUserSession(data.data)
    }
  } catch {
    /* 由接口 401 拦截器处理未登录 */
  }
}

// 路由守卫：登录态 + 用户管理页权限（与后端 @SaCheckRole 对齐）
router.beforeEach(async (to, from, next) => {
  if (!PUBLIC_ROUTE_NAMES.includes(to.name) && !isLoggedIn()) {
    next({ name: 'Login' })
    return
  }
  if (!PUBLIC_ROUTE_NAMES.includes(to.name)) {
    await ensureUserSessionHydrated()
    const denied = isRouteAccessDenied(to)
    if (denied) {
      next(denied)
      return
    }
  }
  next()
})

export default router
