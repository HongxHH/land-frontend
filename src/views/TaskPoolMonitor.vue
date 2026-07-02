<template>
  <div class="task-pool-monitor admin-mgmt-page">
    <el-card class="monitor-shell" shadow="never">
      <header class="monitor-header">
        <div class="monitor-header__main">
          <div class="monitor-header__icon" aria-hidden="true">
            <el-icon><Cpu /></el-icon>
          </div>
          <div class="monitor-header__text">
            <h1 class="monitor-header__title">任务线程池监控</h1>
            <p class="monitor-header__subtitle">
              解析任务队列、线程池并发与 JVM / GPU 资源采样 · 每 5 秒自动刷新
            </p>
          </div>
        </div>
        <div class="monitor-header__badge">
          <span class="monitor-header__badge-dot" />
          开发人员专用
        </div>
      </header>

      <div class="monitor-grid">
        <section class="monitor-grid__side">
          <TaskPoolStatusPanel layout="page" />
        </section>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Cpu } from '@element-plus/icons-vue'
import TaskPoolStatusPanel from '@/components/layout/TaskPoolStatusPanel.vue'
</script>

<style scoped>
.task-pool-monitor {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.monitor-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #d7dde6;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fd 100%);
}

.monitor-shell :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 16px 18px 18px;
  gap: 14px;
}

.monitor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
}

.monitor-header__main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.monitor-header__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
  background: linear-gradient(145deg, rgba(240, 253, 250, 0.95) 0%, rgba(204, 251, 241, 0.55) 100%);
  border: 1px solid rgba(13, 148, 136, 0.28);
  box-shadow: 0 10px 24px -18px rgba(13, 148, 136, 0.45);
  flex-shrink: 0;
}

.monitor-header__icon :deep(.el-icon) {
  font-size: 24px;
}

.monitor-header__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #0f172a;
}

.monitor-header__subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  max-width: 56ch;
}

.monitor-header__badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(217, 119, 6, 0.35);
  background: rgba(255, 251, 235, 0.92);
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.monitor-header__badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d97706;
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.15);
}

.monitor-grid {
  flex: 1;
  min-height: 0;
  display: flex;
}

.monitor-grid__side {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
}

.monitor-grid__side :deep(.task-pool-panel) {
  width: 100%;
}

@media (max-width: 960px) {
  .monitor-header {
    flex-direction: column;
  }

  .monitor-header__badge {
    align-self: flex-start;
  }
}
</style>
