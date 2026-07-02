<template>
  <el-card class="task-card" shadow="never" v-loading="tableLoading">
    <el-empty v-if="!currentProject" description="请选择或者创建一个项目" />

    <div>
      <FileFilterToolbar
        :selected-rows-length="selectedRowsLength"
        :batch-loading="batchLoading"
        :can-batch-parse="canBatchParse"
        :filter-file-name="filterFileName"
        :filter-file-type="filterFileType"
        :filter-status="filterStatus"
        :table-loading="tableLoading"
        @batch-delete="$emit('batch-delete')"
        @batch-parse="$emit('batch-parse')"
        @update:filter-file-name="$emit('update:filter-file-name', $event)"
        @update:filter-file-type="$emit('update:filter-file-type', $event)"
        @update:filter-status="$emit('update:filter-status', $event)"
        @search="$emit('search')"
        @reset="$emit('reset')"
        @refresh="$emit('refresh')"
      />

      <FileTable
        :file-table-data="fileTableData"
        :status-map="statusMap"
        :table-row-class-name="tableRowClassName"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @selection-change="$emit('selection-change', $event)"
        @cancel-processing="$emit('cancel-processing', $event)"
        @start-processing="$emit('start-processing', $event)"
        @open-calibration="$emit('open-calibration', $event)"
        @delete-file="$emit('delete-file', $event)"
        @size-change="$emit('size-change', $event)"
        @current-change="$emit('current-change', $event)"
      />
    </div>
  </el-card>
</template>

<script setup>
import FileFilterToolbar from '@/components/file-upload/FileFilterToolbar.vue'
import FileTable from '@/components/file-upload/FileTable.vue'

defineProps({
  currentProject: { type: [String, Number, null], default: null },
  tableLoading: { type: Boolean, default: false },
  selectedRowsLength: { type: Number, default: 0 },
  batchLoading: { type: Boolean, default: false },
  canBatchParse: { type: Boolean, default: false },
  filterFileName: { type: String, default: '' },
  filterFileType: { type: String, default: '' },
  filterStatus: { type: String, default: '' },
  fileTableData: { type: Array, default: () => [] },
  statusMap: { type: Object, required: true },
  tableRowClassName: { type: Function, required: true },
  currentPage: { type: Number, default: 1 },
  pageSize: { type: Number, default: 10 },
  total: { type: Number, default: 0 }
})

defineEmits([
  'batch-delete',
  'batch-parse',
  'update:filter-file-name',
  'update:filter-file-type',
  'update:filter-status',
  'search',
  'reset',
  'refresh',
  'selection-change',
  'cancel-processing',
  'start-processing',
  'open-calibration',
  'delete-file',
  'size-change',
  'current-change'
])
</script>
