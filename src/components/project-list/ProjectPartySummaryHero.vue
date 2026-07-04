<template>
  <ProjectTabHero
    eyebrow="项目方实测汇总"
    title="主表"
    :icon="Document"
    stat-grid-label="项目方汇总主表统计"
    actions-label="主表操作"
    :stats="heroStats"
  >
    <template #actions>
      <el-button
        class="project-tab-hero__btn project-tab-hero__btn--ghost"
        size="small"
        :loading="formsLoading"
        @click="emit('refresh')"
      >
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </template>
  </ProjectTabHero>
</template>

<script setup>
import { computed } from 'vue'
import { Document, Files, Refresh } from '@element-plus/icons-vue'
import ProjectTabHero from '@/components/project-list/ProjectTabHero.vue'

const props = defineProps({
  formTotal: { type: Number, default: 0 },
  activeFileRecordId: { type: String, default: '' },
  activeFormSelectionText: { type: String, default: '' },
  formsLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh'])

const heroStats = computed(() => [
  { variant: 'slate', icon: Files, value: props.formTotal, unit: '条', label: '主表总数' },
  {
    variant: props.activeFileRecordId ? 'teal' : 'amber',
    status: props.activeFileRecordId ? 'ok' : 'warn',
    pick: props.activeFormSelectionText,
    wide: true,
    label: '当前主表',
  },
])
</script>
