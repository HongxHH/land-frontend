<template>
  <div>
    <el-table
      :data="fileTableData"
      style="width: 100%"
      class="custom-table"
      :header-cell-style="{ background: '#F5F7FA', color: '#606266', height: '50px' }"
      :row-class-name="tableRowClassName"
      @selection-change="(rows) => $emit('selection-change', rows)"
      highlight-current-row="false"
      max-height="800px"
    >
      <el-table-column type="selection" width="120" align="center" />
      <el-table-column label="预览" width="120" align="center">
        <template #default="{ row }">
          <div @click.stop style="display: flex; justify-content: center">
            <el-image
              style="width: 200px; height: 60px; border-radius: 6px; border: 1px solid #e4e7ed"
              :src="row.thumbnailUrl"
              :preview-src-list="[row.thumbnailUrl]"
              fit="cover"
              :preview-teleported="true"
              :hide-on-click-modal="true"
              preview-z-index="99999"
            >
              <template #error>
                <div
                  class="image-slot"
                  style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    color: #909399;
                  "
                >
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="name" label="文件名" min-width="200">
        <template #default="{ row }">
          <div class="file-name-cell">
            <span style="font-weight: 600; font-size: 15px; color: #303133">{{ row.name }}</span>
            <span v-if="row.phase" style="font-size: 12px; color: #999; margin-top: 4px"
              >第 {{ row.phase }} 期</span
            >
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="uploadTime" label="上传时间" width="180" align="center">
        <template #default="{ row }">
          <span style="color: #606266; font-size: 13px">{{ row.uploadTime }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="type" label="文件类型" width="400">
        <template #default="{ row }">
          <el-tag
            :color="row.type === 'contract' ? '#FFF0F0' : '#F0F9EB'"
            :style="{
              color: row.type === 'contract' ? '#F56C6C' : '#67C23A',
              border: '1px solid ' + (row.type === 'contract' ? '#FAB6B6' : '#b3e19d'),
            }"
            effect="light"
          >
            {{ row.type === 'contract' ? '合同文件' : '实测报告' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="160" align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.status === 'PARSE_FAIL'"
            :content="row.errorMessage || '解析发生未知错误'"
            placement="top"
          >
            <el-tag :type="getFileStateTagType(row.status)" size="small" effect="light">
              {{
                statusMap[row.status]?.text ||
                getFileStateLabel(row.status, {
                  fileContextType: row.fileContextType,
                  autoParseQueuedAt: row.autoParseQueuedAt,
                })
              }}
            </el-tag>
          </el-tooltip>
          <el-tag v-else :type="getFileStateTagType(row.status)" size="small" effect="light">
            {{
              statusMap[row.status]?.text ||
              getFileStateLabel(row.status, {
                fileContextType: row.fileContextType,
                autoParseQueuedAt: row.autoParseQueuedAt,
              })
            }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="400" align="right" header-align="center">
        <template #default="{ row }">
          <el-space :size="75">
            <el-button
              v-if="['PENDING', 'PARSING'].includes(row.status)"
              link
              type="warning"
              @click="$emit('cancel-processing', row)"
            >
              取消解析
            </el-button>
            <el-button
              v-if="['WAITING_PARSE', 'PARSE_FAIL'].includes(row.status)"
              link
              type="primary"
              @click="$emit('start-processing', row)"
            >
              {{ row.status === 'PARSE_FAIL' ? '重试解析' : '开始解析' }}
            </el-button>
            <el-button
              v-if="row.status === 'PARSE_COMPLETE'"
              link
              type="primary"
              @click="$emit('start-processing', row)"
            >
              重新解析
            </el-button>
            <el-button
              v-if="
                ['PARSE_COMPLETE', 'UNPARSEABLE', 'AUDITING', 'AUDIT_FAIL'].includes(row.status)
              "
              color="#A0C4FF"
              size="small"
              round
              style="color: white"
              @click="$emit('open-calibration', row)"
            >
              <el-icon style="margin-right: 4px"><EditPen /></el-icon>
              {{ row.status === 'UNPARSEABLE' ? '人工校对' : '审核' }}
            </el-button>
            <el-button
              v-if="row.status === 'AUDIT_PASS'"
              link
              type="success"
              @click="$emit('open-calibration', row)"
            >
              查看详情
            </el-button>
            <el-popconfirm
              title="确定删除该文件吗?"
              @confirm="$emit('delete-file', row)"
              confirm-button-type="danger"
            >
              <template #reference
                ><el-button link type="danger" icon="Delete"></el-button
              ></template>
            </el-popconfirm>
          </el-space>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 20px; text-align: right">
      <el-pagination
        @size-change="(val) => $emit('size-change', val)"
        @current-change="(val) => $emit('current-change', val)"
        :current-page="currentPage"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { EditPen, Picture } from '@element-plus/icons-vue'
import { getFileStateLabel, getFileStateTagType } from '@/utils/fileStatePresent.js'

defineProps({
  fileTableData: {
    type: Array,
    default: () => [],
  },
  statusMap: {
    type: Object,
    default: () => ({}),
  },
  tableRowClassName: {
    type: Function,
    required: true,
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 20,
  },
  total: {
    type: Number,
    default: 0,
  },
})

defineEmits([
  'selection-change',
  'cancel-processing',
  'start-processing',
  'open-calibration',
  'delete-file',
  'size-change',
  'current-change',
])
</script>
