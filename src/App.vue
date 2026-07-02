<script setup>
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
</script>

<template>
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>

<style>
:root {
  --biz-primary: #2f4b6e;
  --biz-primary-hover: #3a5a83;
  --biz-border: #d7dde6;
  --biz-header-bg: #f6f8fb;
  --biz-text: #1f2d3d;
  --biz-subtext: #5f6b7a;
  --biz-page-bg: #edf1f5;
  --biz-btn-soft-bg: #e8f2fc;
  --biz-btn-soft-bg-hover: #d7e7f8;
  --biz-btn-soft-text: #1f4e79;
  --biz-btn-danger-bg: #fff5f5;
  --biz-btn-danger-bg-hover: #ffe4e6;
  --biz-btn-danger-text: #dc2626;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: var(--biz-text);
  background: var(--biz-page-bg);
}

.layout-user-dropdown {
  z-index: 4000 !important;
}

#print-target {
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background: #fff;
}

:deep(.el-card) {
  border-color: var(--biz-border);
}

/* 按钮全局样式见 @/styles/app-button-system.css */

:deep(.el-table th.el-table__cell) {
  background: var(--biz-header-bg);
  color: #4b5563;
  font-weight: 700;
}

:deep(.el-pagination) {
  --el-color-primary: #334155;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background: #334155 !important;
  border-color: #334155;
  color: #fff;
}

:deep(.el-pagination.is-background .btn-next),
:deep(.el-pagination.is-background .btn-prev),
:deep(.el-pagination.is-background .el-pager li) {
  background: #f3f4f6;
  color: #4b5563;
}

:deep(.el-table .el-table__row:hover > td.el-table__cell) {
  background: #f8fafc !important;
}

.biz-btn {
  min-width: 96px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid #c8ddf1;
  color: var(--biz-btn-soft-text);
  background: #ffffff;
  font-weight: 600;
}

.biz-btn:hover {
  color: #163a5a;
  border-color: #b8d3ec;
  background: var(--biz-btn-soft-bg-hover);
}

.biz-btn-primary {
  color: var(--biz-btn-soft-text);
  border-color: #c8ddf1;
  background: var(--biz-btn-soft-bg);
}

.biz-btn-primary:hover {
  color: #163a5a;
  border-color: #b8d3ec;
  background: var(--biz-btn-soft-bg-hover);
}

.biz-btn-danger {
  color: var(--biz-btn-danger-text);
  border-color: #fecaca;
  background: var(--biz-btn-danger-bg);
}

.biz-btn-danger:hover {
  color: #b91c1c;
  border-color: #fca5a5;
  background: var(--biz-btn-danger-bg-hover);
}

@media print {
  /*
   * 仅打印 #print-target（Teleport 汇总表等）。勿只隐藏 #app：
   * Element Plus 的弹窗遮罩、Message、Notification、部分 Popper 会挂到 body，
   * 与 #app 同级，仍会进入「打印到 PDF」导致界面污染。
   */
  body > *:not(#print-target) {
    display: none !important;
  }

  #print-target {
    display: block !important;
    position: static !important;
    height: auto !important;
    overflow: visible !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  #print-target,
  #print-target * {
    color: #000 !important;
  }

  html,
  body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  @page {
    size: landscape;
    margin: 1cm;
  }

  .native-print-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11pt;
  }

  .native-print-table th,
  .native-print-table td {
    border: 1px solid #000;
    padding: 6px 4px;
    text-align: center;
    word-wrap: break-word;
    color: #000 !important;
  }

  .native-print-table thead {
    display: table-header-group;
  }

  .native-print-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .print-title {
    font-size: 20pt;
    font-weight: bold;
    text-align: center;
    margin: 10px 0 20px 0 !important;
    break-after: avoid;
  }

  .print-meta-row {
    display: flex !important;
    justify-content: space-between !important;
    margin: 0 20px 15px !important;
    font-size: 12pt !important;
  }

  .print-footer {
    margin: 30px 20px 0 !important;
  }

  .print-signatures {
    display: flex !important;
    gap: 60px !important;
    font-size: 14pt !important;
    margin-left: 20px !important;
  }
}
</style>
