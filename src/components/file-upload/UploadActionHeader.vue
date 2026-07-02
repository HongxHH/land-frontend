<template>
  <div class="action-header">
    <div class="project-info">
      <span class="sub-title">当前作业项目</span>
      <div class="project-selector-wrapper">
        <el-select
          :model-value="modelValue"
          size="large"
          class="macaron-select"
          style="width: 320px;"
          placeholder="请输入关键词搜索项目"
          filterable
          clearable
          no-match-text="未找到相关项目"
          @update:model-value="onProjectChange"
        >
          <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>

        <el-button
          type="primary"
          size="large"
          class="create-project-btn"
          @click="$emit('create-project')"
        >
          新建项目
        </el-button>
      </div>
    </div>

    <div class="action-buttons">
      <el-button
        color="#A0C4FF"
        size="large"
        round
        :disabled="!modelValue"
        @click="$emit('open-upload')"
        class="upload-btn-main"
      >
        + 批量上传文件
      </el-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  projectOptions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'create-project', 'open-upload'])

const onProjectChange = (value) => emit('update:modelValue', value)
</script>

<style scoped>
.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 18px 20px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
}

.sub-title {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  padding-right: 2px;
}

.project-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.create-project-btn {
  font-weight: 600;
}

.action-buttons {
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .action-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .project-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .project-selector-wrapper {
    width: 100%;
  }

  .project-selector-wrapper :deep(.el-select) {
    width: 100% !important;
    min-width: 0;
  }
}
</style>
