<template>
  <transition name="el-zoom-in-top">
    <div v-if="unknownUsages.length > 0" class="policy-card no-print">
      <div class="policy-head">
        <div class="head-left">
          <el-icon color="#e65f4d" size="18"><WarningFilled /></el-icon>
          <span class="title">检测到 {{ distinctUsageClassCount }} 类待确认用途，请处理</span>
        </div>
      </div>

      <UnknownUsagePolicyList
        :rows="unknownUsages"
        :project-id="projectId"
        show-audit-button
        @open-source-audit="(payload) => $emit('open-source-audit', payload)"
      />
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { WarningFilled } from '@element-plus/icons-vue'
import UnknownUsagePolicyList from '@/components/shared/UnknownUsagePolicyList.vue'

const props = defineProps({
  unknownUsages: { type: Array, default: () => [] },
  projectId: { type: [String, Number], default: '' },
})

defineEmits(['open-source-audit'])

const distinctUsageClassCount = computed(() => {
  const list = props.unknownUsages || []
  const names = new Set(
    list.map((r) => (r && r.usageName != null ? String(r.usageName).trim() : '')).filter(Boolean)
  )
  return names.size
})
</script>

<style scoped>
.policy-card {
  margin-bottom: 12px;
  border: 1px solid #f2c4be;
  background: linear-gradient(180deg, #fff5f4 0%, #fffaf9 100%);
  border-radius: 10px;
  padding: 12px;
}

.policy-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.head-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.title {
  color: #7f1d1d;
  font-weight: 600;
  font-size: 14px;
  line-height: 1.35;
}
</style>
