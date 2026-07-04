<template>
  <header class="project-tab-hero">
    <div class="project-tab-hero__brand">
      <div
        class="project-tab-hero__icon-wrap"
        :class="{ 'project-tab-hero__icon-wrap--teal': iconTone === 'teal' }"
        aria-hidden="true"
      >
        <el-icon class="project-tab-hero__icon"><component :is="icon" /></el-icon>
      </div>
      <div class="project-tab-hero__titles">
        <span class="project-tab-hero__eyebrow">{{ eyebrow }}</span>
        <slot name="title">
          <h2 class="project-tab-hero__title">{{ title }}</h2>
        </slot>
      </div>
    </div>

    <div
      class="project-tab-hero__stat-grid"
      :class="statGridClass"
      role="group"
      :aria-label="statGridLabel"
    >
      <div
        v-for="(stat, index) in stats"
        :key="`${stat.label}-${index}`"
        class="project-tab-hero__stat-tile"
        :class="`project-tab-hero__stat-tile--${stat.variant || 'slate'}`"
      >
        <div class="project-tab-hero__stat-icon">
          <el-icon>
            <component :is="resolveStatIcon(stat)" />
          </el-icon>
        </div>
        <div
          class="project-tab-hero__stat-text"
          :class="{ 'project-tab-hero__stat-text--wide': stat.pick || stat.wide }"
        >
          <div
            class="project-tab-hero__stat-line"
            :class="{ 'project-tab-hero__stat-line--single': stat.pick }"
          >
            <template v-if="stat.pick">
              <span class="project-tab-hero__stat-pick">{{ stat.pick }}</span>
            </template>
            <template v-else>
              <span
                class="project-tab-hero__stat-value"
                :class="{ 'project-tab-hero__stat-value--emph': stat.valueEmphasis }"
              >
                {{ stat.value }}
              </span>
              <span v-if="stat.unit" class="project-tab-hero__stat-unit">{{ stat.unit }}</span>
            </template>
          </div>
          <span class="project-tab-hero__stat-label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="project-tab-hero__actions" :aria-label="actionsLabel">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { CircleCheck, Files, Warning } from '@element-plus/icons-vue'
import '@/styles/project-tab-hero.css'

const props = defineProps({
  eyebrow: { type: String, required: true },
  title: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Files },
  iconTone: { type: String, default: 'blue' },
  statGridLabel: { type: String, default: '统计' },
  actionsLabel: { type: String, default: '操作' },
  statLayout: { type: String, default: 'double' },
  stats: { type: Array, default: () => [] },
})

const statGridClass = computed(() => {
  if (props.statLayout === 'single') return 'project-tab-hero__stat-grid--single'
  if (props.statLayout === 'quad') return 'project-tab-hero__stat-grid--quad'
  return ''
})

const resolveStatIcon = (stat) => {
  if (stat.status === 'ok') return CircleCheck
  if (stat.status === 'warn') return Warning
  return stat.icon || Files
}
</script>
