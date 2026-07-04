<template>
  <div class="contract-workbench workspace-tab-fill workspace-ui-scale">
    <div class="workbench-body workspace-tab-body">
      <ContractListPanel
        :contract-land-list="contractLandList"
        :selected-contract="selectedContract"
        :contract-refresh-loading="contractRefreshLoading"
        @refresh-contracts="emit('refresh-contracts')"
        @contract-row-click="(row) => emit('contract-row-click', row)"
        @edit-contract="(row) => emit('edit-contract', row)"
      />
      <LandParcelPanel
        :selected-contract="selectedContract"
        :current-land-parcel-list="currentLandParcelList"
        @add-land-parcel="emit('add-land-parcel')"
        @edit-land-parcel="(row) => emit('edit-land-parcel', row)"
        @delete-land-parcel="(row) => emit('delete-land-parcel', row)"
      />
    </div>
  </div>
</template>

<script setup>
import ContractListPanel from '@/components/project-list/ContractListPanel.vue'
import LandParcelPanel from '@/components/project-list/LandParcelPanel.vue'
import '@/styles/contract-land-tab.css'

defineProps({
  contractLandList: { type: Array, default: () => [] },
  selectedContract: { type: Object, default: () => ({ id: '', contractNumber: '' }) },
  currentLandParcelList: { type: Array, default: () => [] },
  contractRefreshLoading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'refresh-contracts',
  'add-contract',
  'contract-row-click',
  'edit-contract',
  'delete-contract',
  'add-land-parcel',
  'edit-land-parcel',
  'delete-land-parcel',
])
</script>
