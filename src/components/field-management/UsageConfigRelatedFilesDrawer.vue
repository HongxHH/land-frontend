<template>
  <el-drawer
    :model-value="visible"
    :title="drawerTitle"
    size="720px"
    destroy-on-close
    @close="emit('close')"
  >
    <div class="related-files-drawer">
      <div class="related-files-drawer__summary">
        <span>匹配模式：{{ config?.usagePattern || '-' }}</span>
        <span>共 {{ summary.totalFiles }} 个文件 / {{ summary.totalMatchedRooms }} 条户室</span>
      </div>

      <div class="related-files-drawer__toolbar">
        <el-input
          v-model="keywordModel"
          clearable
          placeholder="搜索项目名或文件名"
          :prefix-icon="Search"
          @keyup.enter="emit('search')"
          @clear="emit('search')"
        />
        <el-button type="primary" plain :icon="Search" @click="emit('search')">搜索</el-button>
      </div>

      <el-table
        class="related-files-drawer__table"
        :data="records"
        border
        stripe
        v-loading="loading"
        empty-text="暂无文件命中该用途配置"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="projectName" label="项目" min-width="140" show-overflow-tooltip />
        <el-table-column prop="originalName" label="文件名" min-width="180" show-overflow-tooltip />
        <el-table-column label="匹配户室" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip
              v-if="Array.isArray(row.sampleRoomUsages) && row.sampleRoomUsages.length"
              :content="row.sampleRoomUsages.join('、')"
              placement="top"
            >
              <span>{{ row.matchedRoomCount || 0 }}</span>
            </el-tooltip>
            <span v-else>{{ row.matchedRoomCount || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" width="170" align="center">
          <template #default="{ row }">{{ formatTime(row.uploadTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              plain
              :icon="View"
              :disabled="!row.fileRecordId || !row.projectId"
              @click="emit('open-audit', row)"
            >
              打开审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="related-files-drawer__pagination">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :current-page="pagination.current"
          :page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          @current-change="emit('page-change', $event)"
          @size-change="emit('size-change', $event)"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { Search, View } from '@element-plus/icons-vue'

import {
  floorAreaTypeLabel,
  formatUsageCategoryLabel
} from '@/constants/usageCategory.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  config: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  records: { type: Array, default: () => [] },
  keyword: { type: String, default: '' },
  summary: {
    type: Object,
    default: () => ({ totalFiles: 0, totalMatchedRooms: 0 })
  },
  pagination: {
    type: Object,
    default: () => ({ current: 1, size: 10, total: 0, pages: 0 })
  }
})

const emit = defineEmits([
  'close',
  'search',
  'page-change',
  'size-change',
  'open-audit',
  'update:keyword'
])

const keywordModel = computed({
  get: () => props.keyword,
  set: (value) => emit('update:keyword', value)
})

const drawerTitle = computed(() => {
  const pattern = props.config?.usagePattern || '用途配置'
  const category = formatUsageCategoryLabel(props.config?.usageCategory)
  const areaType = floorAreaTypeLabel(props.config?.floorAreaType)
  return `涉及文件 — ${pattern}（${category} / ${areaType}）`
})

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const text = String(timeStr).replace('T', ' ')
  return text.split('.')[0]
}
</script>

<style scoped>
.related-files-drawer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
}

.related-files-drawer__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 13px;
}

.related-files-drawer__toolbar {
  display: flex;
  gap: 10px;
}

.related-files-drawer__toolbar .el-input {
  flex: 1;
}

.related-files-drawer__table {
  flex: 1;
}

.related-files-drawer__pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
