<template>
  <div class="cali-header">
    <div class="file-title-block">
      <span class="title">实测报告审核</span>
      <span class="sub-name">{{ currentFile?.name }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentFile: {
    type: Object,
    default: null
  }
})
</script>

<style scoped>
.cali-header {
  display: flex;
  align-items: center;
  gap: 14px 18px;
  padding: 14px 52px 14px 18px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.file-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title {
  color: #303133;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}

.sub-name {
  margin-top: 4px;
  color: #606266;
  font-size: 13px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
