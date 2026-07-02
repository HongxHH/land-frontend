<template>
  <div class="project-workspace-tab-skeleton" aria-hidden="true">
    <div class="project-workspace-tab-skeleton__tab-bar">
      <el-skeleton animated>
        <template #template>
          <div class="project-workspace-tab-skeleton__tab-items">
            <el-skeleton-item
              v-for="i in 6"
              :key="i"
              variant="text"
              class="project-workspace-tab-skeleton__tab-chip"
            />
          </div>
        </template>
      </el-skeleton>
    </div>
    <el-skeleton animated class="project-workspace-tab-skeleton__body">
      <template #template>
        <el-skeleton-item variant="rect" class="project-workspace-tab-skeleton__hero" />
        <el-skeleton-item variant="rect" class="project-workspace-tab-skeleton__table" />
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.project-workspace-tab-skeleton {
  padding: 8px 4px 16px;
}

.project-workspace-tab-skeleton__tab-bar {
  margin-bottom: 12px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--home-soft-border, #e8edf3);
}

.project-workspace-tab-skeleton__tab-items {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.project-workspace-tab-skeleton__tab-chip {
  width: 96px;
  height: 20px;
}

.project-workspace-tab-skeleton__hero {
  width: 100%;
  height: 88px;
  margin-bottom: 16px;
  border-radius: 10px;
}

.project-workspace-tab-skeleton__table {
  width: 100%;
  min-height: 360px;
  border-radius: 10px;
}
</style>
