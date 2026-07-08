<template>
  <div class="summary-panel summary-panel--modern project-tab-panel no-print">
    <SummaryTableHero
      v-model:search-keyword="searchKeyword"
      :current-project-info="currentProjectInfo"
      :survey-stats="surveyStats"
      :parsed-refresh-loading="parsedRefreshLoading"
      :search-match-count="searchMatchCount"
      :search-total-count="(displayTableData || []).length"
      @refresh-parsed="emit('refresh-parsed')"
      @configure-print-export="emit('configure-print-export')"
    />
    <SummaryTableBody
      ref="bodyRef"
      :current-project-info="currentProjectInfo"
      :display-table-data="displayTableData"
      :data-loading="dataLoading"
      :search-keyword="searchKeyword"
      @view-detail="(row) => emit('view-detail', row)"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SummaryTableHero from '@/components/project-list/SummaryTableHero.vue'
import SummaryTableBody from '@/components/project-list/SummaryTableBody.vue'
import '@/styles/summary-table-card.css'

const props = defineProps({
  currentProjectInfo: { type: Object, required: true },
  surveyStats: { type: Object, required: true },
  parsedRefreshLoading: { type: Boolean, default: false },
  displayTableData: { type: Array, default: () => [] },
  dataLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh-parsed', 'view-detail', 'configure-print-export'])

const searchKeyword = ref('')
const bodyRef = ref(null)

const searchMatchCount = computed(() => {
  const total = (props.displayTableData || []).length
  if (!String(searchKeyword.value || '').trim()) return total
  const filtered = bodyRef.value?.filteredDisplayTableData
  if (Array.isArray(filtered)) return filtered.length
  if (filtered && typeof filtered === 'object' && 'value' in filtered) {
    return filtered.value?.length ?? 0
  }
  return total
})
</script>
