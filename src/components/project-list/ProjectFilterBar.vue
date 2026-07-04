<template>
  <div class="global-filter-card no-print workspace-ui-scale admin-mgmt-page">
    <div class="filter-glow" aria-hidden="true" />
    <div class="filter-inner">
      <div class="filter-brand">
        <div class="brand-icon-wrap">
          <el-icon class="brand-icon"><FolderOpened /></el-icon>
        </div>
        <div class="brand-copy">
          <div
            class="project-display"
            :class="{
              loading: optionsLoading,
              selected: !!activeProjectName && !optionsLoading,
              empty: !activeProjectName && !optionsLoading,
            }"
          >
            <template v-if="optionsLoading">
              <span class="project-name loading-text">正在同步项目列表…</span>
            </template>
            <template v-else-if="activeProjectName">
              <span class="project-name" :title="activeProjectName">{{ activeProjectName }}</span>
            </template>
            <template v-else>
              <span class="project-name empty-title">请选择项目</span>
            </template>
          </div>
        </div>
      </div>

      <div class="filter-toolbar">
        <div class="selector-block">
          <div class="selector-field">
            <div class="selector-input">
              <el-icon class="selector-search-icon"><Search /></el-icon>
              <el-autocomplete
                id="project-workspace-select"
                v-model="projectSearchText"
                placeholder="输入名称、编号或关键词筛选…"
                class="project-select has-leading-icon"
                size="large"
                clearable
                :debounce="300"
                :fetch-suggestions="fetchProjectSuggestions"
                :trigger-on-focus="true"
                value-key="name"
                highlight-first-item
                teleported
                popper-class="project-filter-select-dropdown"
                @select="handleSelectProject"
                @clear="handleClearProject"
                @focus="handleRequestOptions"
                @click="handleRequestOptions"
              >
                <template #default="{ item }">
                  <div class="opt-cell">
                    <div class="opt-main">
                      <span class="opt-name">{{ item.name }}</span>
                      <span class="opt-code">{{ item.code }}</span>
                    </div>
                    <div v-if="item.projectTime || item.updateTime" class="opt-meta">
                      <span v-if="item.projectTime" class="opt-chip">{{
                        formatProjectTimeForDisplay(item.projectTime)
                      }}</span>
                      <span v-if="item.updateTime" class="opt-updated"
                        >更新 {{ formatShortTime(item.updateTime) }}</span
                      >
                    </div>
                  </div>
                </template>
              </el-autocomplete>
            </div>
          </div>
        </div>

        <div class="action-block">
          <el-tooltip content="根据当前选中项目加载档案、合同与实测等业务数据" placement="top">
            <el-button
              class="query-btn primary-cta"
              type="primary"
              :disabled="!modelValue"
              @click="$emit('search')"
            >
              <el-icon class="btn-ico"><Promotion /></el-icon>
              查询档案
            </el-button>
          </el-tooltip>
          <el-tooltip content="创建新的征收/开发项目档案" placement="top">
            <el-button class="create-btn ghost-cta" @click="$emit('create-project')">
              <el-icon class="btn-ico"><Plus /></el-icon>
              新建项目
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { FolderOpened, Search, Plus, Promotion } from '@element-plus/icons-vue'
import { formatProjectTimeForDisplay } from '@/utils/projectTimePresent'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  projectOptions: {
    type: Array,
    default: () => [],
  },
  currentProjectId: {
    type: [String, Number],
    default: '',
  },
  /** 已加载（查询档案后）的项目名称，与 currentProjectId 配套 */
  currentProjectName: {
    type: String,
    default: '',
  },
  /** 首屏拉取项目列表时提示，避免长时间无文案 */
  optionsLoading: {
    type: Boolean,
    default: false,
  },
  /** (keyword: string) => Promise<projectOption[]> */
  searchProjects: {
    type: Function,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'search', 'create-project', 'request-options'])

const projectSearchText = ref('')
const suppressInputEmit = ref(false)

function resolveProjectNameById(projectId) {
  const target = props.projectOptions?.find((item) => String(item.id) === String(projectId || ''))
  return target?.name || ''
}

/** 左侧展示：仅反映已点击「查询档案」后的当前项目 */
const activeProjectName = computed(() => {
  const activeId = String(props.currentProjectId || '')
  if (!activeId) return ''
  const cachedName = String(props.currentProjectName || '').trim()
  if (cachedName && cachedName !== '请选择项目') return cachedName
  return resolveProjectNameById(activeId)
})

watch(
  () => props.modelValue,
  () => {
    suppressInputEmit.value = true
    projectSearchText.value = resolveProjectNameById(props.modelValue) || ''
    Promise.resolve().then(() => {
      suppressInputEmit.value = false
    })
  },
  { immediate: true }
)

const RECENT_KEY = 'recent_project_ids'

function getRecentProjectIds() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const arr = JSON.parse(raw || '[]')
    return Array.isArray(arr) ? arr.map((v) => String(v)) : []
  } catch {
    return []
  }
}

function setRecentProjectIds(nextIds) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(nextIds.slice(0, 12)))
  } catch {
    /* ignore persist failures */
  }
}

function pushRecentProjectId(id) {
  const sid = String(id || '')
  if (!sid) return
  const current = getRecentProjectIds().filter((x) => x !== sid)
  current.unshift(sid)
  setRecentProjectIds(current)
}

async function fetchProjectSuggestions(queryString, cb) {
  const keyword = String(queryString || '').trim()
  const list = Array.isArray(props.projectOptions) ? props.projectOptions : []
  const recentIds = getRecentProjectIds()

  const pickRecent = (source) => {
    const recent = recentIds.map((id) => source.find((p) => String(p.id) === id)).filter(Boolean)
    const fallback = source.filter((p) => !recentIds.includes(String(p.id))).slice(0, 12)
    return [...recent, ...fallback].slice(0, 18)
  }

  if (typeof props.searchProjects === 'function') {
    try {
      const remote = await props.searchProjects(keyword)
      const source = Array.isArray(remote) && remote.length ? remote : list
      cb(keyword ? source.slice(0, 30) : pickRecent(source))
      return
    } catch {
      /* 回退本地缓存 */
    }
  }

  if (!keyword) {
    cb(pickRecent(list))
    return
  }

  const lower = keyword.toLowerCase()
  const matched = list
    .filter((p) => {
      const name = String(p.name || '').toLowerCase()
      const code = String(p.code || '').toLowerCase()
      return name.includes(lower) || code.includes(lower)
    })
    .slice(0, 30)
  cb(matched)
}

function handleSelectProject(item) {
  const id = item?.id
  if (id == null) return
  pushRecentProjectId(id)
  projectSearchText.value = item?.name || ''
  emit('update:modelValue', id)
}

function handleClearProject() {
  suppressInputEmit.value = true
  projectSearchText.value = ''
  if (!props.currentProjectId) {
    emit('update:modelValue', '')
  }
  Promise.resolve().then(() => {
    suppressInputEmit.value = false
  })
}

function handleRequestOptions() {
  emit('request-options')
}

watch(
  () => projectSearchText.value,
  (v) => {
    if (suppressInputEmit.value) return
    if (!String(v || '').trim()) {
      if (props.currentProjectId) return
      emit('update:modelValue', '')
    }
  }
)

function formatShortTime(val) {
  if (val == null) return ''
  if (typeof val === 'string') {
    return /^\d{4}-\d{2}-\d{2}/.test(val) ? val.slice(0, 16).replace('T', ' ') : val
  }
  if (Array.isArray(val) && val.length >= 3) {
    const [y, m, d, h = 0, mi = 0] = val
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
  }
  return ''
}
</script>

<style scoped>
.global-filter-card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.92) 0%,
    rgba(248, 250, 252, 0.98) 42%,
    rgba(241, 245, 249, 0.95) 100%
  );
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.85) inset,
    0 12px 40px -18px rgba(15, 23, 42, 0.18),
    0 4px 14px -6px rgba(15, 23, 42, 0.08);
}

.filter-glow {
  position: absolute;
  inset: -40% -20% auto auto;
  width: 55%;
  height: 120%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.14), rgba(59, 130, 246, 0) 70%);
  pointer-events: none;
}

.filter-inner {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 20px 28px;
  padding: 18px 20px 18px 22px;
}

.filter-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 200px;
  max-width: 360px;
  flex-shrink: 0;
}

.brand-icon-wrap {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 55%, #1e3a8a 100%);
  box-shadow:
    0 8px 20px -8px rgba(29, 78, 216, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.brand-icon {
  font-size: 24px;
  color: #fff;
}

.brand-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
}

.project-display {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.project-display.empty {
  flex-direction: row;
  align-items: center;
}

.project-name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.01em;
  color: var(--biz-text, #0f172a);
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.project-display.selected .project-name {
  color: #0f172a;
}

.project-display.loading .project-name.loading-text {
  font-size: 15px;
  font-weight: 600;
  color: #64748b;
}

.project-display.empty .project-name.empty-title {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.55);
  background: rgba(248, 250, 252, 0.92);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: #64748b;
  white-space: nowrap;
  -webkit-line-clamp: unset;
}

.filter-toolbar {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 20px;
  min-width: 0;
}

.selector-block {
  min-width: 240px;
  flex: 1;
}

.selector-field {
  width: 100%;
}

.selector-input {
  position: relative;
  width: 100%;
}

.selector-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: #1f4e79;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(232, 242, 252, 0.95);
  border: 1px solid rgba(200, 221, 241, 0.9);
  pointer-events: none;
}

.selection-hint {
  margin-top: 8px;
  min-height: 26px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 12px;
  color: #1e3a8a;
  background: rgba(239, 246, 255, 0.85);
  border: 1px solid rgba(147, 197, 253, 0.45);
}

.selection-hint.empty {
  color: #64748b;
  background: rgba(248, 250, 252, 0.95);
  border-color: rgba(148, 163, 184, 0.4);
}

.project-select {
  width: 100%;
  max-width: 100%;
}

.action-block {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.btn-ico {
  margin-right: 4px;
  font-size: 16px;
}

:deep(.primary-cta.el-button--primary) {
  min-height: 40px;
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  border: none;
  background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow: 0 8px 22px -10px rgba(29, 78, 216, 0.75);
}

:deep(.primary-cta.el-button--primary:hover) {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

:deep(.primary-cta.el-button--primary:disabled) {
  opacity: 0.55;
  box-shadow: none;
}

:deep(.ghost-cta.el-button) {
  min-height: 40px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  color: var(--biz-btn-soft-text, #1f4e79);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.55);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

:deep(.ghost-cta.el-button:hover) {
  background: #fff;
  border-color: #94a3b8;
  color: #0f172a;
}

:deep(.project-select .el-select__wrapper),
:deep(.project-select .el-input__wrapper) {
  border-radius: 10px;
  min-height: 40px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.95);
}

:deep(.project-select.has-leading-icon .el-input__inner) {
  padding-left: 38px;
}

:deep(.project-select .el-select__wrapper:hover),
:deep(.project-select .el-input__wrapper:hover) {
  border-color: rgba(59, 130, 246, 0.45);
}

:deep(.project-select.is-focused .el-select__wrapper),
:deep(.project-select .el-input__wrapper:focus-within) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.opt-cell {
  padding: 4px 0;
  line-height: 1.35;
}

.opt-main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.opt-name {
  font-weight: 600;
  color: #0f172a;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-code {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  font-variant-numeric: tabular-nums;
}

.opt-meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 11px;
  color: #94a3b8;
}

.opt-chip {
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(241, 245, 249, 0.95);
  color: #64748b;
  font-weight: 500;
}

.opt-updated {
  font-weight: 500;
}

@media (max-width: 1024px) {
  .filter-inner {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-brand {
    max-width: none;
  }

  .action-block {
    width: 100%;
  }

  :deep(.primary-cta),
  :deep(.ghost-cta) {
    flex: 1;
    justify-content: center;
  }
}
</style>

<style>
/* 下拉层挂在 body，需非 scoped */
.project-filter-select-dropdown.el-select-dropdown,
.project-filter-select-dropdown.el-autocomplete-suggestion {
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 16px 48px -12px rgba(15, 23, 42, 0.22);
}

.project-filter-select-dropdown .el-select-dropdown__item,
.project-filter-select-dropdown .el-autocomplete-suggestion__list li {
  height: auto;
  min-height: 48px;
  padding: 8px 14px;
  line-height: normal;
}

.project-filter-select-dropdown .el-select-dropdown__item.is-selected {
  font-weight: 600;
  background: rgba(239, 246, 255, 0.85);
}

.project-filter-select-dropdown .el-autocomplete-suggestion__list li:hover {
  background: rgba(239, 246, 255, 0.65);
}
</style>
