<template>
  <el-dialog v-model="visible" title="合同信息编辑" width="700px" :close-on-click-modal="false">
    <el-form :ref="setFormRef" :model="form" :rules="rules" label-width="120px">
      <el-form-item label="合同编号" prop="contractNumber">
        <el-input
          :model-value="form.contractNumber"
          placeholder="请输入合同编号"
          style="width: 100%"
          @update:model-value="setFormField('contractNumber', $event)"
        />
      </el-form-item>
      <el-form-item label="出让方" prop="transferor">
        <el-input
          :model-value="form.transferor"
          placeholder="请输入出让方（土地管理部门）"
          style="width: 100%"
          @update:model-value="setFormField('transferor', $event)"
        />
      </el-form-item>
      <el-form-item label="受让方" prop="transferee">
        <el-input
          :model-value="form.transferee"
          placeholder="请输入受让方（开发商）"
          style="width: 100%"
          @update:model-value="setFormField('transferee', $event)"
        />
      </el-form-item>
      <el-form-item label="合同总面积(㎡)" prop="totalArea">
        <el-input-number
          :model-value="form.totalArea"
          placeholder="请输入总面积"
          :precision="2"
          :min="0"
          style="width: 100%"
          @update:model-value="setFormField('totalArea', $event)"
        />
      </el-form-item>
      <el-form-item label="规划用途" prop="plannedUse">
        <el-select
          :model-value="form.plannedUse"
          placeholder="请选择规划用途"
          clearable
          style="width: 100%"
          @update:model-value="setFormField('plannedUse', $event)"
        >
          <el-option label="住宅" value="住宅" />
          <el-option label="商业" value="商业" />
          <el-option label="办公" value="办公" />
          <el-option label="商住混合" value="商住混合" />
          <el-option label="其他" value="其他" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input
          :model-value="form.remark"
          type="textarea"
          rows="3"
          placeholder="请输入备注信息"
          style="width: 100%"
          @update:model-value="setFormField('remark', $event)"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="emit('submit')" :loading="loading">确认保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { createFormFieldPatcher } from '@/utils/propFormBridge.js'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  form: {
    type: Object,
    required: true,
  },
  rules: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  setFormRef: {
    type: Function,
    default: () => {},
  },
})

const emit = defineEmits(['update:modelValue', 'update:form', 'submit'])

const setFormField = createFormFieldPatcher(props, emit, 'form')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>
