<template>
  <div class="project-edit-panel workspace-ui-scale admin-mgmt-page">
    <div class="project-edit-shell">
      <header class="panel-header">
        <div class="panel-header-text">
          <h3>项目信息更新</h3>
          <p>维护当前项目基础信息</p>
        </div>
      </header>

      <el-form
        :ref="setFormRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="project-edit-form"
      >
        <el-form-item prop="id" class="hidden-item">
          <span>{{ form.id }}</span>
        </el-form-item>

        <div class="form-block">
          <div class="block-title">基础信息</div>
          <div class="form-grid">
            <el-form-item label="项目名称" prop="projectName">
              <el-input
                :model-value="form.projectName"
                placeholder="请输入项目名称（如：XX住宅小区项目）"
                clearable
                @update:model-value="setFormField('projectName', $event)"
              />
            </el-form-item>

            <el-form-item label="项目时间" prop="projectTime">
              <el-date-picker
                :model-value="form.projectTime"
                type="date"
                placeholder="请选择项目时间"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
                clearable
                @update:model-value="setFormField('projectTime', $event)"
              />
            </el-form-item>

          </div>
        </div>

        <div class="form-actions">
          <el-button class="save-btn" type="primary" :loading="loading" @click="emit('submit')">保存修改</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  rules: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  setFormRef: {
    type: Function,
    default: () => {}
  }
})

const emit = defineEmits(['update:form', 'submit'])

const setFormField = createFormFieldPatcher(props, emit, 'form')
</script>

<style scoped>
/* 外层仅占位，内容区收窄居中，避免字段在宽屏上被拉得过扁 */
.project-edit-panel {
  padding: 4px 0 8px;
}

.project-edit-shell {
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.panel-header {
  margin-bottom: 16px;
  padding: 0 2px 14px;
  border-bottom: 1px solid #e8eef5;
}

.panel-header-text h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #1a2332;
}

.panel-header-text p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.hidden-item {
  display: none;
}

.form-block {
  margin-bottom: 14px;
  padding: 14px 16px 6px;
  border-radius: 10px;
  background: #fafbfd;
  border: 1px solid #e9eef4;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.block-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #475569;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #3b82f6;
  line-height: 1.2;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
  align-items: start;
}

.form-actions {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e8eef5;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.save-btn.el-button) {
  min-width: 104px;
  height: 36px;
  border-radius: 8px;
  font-weight: 600;
}

:deep(.project-edit-form .el-form-item) {
  margin-bottom: 12px;
}

:deep(.project-edit-form .el-form-item__label) {
  line-height: 1.35;
  margin-bottom: 6px;
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

:deep(.project-edit-form .el-input__wrapper),
:deep(.project-edit-form .el-textarea__inner) {
  border-radius: 8px;
}

:deep(.project-edit-form .el-select) {
  width: 100%;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    justify-content: stretch;
  }

  :deep(.save-btn.el-button) {
    flex: 1;
    min-width: 0;
  }
}
</style>
