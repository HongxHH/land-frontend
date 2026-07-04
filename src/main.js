import '@/utils/axios-auth'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
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

app.use(router)

app.mount('#app')
