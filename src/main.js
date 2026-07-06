import '@/utils/axios-auth'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import logger from '@/utils/logger'
import { getLastTraceId } from '@/utils/axios-auth'
import '@/styles/element-plus-imperative.js'
import '@/styles/app-button-system.css'
import '@/styles/audit-split-layout.css'
import '@/styles/project-tab-tables.css'
import '@/styles/admin-mgmt-page.css'
import '@/styles/workspace-ui-scale.css'
import '@/styles/workspace-tab-layout.css'
import '@/styles/project-home-modern.css'
import '@/styles/app-form-dialog.css'

const app = createApp(App)

app.config.errorHandler = (error, instance, info) => {
  logger.error('Vue 运行时错误', {
    traceId: getLastTraceId(),
    route: router.currentRoute.value?.fullPath,
    info,
    component: instance?.$options?.name || instance?.$.type?.name || 'anonymous',
  }, error)
}

window.addEventListener('unhandledrejection', (event) => {
  logger.error('未处理的 Promise 拒绝', {
    traceId: getLastTraceId(),
    route: router.currentRoute.value?.fullPath,
  }, event.reason)
})

app.use(router)

app.mount('#app')
