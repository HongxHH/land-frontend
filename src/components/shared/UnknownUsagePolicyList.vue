<template>
  <div class="policy-list">
    <div
      v-for="rule in rows"
      :key="rule.id ?? rule.usageName"
      class="policy-row"
      :class="{ 'policy-row--highlight': isHighlighted(rule) }"
    >
      <div class="policy-row__head">
        <div class="policy-row__titleline">
          <span class="usage-name">{{ rule.usageName }}</span>
          <el-tag size="small" type="danger" effect="plain" class="status-tag">待处理</el-tag>
        </div>
      </div>

      <div class="policy-row__detail">
        <div class="policy-row__meta">
          <span v-if="rule.occurrenceCount != null" class="meta-item">
            出现 <strong>{{ rule.occurrenceCount }}</strong> 次
          </span>
          <template v-if="metaSecondaryText(rule)">
            <span class="meta-dot" aria-hidden="true">·</span>
            <span class="meta-rooms" :title="metaTooltipText(rule)">{{
              metaSecondaryText(rule)
            }}</span>
          </template>
          <template v-if="!isMissingUsagePolicyRow(rule) && (rule.recentFileName || rule.fileRecordId)">
            <span class="meta-dot" aria-hidden="true">·</span>
          </template>
          <span
            v-if="!isMissingUsagePolicyRow(rule) && rule.recentFileName"
            class="meta-file"
            :title="rule.recentFileName"
            >{{ rule.recentFileName }}</span
          >
          <span
            v-else-if="!isMissingUsagePolicyRow(rule) && rule.fileRecordId"
            class="meta-file meta-file--muted"
            >文件记录 #{{ rule.fileRecordId }}</span
          >
          <span
            v-else-if="
              !isMissingUsagePolicyRow(rule) &&
              !rule.occurrenceCount &&
              !metaSecondaryText(rule)
            "
            class="meta-file meta-file--muted"
            >当前报告待确认</span
          >
        </div>

        <div v-if="hasRowAction(rule)" class="policy-row__actions">
          <template v-if="showAuditButton && projectId && isMissingUsagePolicyRow(rule)">
            <el-button
              v-if="!hasMultipleSourceGroups(rule)"
              type="primary"
              link
              size="small"
              class="action-btn"
              @click="openMissingUsageAudit(rule)"
            >
              打开来源审核
            </el-button>
            <el-dropdown
              v-else
              trigger="click"
              placement="bottom-end"
              popper-class="policy-source-dropdown-popper"
              :popper-options="sourceGroupDropdownPopperOptions"
              @command="(group) => openMissingUsageAudit(rule, group)"
            >
              <el-button type="primary" link size="small" class="action-btn">
                选择报告处理
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu class="policy-source-dropdown-menu">
                  <el-dropdown-item
                    v-for="group in missingUsageSourceGroups(rule)"
                    :key="group.fileRecordId"
                    :command="group"
                    :title="formatSourceGroupLabel(group)"
                  >
                    <span class="policy-source-dropdown-item__label">{{
                      formatSourceGroupLabel(group)
                    }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
          <el-button
            v-else-if="showAuditButton && rule.fileRecordId && projectId"
            type="primary"
            link
            size="small"
            class="action-btn"
            @click="emitOpenSourceAudit(rule.fileRecordId, rule.usageName)"
          >
            打开来源审核
          </el-button>
          <el-button
            v-else-if="showLocateButton && isMissingUsagePolicyRow(rule)"
            type="primary"
            link
            size="small"
            class="action-btn"
            @click="$emit('filter-missing-usage')"
          >
            筛选缺失户室
          </el-button>
          <el-button
            v-else-if="showLocateButton"
            type="primary"
            link
            size="small"
            class="action-btn"
            @click="$emit('locate-usage', rule.usageName)"
          >
            定位户室
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ArrowDown } from '@element-plus/icons-vue'
import {
  FOCUS_MODE_MISSING_USAGE,
  formatMissingUsageMetaText,
  formatRoomNumbersInline,
  isMissingUsagePolicyRow,
  MISSING_USAGE_ROW_LABEL,
} from '@/composables/file-upload/surveyUsagePending'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  projectId: { type: [String, Number], default: '' },
  highlightUsageName: { type: String, default: '' },
  focusMode: { type: String, default: '' },
  showAuditButton: { type: Boolean, default: false },
  showLocateButton: { type: Boolean, default: false },
})

const emit = defineEmits(['open-source-audit', 'locate-usage', 'filter-missing-usage'])

/** 下拉菜单限制在视口内，条目过多时内部滚动 */
const sourceGroupDropdownPopperOptions = {
  modifiers: [
    {
      name: 'flip',
      options: {
        fallbackPlacements: ['top-end', 'bottom-start', 'top-start'],
      },
    },
    {
      name: 'preventOverflow',
      options: { padding: 12 },
    },
  ],
}

const formatSourceGroupLabel = (group) => {
  const fileName = String(group?.fileName || '').trim() || `文件记录 #${group?.fileRecordId || ''}`
  const count = Number(group?.occurrenceCount ?? 0)
  return `${fileName}（${count} 户）`
}

const isHighlighted = (rule) => {
  if (String(props.focusMode || '').trim() === FOCUS_MODE_MISSING_USAGE) {
    return isMissingUsagePolicyRow(rule)
  }
  const focus = String(props.highlightUsageName || '').trim()
  if (!focus) return false
  return String(rule?.usageName || '').trim() === focus
}

const missingUsageSourceGroups = (rule) =>
  Array.isArray(rule?.sourceGroups) ? rule.sourceGroups : []

const hasMultipleSourceGroups = (rule) => missingUsageSourceGroups(rule).length > 1

const metaSecondaryText = (rule) => {
  if (isMissingUsagePolicyRow(rule)) {
    return formatMissingUsageMetaText(rule)
  }
  return formatRoomNumbersInline(rule?.roomNumbers)
}

const metaTooltipText = (rule) => formatRoomNumbersInline(rule?.roomNumbers)

const missingUsageHasAuditTarget = (rule) => {
  if (missingUsageSourceGroups(rule).length > 0) return true
  return Boolean(rule?.fileRecordId)
}

const hasRowAction = (rule) => {
  if (isMissingUsagePolicyRow(rule)) {
    if (props.showAuditButton && props.projectId && missingUsageHasAuditTarget(rule)) return true
    if (props.showLocateButton) return true
    return false
  }
  if (props.showAuditButton && rule.fileRecordId && props.projectId) return true
  return props.showLocateButton && !isMissingUsagePolicyRow(rule)
}

const emitOpenSourceAudit = (fileRecordId, usageName, focusMode = '') => {
  emit('open-source-audit', {
    fileRecordId: String(fileRecordId || ''),
    usageName: String(usageName || '').trim(),
    focusMode: String(focusMode || '').trim(),
  })
}

const openMissingUsageAudit = (rule, group) => {
  const groups = missingUsageSourceGroups(rule)
  const target = group || (groups.length === 1 ? groups[0] : null)
  const fileRecordId = String(target?.fileRecordId || rule?.fileRecordId || '').trim()
  if (!fileRecordId) return
  emitOpenSourceAudit(fileRecordId, MISSING_USAGE_ROW_LABEL, FOCUS_MODE_MISSING_USAGE)
}
</script>

<style scoped>
.policy-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 2px;
}

.policy-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(244, 114, 94, 0.35);
  background: linear-gradient(135deg, #ffffff 0%, #fffaf8 55%, #fff5f2 100%);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
}

.policy-row--highlight {
  border-color: rgba(239, 68, 68, 0.65);
  box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.25);
}

.policy-row__detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding-top: 6px;
  margin-top: 2px;
  border-top: 1px dashed rgba(251, 146, 60, 0.35);
}

.policy-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 0;
}

.policy-row__titleline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
}

.usage-name {
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.status-tag {
  flex-shrink: 0;
  border-radius: 999px;
}

.policy-row__meta {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  line-height: 1.4;
  color: #57534e;
}

.meta-item {
  flex-shrink: 0;
  white-space: nowrap;
}

.meta-item strong {
  color: #9a3412;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.meta-dot {
  flex-shrink: 0;
  color: #d6d3d1;
  user-select: none;
}

.meta-file {
  flex: 1 1 auto;
  min-width: 0;
  color: #44403c;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-file--muted {
  color: #78716c;
  font-weight: 500;
}

.meta-rooms {
  flex: 1 1 auto;
  min-width: 0;
  color: #1e40af;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.policy-row__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  min-width: 72px;
}

.action-btn {
  flex-shrink: 0;
  padding: 0 2px;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 900px) {
  .policy-row__detail {
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .policy-row__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .meta-rooms {
    flex-basis: 100%;
  }
}
</style>

<style>
/* teleported 下拉层：限制高度并在视口内滚动 */
.policy-source-dropdown-popper.el-popper {
  max-width: min(520px, calc(100vw - 24px));
}

.policy-source-dropdown-popper .policy-source-dropdown-menu {
  max-height: min(320px, 45vh);
  overflow-y: auto;
  overscroll-behavior: contain;
}

.policy-source-dropdown-popper .el-dropdown-menu__item {
  max-width: min(500px, calc(100vw - 32px));
  line-height: 1.35;
  padding-top: 8px;
  padding-bottom: 8px;
}

.policy-source-dropdown-popper .policy-source-dropdown-item__label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
