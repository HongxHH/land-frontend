<template>
  <ProjectTabHero
    eyebrow="房产实测汇总"
    :icon="DataAnalysis"
    stat-grid-label="实测报告统计"
    actions-label="汇总表操作"
    stat-layout="quad"
    :stats="heroStats"
  >
    <template #title>
      <div class="project-tab-hero__title-row">
        <h2
          class="project-tab-hero__title"
          :title="`${currentProjectInfo.name || '请选择项目'} · 房产实测信息汇总表`"
        >
          <span class="project-tab-hero__project">{{
            currentProjectInfo.name || '请选择项目'
          }}</span>
        </h2>
        <div class="project-tab-hero__search" role="search" aria-label="汇总表内容搜索">
          <el-input
            v-model="searchKeywordModel"
            class="project-tab-hero__search-input"
            size="small"
            clearable
            placeholder="搜索本表…"
            :prefix-icon="Search"
          />
          <span
            v-if="String(searchKeywordModel || '').trim()"
            class="project-tab-hero__search-hint"
            aria-live="polite"
          >
            {{ searchMatchCount }}/{{ searchTotalCount }}
          </span>
        </div>
      </div>
    </template>

    <template #actions>
      <div class="project-tab-hero__actions-row">
        <el-button
          class="project-tab-hero__btn project-tab-hero__btn--ghost"
          size="small"
          @click="emit('configure-print-export')"
        >
          <el-icon><Printer /></el-icon>
          打印与导出
        </el-button>
        <el-tooltip
          content="重新拉取已解析实测报告；若刚在归档页解析完文件，点此更新汇总表"
          placement="bottom"
        >
          <el-button
            class="project-tab-hero__btn"
            type="primary"
            size="small"
            :icon="Refresh"
            :loading="parsedRefreshLoading"
            @click="emit('refresh-parsed')"
          >
            刷新文件列表
          </el-button>
        </el-tooltip>
      </div>
    </template>
  </ProjectTabHero>
</template>

<script setup>
import { computed } from 'vue'
import {
  Refresh,
  DataAnalysis,
  Upload,
  CircleCheck,
  Medal,
  Warning,
  Printer,
  Search,
} from '@element-plus/icons-vue'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'

const props = defineProps({
  currentProjectInfo: { type: Object, required: true },
  surveyStats: { type: Object, required: true },
  parsedRefreshLoading: { type: Boolean, default: false },
  searchMatchCount: { type: Number, default: 0 },
  searchTotalCount: { type: Number, default: 0 },
})

const searchKeywordModel = defineModel('searchKeyword', { type: String, default: '' })

const emit = defineEmits(['refresh-parsed', 'configure-print-export'])

const heroStats = computed(() => [
  { variant: 'slate', icon: Upload, value: props.surveyStats.total, unit: '份', label: '已上传' },
  {
    variant: 'blue',
    icon: CircleCheck,
    value: props.surveyStats.success,
    unit: '份',
    label: '解析成功',
  },
  {
    variant: 'teal',
    icon: Medal,
    value: props.surveyStats.verified,
    unit: '份',
    label: '校验通过',
  },
  {
    variant: 'rose',
    icon: Warning,
    value: props.surveyStats.unverified,
    unit: '份',
    valueEmphasis: true,
    label: '校验不通过',
  },
])
</script>
