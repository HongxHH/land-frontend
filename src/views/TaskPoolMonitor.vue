<template>
  <div class="task-pool-monitor admin-mgmt-page">
    <el-card class="monitor-shell" shadow="never">
      <header class="monitor-header">
        <h1 class="monitor-header__title">任务线程池监控</h1>
      </header>
      <TaskPoolStatusPanel />
    </el-card>
  </div>
</template>

<script setup>
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
  border-radius: 10px;
}

.monitor-shell :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 16px 16px;
  gap: 12px;
}

.monitor-header {
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.monitor-header__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}
</style>
