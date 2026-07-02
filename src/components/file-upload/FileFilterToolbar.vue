<template>
  <div style="margin-bottom: 15px; display: flex; gap: 10px; justify-content: space-between;">
    <div style="display: flex; gap: 10px;">
      <el-button
        type="danger"
        icon="Delete"
        @click="$emit('batch-delete')"
        :disabled="selectedRowsLength === 0"
        :loading="batchLoading"
      >
        批量删除
      </el-button>
      <el-button
        type="primary"
        icon="Search"
        @click="$emit('batch-parse')"
        :disabled="!canBatchParse"
        :loading="batchLoading"
      >
        批量解析
      </el-button>
    </div>

    <div style="display: flex; align-items: center; gap: 25px;">
      <el-input
        :model-value="filterFileName"
        placeholder="请输入文件名关键词"
        style="width: 220px;"
        @keyup.enter="$emit('search')"
        @update:model-value="(val) => $emit('update:filterFileName', val)"
        clearable
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <el-select
        :model-value="filterFileType"
        placeholder="文件类型"
        clearable
        style="width: 150px"
        @update:model-value="(val) => $emit('update:filterFileType', val)"
      >
        <el-option label="合同文件" value="CONTRACT" />
        <el-option label="实测报告" value="SURVEY_REPORT" />
        <el-option label="其他文件" value="OTHER" />
      </el-select>

      <el-select
        :model-value="filterStatus"
        placeholder="文件状态"
        clearable
        style="width: 150px"
        @update:model-value="(val) => $emit('update:filterStatus', val)"
      >
        <el-option label="后处理中" value="WAITING_POST_PROCESS" />
        <el-option label="解析失败" value="PARSE_FAIL" />
        <el-option label="解析中" value="PARSING" />
        <el-option label="排队中" value="PENDING" />
        <el-option label="待解析" value="WAITING_PARSE" />
        <el-option label="解析完成" value="PARSE_COMPLETE" />
        <el-option label="待审核" value="UNPARSEABLE" />
      </el-select>

      <el-button type="primary" icon="Search" @click="$emit('search')" style="width: 90px">
        查询
      </el-button>

      <el-button icon="Refresh" @click="$emit('reset')" style="width: 80px">
        重置
      </el-button>
      <el-button icon="Refresh" @click="$emit('refresh')" style="width: 80px; margin-left: 10px;" :loading="tableLoading">
        刷新
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Search } from '@element-plus/icons-vue'

defineProps({
  selectedRowsLength: {
    type: Number,
    default: 0
  },
  batchLoading: {
    type: Boolean,
    default: false
  },
  canBatchParse: {
    type: Boolean,
    default: false
  },
  filterFileName: {
    type: String,
    default: ''
  },
  filterFileType: {
    type: String,
    default: ''
  },
  filterStatus: {
    type: String,
    default: ''
  },
  tableLoading: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'batch-delete',
  'batch-parse',
  'update:filterFileName',
  'update:filterFileType',
  'update:filterStatus',
  'search',
  'reset',
  'refresh'
])
</script>

