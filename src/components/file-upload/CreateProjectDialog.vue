<template>
  <el-dialog
    :model-value="modelValue"
    title="新建测绘归档项目"
    width="500px"
    class="app-form-dialog"
    @update:model-value="(val) => $emit('update:modelValue', val)"
  >
    <el-form :model="newProjectForm" label-position="top">
      <el-form-item label="项目名称">
        <el-input
          :model-value="newProjectForm.projectName"
          placeholder="请输入工程名称"
          @update:model-value="setNewProjectField('projectName', $event)"
        />
      </el-form-item>
      <el-form-item label="项目时间" prop="projectTime">
        <el-date-picker
          :model-value="newProjectForm.projectTime"
          type="date"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          placeholder="请选择业务时间"
          style="width: 100%"
          :locale="locale"
          @update:model-value="setNewProjectField('projectTime', $event)"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="$emit('submit')">立即创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  newProjectForm: {
    type: Object,
    required: true,
  },
  locale: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'update:newProjectForm', 'submit'])

const setNewProjectField = createFormFieldPatcher(props, emit, 'newProjectForm')
</script>
