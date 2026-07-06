<template>
  <div
    class="smart-folder-import"
    :class="{
      'smart-folder-import--embedded': embedded,
      'smart-folder-import--uploading': uploadLoading,
    }"
  >
    <div
      v-loading="scanLoading"
      class="smart-folder-import__dropzone"
      element-loading-text="正在递归扫描文件夹…"
      :class="{ 'is-dragover': dragOver, 'is-compact': hasScanResult }"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="folderInputRef"
        type="file"
        class="smart-folder-import__input"
        webkitdirectory
        directory
        multiple
        @change="onInputChange"
      />
      <div v-if="!hasScanResult" class="smart-folder-import__drop-inner">
        <el-icon class="smart-folder-import__icon"><FolderOpened /></el-icon>
        <div class="smart-folder-import__title">拖拽项目文件夹到这里</div>
        <el-button
          type="primary"
          plain
          :disabled="scanLoading || uploadLoading"
          @click="pickFolder"
        >
          选择项目文件夹
        </el-button>
      </div>
      <div v-else class="smart-folder-import__drop-compact">
        <el-icon><FolderOpened /></el-icon>
        <span>重新选择文件夹</span>
        <el-button link type="primary" @click="pickFolder">更换文件夹</el-button>
      </div>
    </div>

    <div v-if="hasScanResult" class="smart-folder-import__summary">
      <span>已扫描 {{ scannedEntries.length }} 个候选文件</span>
      <span>·</span>
      <span>待上传 {{ selectedCount }} 个</span>
    </div>

    <div v-if="hasScanResult" class="smart-folder-import__phase">
      <span class="smart-folder-import__phase-label">实测报告期数</span>
      <el-input-number
        :model-value="surveyPhase"
        :min="1"
        :max="99"
        controls-position="right"
        :disabled="uploadLoading"
        @update:model-value="emit('update:surveyPhase', $event)"
      />
    </div>

    <div v-if="hasScanResult" class="smart-folder-import__groups">
      <div v-if="matchedDisplayGroups.length" class="smart-folder-import__matched-panel">
        <section
          v-for="group in matchedDisplayGroups"
          :key="group.key"
          class="smart-folder-import__group smart-folder-import__group--matched"
          :class="{ 'is-empty': group.entries.length === 0 }"
        >
          <header class="smart-folder-import__group-header">
            <span class="smart-folder-import__group-title"
              >{{ group.label }} ({{ group.entries.length }})</span
            >
            <span v-if="group.selectedCount === 0" class="smart-folder-import__group-note"
              >未找到</span
            >
          </header>

          <div v-if="group.entries.length" class="smart-folder-import__list">
            <el-collapse v-model="expandedDirKeys" class="smart-folder-import__dir-collapse">
              <el-collapse-item
                v-for="dirGroup in group.directoryGroups"
                :key="`${group.key}-${dirGroup.directory}`"
                :name="buildDirCollapseKey(group.key, dirGroup.directory)"
                class="smart-folder-import__dir-group"
              >
                <template #title>
                  <div class="smart-folder-import__dir-header">
                    <el-checkbox
                      class="smart-folder-import__dir-select-all"
                      :model-value="isDirAllSelected(dirGroup, false)"
                      :indeterminate="isDirIndeterminate(dirGroup, false)"
                      :disabled="uploadLoading || !hasSelectableInDir(dirGroup, false)"
                      @click.stop
                      @update:model-value="handleDirSelectToggle(dirGroup, false, $event)"
                    >
                      全选
                    </el-checkbox>
                    <el-icon class="smart-folder-import__dir-icon" aria-hidden="true"
                      ><FolderOpened
                    /></el-icon>
                    <span class="smart-folder-import__dir-path" :title="dirGroup.directory">{{
                      dirGroup.directory
                    }}</span>
                    <span class="smart-folder-import__dir-count"
                      >{{ dirGroup.entries.length }} 个</span
                    >
                    <span
                      v-if="dirGroup.selectedCount < dirGroup.entries.length"
                      class="smart-folder-import__dir-selected"
                    >
                      已选 {{ dirGroup.selectedCount }}
                    </span>
                  </div>
                </template>
                <div class="smart-folder-import__dir-list">
                  <div
                    v-for="entry in dirGroup.entries"
                    :key="entry.id"
                    class="smart-folder-import__row"
                    :class="{ 'is-upload-active': isActiveUploadEntry(entry.id) }"
                    :data-upload-entry-id="entry.id"
                  >
                    <el-checkbox
                      :model-value="entry.selected"
                      :disabled="uploadLoading"
                      @update:model-value="emit('toggle-selected', entry.id, $event)"
                    />
                    <div class="smart-folder-import__row-main">
                      <div class="smart-folder-import__row-name" :title="entry.relativePath">
                        {{ entry.displayName }}
                      </div>
                    </div>
                    <span
                      v-if="uploadLoading && uploadItemMap[entry.id]"
                      class="smart-folder-import__row-status"
                      :class="`is-${resolveUploadState(entry.id)?.status ?? 'pending'}`"
                    >
                      {{ uploadStatusLabel(entry.id) }}
                    </span>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
          <div v-else class="smart-folder-import__empty">— 未找到（可跳过）</div>
        </section>
      </div>

      <section
        v-if="unmatchedDisplayGroup"
        class="smart-folder-import__group smart-folder-import__group--unmatched"
      >
        <header class="smart-folder-import__group-header">
          <span class="smart-folder-import__group-title">
            {{ unmatchedDisplayGroup.label }} ({{ unmatchedDisplayGroup.entries.length }})
          </span>
          <span class="smart-folder-import__group-note">默认不上传</span>
        </header>

        <div v-if="unmatchedDisplayGroup.entries.length" class="smart-folder-import__list">
          <el-collapse v-model="expandedDirKeys" class="smart-folder-import__dir-collapse">
            <el-collapse-item
              v-for="dirGroup in unmatchedDisplayGroup.directoryGroups"
              :key="`${unmatchedDisplayGroup.key}-${dirGroup.directory}`"
              :name="buildDirCollapseKey(unmatchedDisplayGroup.key, dirGroup.directory)"
              class="smart-folder-import__dir-group"
            >
              <template #title>
                <div class="smart-folder-import__dir-header">
                  <el-checkbox
                    class="smart-folder-import__dir-select-all"
                    :model-value="isDirAllSelected(dirGroup, true)"
                    :indeterminate="isDirIndeterminate(dirGroup, true)"
                    :disabled="uploadLoading || !hasSelectableInDir(dirGroup, true)"
                    @click.stop
                    @update:model-value="handleDirSelectToggle(dirGroup, true, $event)"
                  >
                    全选
                  </el-checkbox>
                  <el-icon class="smart-folder-import__dir-icon" aria-hidden="true"
                    ><FolderOpened
                  /></el-icon>
                  <span class="smart-folder-import__dir-path" :title="dirGroup.directory">{{
                    dirGroup.directory
                  }}</span>
                  <span class="smart-folder-import__dir-count"
                    >{{ dirGroup.entries.length }} 个</span
                  >
                  <span
                    v-if="dirGroup.selectedCount < dirGroup.entries.length"
                    class="smart-folder-import__dir-selected"
                  >
                    已选 {{ dirGroup.selectedCount }}
                  </span>
                </div>
              </template>
              <div class="smart-folder-import__dir-list">
                <div
                  v-for="entry in dirGroup.entries"
                  :key="entry.id"
                  class="smart-folder-import__row"
                  :class="{ 'is-upload-active': isActiveUploadEntry(entry.id) }"
                  :data-upload-entry-id="entry.id"
                >
                  <el-checkbox
                    :model-value="entry.selected"
                    :disabled="uploadLoading || !entry.fileContextType"
                    @update:model-value="emit('toggle-selected', entry.id, $event)"
                  />
                  <div class="smart-folder-import__row-main">
                    <div class="smart-folder-import__row-name" :title="entry.relativePath">
                      {{ entry.displayName }}
                    </div>
                  </div>
                  <el-select
                    :model-value="entry.fileContextType || ''"
                    placeholder="手动归类"
                    size="small"
                    class="smart-folder-import__type-select"
                    :disabled="uploadLoading"
                    @update:model-value="emit('change-context-type', entry.id, $event || null)"
                  >
                    <el-option
                      v-for="type in contextTypeOptions"
                      :key="type"
                      :label="getFileContextLabel(type)"
                      :value="type"
                    />
                  </el-select>
                  <span
                    v-if="uploadLoading && uploadItemMap[entry.id]"
                    class="smart-folder-import__row-status"
                    :class="`is-${resolveUploadState(entry.id)?.status ?? 'pending'}`"
                  >
                    {{ uploadStatusLabel(entry.id) }}
                  </span>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
        <div v-else class="smart-folder-import__empty">— 无未识别文件</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { FolderOpened } from '@element-plus/icons-vue'
import { getFileContextLabel } from '@/utils/fileContextTypeRegistry.js'
import {
  SMART_IMPORT_CONTEXT_TYPES as contextTypeOptionsSource,
  groupEntriesByDirectory,
} from '@/utils/localFolderFileMatcher.js'

const props = defineProps({
  embedded: { type: Boolean, default: false },
  scannedEntries: { type: Array, default: () => [] },
  groupedEntries: { type: Object, default: () => ({}) },
  surveyPhase: { type: Number, default: 1 },
  selectedCount: { type: Number, default: 0 },
  hasScanResult: { type: Boolean, default: false },
  uploadLoading: { type: Boolean, default: false },
  scanLoading: { type: Boolean, default: false },
  uploadProgress: { type: Number, default: 0 },
  getFileUploadState: { type: Function, default: () => null },
  uploadItems: { type: Array, default: () => [] },
  activeUploadEntryId: { type: String, default: null },
  scrollContainer: { type: Object, default: null },
})

const emit = defineEmits([
  'update:surveyPhase',
  'folder-input-change',
  'folder-drop',
  'toggle-selected',
  'toggle-directory-selected',
  'change-context-type',
])

const folderInputRef = ref(null)
const dragOver = ref(false)
const expandedDirKeys = ref([])

const buildDirCollapseKey = (groupKey, directory) => `${groupKey}::${directory}`

const contextTypeOptions = contextTypeOptionsSource

const GROUP_ORDER = [
  'CONTRACT',
  'SURVEY_REPORT',
  'PLANNING_REVIEW',
  'CAPACITY_INDICATOR',
  'PROJECT_PARTY_SURVEY_SUMMARY',
  'UNMATCHED',
]

const displayGroups = computed(() => {
  return GROUP_ORDER.map((key) => {
    const entries = props.groupedEntries[key] || []
    return {
      key,
      label: key === 'UNMATCHED' ? '未识别' : getFileContextLabel(key),
      entries,
      directoryGroups: groupEntriesByDirectory(entries),
      selectedCount: entries.filter((item) => item.selected).length,
    }
  })
})

const matchedDisplayGroups = computed(() =>
  displayGroups.value.filter((group) => group.key !== 'UNMATCHED' && group.entries.length > 0)
)

const unmatchedDisplayGroup = computed(() => {
  const group = displayGroups.value.find((item) => item.key === 'UNMATCHED')
  return group?.entries.length > 0 ? group : null
})

const scanFingerprint = computed(() => props.scannedEntries.map((entry) => entry.id).join('\0'))

const buildExpandedKeysForSelected = () => {
  const keys = []
  for (const group of displayGroups.value) {
    for (const dirGroup of group.directoryGroups) {
      if (dirGroup.entries.some((entry) => entry.selected)) {
        keys.push(buildDirCollapseKey(group.key, dirGroup.directory))
      }
    }
  }
  return keys
}

watch(
  scanFingerprint,
  () => {
    expandedDirKeys.value = buildExpandedKeysForSelected()
  },
  { immediate: true }
)

const uploadItemMap = computed(() => {
  const map = {}
  for (const item of props.uploadItems || []) {
    map[item.uid] = item
  }
  return map
})

const pickFolder = () => {
  folderInputRef.value?.click()
}

const onInputChange = (event) => {
  emit('folder-input-change', event)
}

const onDrop = (event) => {
  dragOver.value = false
  emit('folder-drop', event)
}

const resolveUploadState = (entryId) => {
  const item = props.uploadItems.find((row) => row.uid === entryId)
  if (!item) return null
  return props.getFileUploadState?.(item) ?? null
}

const UPLOAD_STATUS_LABELS = {
  pending: '等待',
  uploading: '上传中',
  processing: '入库中',
  done: '已完成',
  error: '失败',
  cancelled: '已取消',
}

const uploadStatusLabel = (entryId) => {
  const status = resolveUploadState(entryId)?.status ?? 'pending'
  return UPLOAD_STATUS_LABELS[status] || status
}

const getSelectableDirEntries = (dirGroup, isUnmatched) => {
  if (isUnmatched) {
    return dirGroup.entries.filter((entry) => entry.fileContextType)
  }
  return dirGroup.entries
}

const hasSelectableInDir = (dirGroup, isUnmatched) =>
  getSelectableDirEntries(dirGroup, isUnmatched).length > 0

const isDirAllSelected = (dirGroup, isUnmatched) => {
  const selectable = getSelectableDirEntries(dirGroup, isUnmatched)
  return selectable.length > 0 && selectable.every((entry) => entry.selected)
}

const isDirIndeterminate = (dirGroup, isUnmatched) => {
  const selectable = getSelectableDirEntries(dirGroup, isUnmatched)
  if (!selectable.length) return false
  const selectedCount = selectable.filter((entry) => entry.selected).length
  return selectedCount > 0 && selectedCount < selectable.length
}

const handleDirSelectToggle = (dirGroup, isUnmatched, checked) => {
  if (checked) {
    const entryIds = getSelectableDirEntries(dirGroup, isUnmatched).map((entry) => entry.id)
    emit('toggle-directory-selected', entryIds, true)
    return
  }
  const entryIds = dirGroup.entries.map((entry) => entry.id)
  emit('toggle-directory-selected', entryIds, false)
}

const autoFollowUpload = ref(true)
let isProgrammaticScroll = false
let scrollFollowTimer = null
let scrollContainerCleanup = null

const isActiveUploadEntry = (entryId) =>
  props.uploadLoading && props.activeUploadEntryId && entryId === props.activeUploadEntryId

const ensureEntryDirExpanded = (entryId) => {
  for (const group of displayGroups.value) {
    for (const dirGroup of group.directoryGroups) {
      if (!dirGroup.entries.some((entry) => entry.id === entryId)) continue
      const key = buildDirCollapseKey(group.key, dirGroup.directory)
      if (!expandedDirKeys.value.includes(key)) {
        expandedDirKeys.value = [...expandedDirKeys.value, key]
      }
      return
    }
  }
}

const scrollToUploadEntry = async (entryId) => {
  if (!entryId || !autoFollowUpload.value) return
  const container = props.scrollContainer
  if (!container) return

  ensureEntryDirExpanded(entryId)
  await nextTick()

  const row = container.querySelector(`[data-upload-entry-id="${entryId}"]`)
  if (!row) return

  isProgrammaticScroll = true
  row.scrollIntoView({ block: 'center', behavior: 'smooth' })
  window.clearTimeout(scrollFollowTimer)
  scrollFollowTimer = window.setTimeout(() => {
    isProgrammaticScroll = false
  }, 600)
}

const bindScrollContainer = (container) => {
  scrollContainerCleanup?.()
  if (!container) return

  const onScroll = () => {
    if (isProgrammaticScroll) return
    autoFollowUpload.value = false
  }

  container.addEventListener('scroll', onScroll, { passive: true })
  scrollContainerCleanup = () => container.removeEventListener('scroll', onScroll)
}

watch(
  () => props.scrollContainer,
  (container) => bindScrollContainer(container),
  { immediate: true }
)

watch(
  () => props.uploadLoading,
  async (loading) => {
    if (!loading) return
    autoFollowUpload.value = true
    await nextTick()
    const firstItem = props.uploadItems[0]
    if (firstItem?.uid) {
      scrollToUploadEntry(firstItem.uid)
    }
  }
)

watch(
  () => props.activeUploadEntryId,
  (entryId) => {
    scrollToUploadEntry(entryId)
  }
)

onBeforeUnmount(() => {
  scrollContainerCleanup?.()
  window.clearTimeout(scrollFollowTimer)
})

defineExpose({ pickFolder })
</script>

<style scoped>
.smart-folder-import {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.smart-folder-import--embedded {
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.smart-folder-import--uploading .smart-folder-import__groups,
.smart-folder-import--uploading .smart-folder-import__dir-list {
  max-height: none;
  overflow: visible;
}

.smart-folder-import__dropzone {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  padding: 18px;
  text-align: center;
}

.smart-folder-import__dropzone.is-dragover {
  border-color: rgba(37, 99, 235, 0.75);
  background: rgba(239, 246, 255, 0.95);
}

.smart-folder-import__dropzone.is-compact {
  padding: 10px 14px;
}

.smart-folder-import__input {
  display: none;
}

.smart-folder-import__drop-inner,
.smart-folder-import__drop-compact {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.smart-folder-import__drop-compact {
  flex-direction: row;
  justify-content: center;
  flex-wrap: wrap;
}

.smart-folder-import__icon {
  font-size: 34px;
  color: rgba(37, 99, 235, 0.9);
}

.smart-folder-import__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.smart-folder-import__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}

.smart-folder-import__phase {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.smart-folder-import__phase-label {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.smart-folder-import__groups {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.smart-folder-import__matched-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.72);
}

.smart-folder-import__group--matched {
  padding-left: 10px;
  border-left: 3px solid rgba(37, 99, 235, 0.55);
}

.smart-folder-import__group--matched.is-empty {
  opacity: 0.72;
}

.smart-folder-import__group--matched.is-empty .smart-folder-import__group-title {
  color: #64748b;
  font-weight: 700;
}

.smart-folder-import__group--unmatched {
  min-width: 0;
  box-sizing: border-box;
  padding: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.65);
  border-radius: 12px;
  background: rgba(255, 251, 235, 0.45);
}

.smart-folder-import__group--unmatched .smart-folder-import__group-title {
  color: #92400e;
  font-weight: 800;
}

.smart-folder-import__group--unmatched .smart-folder-import__group-note {
  color: #b45309;
}

.smart-folder-import__group--unmatched .smart-folder-import__dir-collapse :deep(.el-collapse-item) {
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(251, 191, 36, 0.35);
}

.smart-folder-import__group--unmatched .smart-folder-import__dir-header {
  background: rgba(254, 243, 199, 0.55);
}

.smart-folder-import__group--unmatched .smart-folder-import__dir-icon {
  color: rgba(180, 83, 9, 0.75);
}

.smart-folder-import__group--unmatched .smart-folder-import__row {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(251, 191, 36, 0.28);
}

.smart-folder-import__group-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
  min-width: 0;
}

.smart-folder-import__group-title {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  min-width: 0;
}

.smart-folder-import__group-note {
  font-size: 12px;
  color: #94a3b8;
}

.smart-folder-import__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.smart-folder-import__dir-collapse {
  border: none;
  min-width: 0;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item) {
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item + .el-collapse-item) {
  margin-top: 8px;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item__header) {
  height: auto;
  line-height: 1.4;
  padding: 0;
  border-bottom: none;
  background: transparent;
  overflow: hidden;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item__title) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item__wrap) {
  border-bottom: none;
}

.smart-folder-import__dir-collapse :deep(.el-collapse-item__content) {
  padding: 0;
}

.smart-folder-import__dir-group {
  border: none;
}

.smart-folder-import__dir-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px 8px 8px;
  background: rgba(241, 245, 249, 0.95);
}

.smart-folder-import__dir-select-all {
  flex-shrink: 0;
  margin-right: 2px;
  height: auto;
}

.smart-folder-import__dir-select-all :deep(.el-checkbox__label) {
  padding-left: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.smart-folder-import__dir-icon {
  flex-shrink: 0;
  color: rgba(37, 99, 235, 0.85);
}

.smart-folder-import__dir-path {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.smart-folder-import__dir-count,
.smart-folder-import__dir-selected {
  flex-shrink: 0;
  font-size: 11px;
  color: #64748b;
}

.smart-folder-import__dir-collapse
  :deep(.el-collapse-item.is-active .smart-folder-import__dir-header) {
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
}

.smart-folder-import__dir-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  min-width: 0;
}

.smart-folder-import__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, max-content);
  gap: 8px;
  align-items: start;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.95);
  border: 1px solid rgba(226, 232, 240, 0.75);
}

.smart-folder-import__row.is-upload-active {
  border-color: rgba(37, 99, 235, 0.45);
  background: rgba(239, 246, 255, 0.98);
  box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
}

.smart-folder-import__row-main {
  min-width: 0;
}

.smart-folder-import__row-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.smart-folder-import__row-status {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
}

.smart-folder-import__row-status.is-uploading,
.smart-folder-import__row-status.is-processing {
  color: #2563eb;
}

.smart-folder-import__row-status.is-done {
  color: #16a34a;
}

.smart-folder-import__row-status.is-error {
  color: #dc2626;
}

.smart-folder-import__type-select {
  width: min(130px, 100%);
  max-width: 100%;
}

.smart-folder-import__empty {
  font-size: 12px;
  color: #94a3b8;
  padding: 4px 0 2px 2px;
}
</style>
