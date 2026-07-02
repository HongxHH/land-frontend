<template>
  <Teleport v-if="isPrinting" to="#print-target">
    <div class="dashboard-print-wrapper">
      <div class="print-title">{{ printTitle }}</div>
      <div class="print-meta">打印时间：{{ printTime }}</div>
      <table class="native-print-table">
        <thead>
          <tr>
            <th v-for="header in headers" :key="header">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in records" :key="`print-row-${rowIndex}`">
            <td v-for="(cell, cellIndex) in row" :key="`print-cell-${rowIndex}-${cellIndex}`">
              {{ cell }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  isPrinting: {
    type: Boolean,
    default: false
  },
  printTitle: {
    type: String,
    default: '项目详情打印报表'
  },
  printTime: {
    type: String,
    default: ''
  },
  headers: {
    type: Array,
    default: () => []
  },
  records: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.dashboard-print-wrapper {
  background: #fff;
  padding: 12px;
}

.print-title {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 10px;
}

.print-meta {
  margin-bottom: 10px;
  font-size: 13px;
  color: #475569;
}
</style>
