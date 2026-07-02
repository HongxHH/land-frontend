<template>
  <el-dialog v-model="visible" title="新建文件夹" width="420px" @closed="resetForm">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" @submit.prevent>
      <el-form-item label="名称" prop="name">
        <el-input
          v-model.trim="form.name"
          maxlength="30"
          show-word-limit
          placeholder="例如：现场图片"
          clearable
          @keydown.enter.prevent
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button native-type="button" @click="visible = false">取消</el-button>
      <el-button native-type="button" type="primary" :loading="loading" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createProjectArchive } from '@/services/file.service'

const visible = defineModel({ type: Boolean, default: false })

const props = defineProps({
  projectId: { type: [String, Number], default: '' }
})

const emit = defineEmits(['created'])

const formRef = ref(null)
const loading = ref(false)
const form = ref({ name: '' })

const rules = {
  name: [
    { required: true, message: '请输入归档夹名称', trigger: 'blur' },
    { min: 2, max: 30, message: '名称长度需在 2 到 30 个字符', trigger: 'blur' }
  ]
}

const resetForm = () => {
  formRef.value?.resetFields()
  form.value = { name: '' }
}

const submit = async () => {
  if (!formRef.value || !props.projectId) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const res = await createProjectArchive({
      projectId: Number(props.projectId),
      name: form.value.name
    })
    if (res.data?.code === 200) {
      ElMessage.success(res.data?.msg || '归档夹创建成功')
      visible.value = false
      emit('created')
    } else {
      ElMessage.warning(res.data?.msg || '归档夹创建失败')
    }
  } catch (error) {
    console.error('创建归档夹失败:', error)
    ElMessage.error('创建归档夹失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>
