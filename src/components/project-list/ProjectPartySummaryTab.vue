<template>
  <div class="party-summary-tab workspace-tab-fill workspace-ui-scale">
    <section
      class="forms-panel planning-panel planning-panel--modern project-tab-panel"
      v-loading="formsLoading"
    >
      <header class="planning-hero">
        <div class="planning-hero__brand">
          <div class="planning-hero__icon-wrap" aria-hidden="true">
            <el-icon class="planning-hero__icon"><Document /></el-icon>
          </div>
          <div class="planning-hero__titles">
            <span class="planning-hero__eyebrow">项目方实测汇总</span>
            <h2 class="planning-hero__title">主表</h2>
          </div>
        </div>

        <div class="planning-stat-grid" role="group" aria-label="项目方汇总主表统计">
          <div class="planning-stat-tile planning-stat-tile--slate">
            <div class="planning-stat-tile__icon"><el-icon><Files /></el-icon></div>
            <div class="planning-stat-tile__text">
              <div class="planning-stat-tile__line">
                <span class="planning-stat-tile__value">{{ formTotal }}</span>
                <span class="planning-stat-tile__unit">条</span>
              </div>
              <span class="planning-stat-tile__label">主表总数</span>
            </div>
          </div>
          <div
            class="planning-stat-tile"
            :class="activeFileRecordId ? 'planning-stat-tile--teal' : 'planning-stat-tile--amber'"
          >
            <div class="planning-stat-tile__icon">
              <el-icon><CircleCheck v-if="activeFileRecordId" /><Warning v-else /></el-icon>
            </div>
            <div class="planning-stat-tile__text planning-stat-tile__text--wide">
              <div class="planning-stat-tile__line planning-stat-tile__line--single">
                <span class="planning-stat-tile__pick">{{ activeFormSelectionText }}</span>
              </div>
              <span class="planning-stat-tile__label">当前主表</span>
            </div>
          </div>
        </div>

        <div class="planning-hero__actions" aria-label="主表操作">
          <el-button
            class="pr-btn pr-btn--ghost"
            size="small"
            :loading="formsLoading"
            @click="fetchForms"
          >
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </header>

      <div class="party-form-dashboard">
        <el-empty v-if="!formsLoading && !forms.length" class="party-form-empty" description="暂无项目方汇总主表数据" />

        <template v-else-if="forms.length">
          <div v-if="forms.length > 1 || formTotal > forms.length" class="party-file-panel">
            <div class="party-file-panel__head">
              <div class="party-file-panel__titles">
                <span class="party-file-panel__label">汇总文件</span>
                <span class="party-file-panel__count">
                  已加载 {{ forms.length }}<template v-if="formTotal > forms.length"> / {{ formTotal }}</template> 份
                </span>
              </div>
              <el-button
                v-if="forms.length < formTotal"
                class="party-file-panel__more"
                link
                type="primary"
                :loading="formsLoadingMore"
                @click="fetchMoreForms"
              >
                加载更多
              </el-button>
            </div>

            <div
              v-if="forms.length > 1"
              class="party-file-grid"
              role="listbox"
              aria-label="选择汇总文件"
            >
              <button
                v-for="(f, idx) in forms"
                :key="String(f.fileRecordId)"
                type="button"
                role="option"
                class="party-file-card"
                :class="{ 'party-file-card--active': String(f.fileRecordId) === activeFileRecordId }"
                :aria-selected="String(f.fileRecordId) === activeFileRecordId"
                :title="formFileTitle(f, idx)"
                @click="selectForm(f)"
              >
                <span class="party-file-card__badge" aria-hidden="true">XLSX</span>
                <span class="party-file-card__body">
                  <span class="party-file-card__name">
                    {{ resolveFormFileName(f) || `汇总表 ${idx + 1}` }}
                  </span>
                  <span class="party-file-card__meta">
                    <span
                      class="party-file-card__status"
                      :class="`party-file-card__status--${(f.parseStatus || 'unknown').toLowerCase()}`"
                    >
                      {{ parseStatusText[f.parseStatus] || '未知' }}
                    </span>
                    <span class="party-file-card__index">#{{ idx + 1 }}</span>
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div v-if="displayedForm" class="party-form-focus">
            <div class="party-form-meta" role="group" aria-label="当前主表状态">
              <div class="party-form-meta__tags">
                <el-tag size="small" effect="light" :type="parseStatusTagType[displayedForm.parseStatus] || 'info'">
                  解析 {{ parseStatusText[displayedForm.parseStatus] || '-' }}
                </el-tag>
                <el-tag size="small" effect="light" :type="Number(displayedForm.isParsed) === 1 ? 'success' : 'info'">
                  {{ Number(displayedForm.isParsed) === 1 ? '已解析' : '未解析' }}
                </el-tag>
                <span
                  v-if="forms.length <= 1"
                  class="party-form-meta__fid"
                  :title="displayedFormFileTitle"
                >
                  {{ displayedFormFileLabel }}
                </span>
              </div>
              <el-button class="op-btn audit-btn" size="small" type="primary" plain @click="openAudit(displayedForm)">
                审核
              </el-button>
            </div>

            <div class="party-declared-matrix-wrap">
              <table class="party-declared-matrix" aria-label="声明汇总：建筑面积、商业面积、住宅面积（㎡）">
                <tbody>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定建筑面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedTotalBuildingArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容建筑面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableTotalBuildingArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceTotalBuildingArea) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定商业面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedCommercialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容商业面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableCommercialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceCommercialArea) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="party-declared-matrix__label">合同约定住宅面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.contractAgreedResidentialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">计容住宅面积</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.buildableResidentialArea) }}
                    </td>
                    <td class="party-declared-matrix__label">差值</td>
                    <td class="party-declared-matrix__value">
                      {{ formatNum(displayedForm.declaredTotals?.differenceResidentialArea) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
    </section>

    <ProjectPartySummaryAuditDialog
      v-model="auditDialogVisible"
      :project-id="projectId"
      :file-record-id="currentAuditFileRecordId"
      :initial-file="currentAuditFile"
      :main-form-draft="partySummaryMainFormDraft"
      @main-form-saved="onPartySummaryMainFormSaved"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, nextTick, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  Files,
  CircleCheck,
  Warning,
  Refresh
} from '@element-plus/icons-vue'
import { queryProjectPartySummaryForms } from '@/services/project.service'

const ProjectPartySummaryAuditDialog = defineAsyncComponent(() =>
  import('@/components/project-list/ProjectPartySummaryAuditDialog.vue')
)

const props = defineProps({
  projectId: { type: [String, Number], default: '' },
  active: { type: Boolean, default: false }
})

const formsLoading = ref(false)
const formsLoadingMore = ref(false)
const forms = ref([])
const formTotal = ref(0)

const auditDialogVisible = ref(false)
const currentAuditFileRecordId = ref('')
const currentAuditFile = ref(null)
const activeFileRecordId = ref('')

const partySummaryMainFormDraft = ref(null)

const buildMainFormDraftFromRow = (row) => ({
  id: row?.id ?? null,
  isParsed: row?.isParsed ?? null,
  parseStatus: row?.parseStatus || '',
  remark: row?.remark || '',
  declaredTotals: {
    contractAgreedTotalBuildingArea: row?.declaredTotals?.contractAgreedTotalBuildingArea ?? null,
    buildableTotalBuildingArea: row?.declaredTotals?.buildableTotalBuildingArea ?? null,
    differenceTotalBuildingArea: row?.declaredTotals?.differenceTotalBuildingArea ?? null,
    contractAgreedCommercialArea: row?.declaredTotals?.contractAgreedCommercialArea ?? null,
    buildableCommercialArea: row?.declaredTotals?.buildableCommercialArea ?? null,
    differenceCommercialArea: row?.declaredTotals?.differenceCommercialArea ?? null,
    contractAgreedResidentialArea: row?.declaredTotals?.contractAgreedResidentialArea ?? null,
    buildableResidentialArea: row?.declaredTotals?.buildableResidentialArea ?? null,
    differenceResidentialArea: row?.declaredTotals?.differenceResidentialArea ?? null
  }
})

const parseStatusText = {
  PENDING: '待解析',
  SUCCESS: '成功',
  PARTIAL: '成功',
  FAILED: '失败'
}

const parseStatusTagType = {
  PENDING: 'warning',
  SUCCESS: 'success',
  PARTIAL: 'success',
  FAILED: 'danger'
}

const formQuery = reactive({
  pageNum: 1,
  pageSize: 20,
  sortField: 'updateTime',
  sortDirection: 'desc',
  projectId: ''
})

/** 当前展示的汇总主表（默认第一份或与 activeFileRecordId 对应） */
const displayedForm = computed(() => {
  const list = forms.value
  if (!list.length) return null
  const id = String(activeFileRecordId.value || '')
  if (!id) return list[0]
  return list.find((f) => String(f.fileRecordId) === id) || list[0]
})

const activeFormSelectionText = computed(() => {
  const list = forms.value
  if (!list.length) return '暂无主表'
  const row = displayedForm.value
  const name = resolveFormFileName(row)
  if (list.length === 1 && formTotal.value <= 1) {
    return name || '本项 1 份汇总表'
  }
  const id = String(activeFileRecordId.value || '')
  const idx = list.findIndex((f) => String(f.fileRecordId) === id)
  const n = idx >= 0 ? idx + 1 : 1
  if (name) {
    const short = name.length > 18 ? `${name.slice(0, 18)}…` : name
    return `#${n} ${short}`
  }
  return `第 ${n} 份 · 共 ${formTotal.value || list.length} 份`
})

const shortFileRecordId = (fid) => {
  const s = String(fid ?? '')
  if (!s) return '—'
  return s.length > 16 ? `${s.slice(0, 16)}…` : s
}

const resolveFormFileName = (row) => {
  const name = String(row?.fileOriginalName || row?.originalName || '').trim()
  return name || ''
}

const formFileTitle = (row, idx) => {
  const name = resolveFormFileName(row)
  const fid = row?.fileRecordId
  if (name && fid) return `${name}（fileRecordId ${fid}）`
  if (name) return name
  if (fid) return `fileRecordId ${fid}`
  return `第 ${idx + 1} 份`
}

const selectForm = (row) => {
  if (!row?.fileRecordId) return
  activeFileRecordId.value = String(row.fileRecordId)
}

const displayedFormFileTitle = computed(() => {
  const row = displayedForm.value
  if (!row) return ''
  return formFileTitle(row, 0)
})

const displayedFormFileLabel = computed(() => {
  const row = displayedForm.value
  if (!row) return '—'
  const name = resolveFormFileName(row)
  if (name) return name
  return `fileRecordId ${shortFileRecordId(row.fileRecordId)}`
})

function ensureActiveFormSelection() {
  const list = forms.value
  if (!list.length) {
    activeFileRecordId.value = ''
    return
  }
  const cur = String(activeFileRecordId.value || '')
  if (!list.some((f) => String(f.fileRecordId) === cur)) {
    activeFileRecordId.value = String(list[0].fileRecordId || '')
  }
}

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const formatNum = (num) => {
  if (num === null || num === undefined || num === '') return '-'
  const value = Number(num)
  return Number.isNaN(value) ? '-' : value.toFixed(2)
}

const buildFormPayload = () => ({
  pageNum: formQuery.pageNum,
  pageSize: formQuery.pageSize,
  sortField: formQuery.sortField,
  sortDirection: formQuery.sortDirection,
  projectId: Number(formQuery.projectId)
})

const fetchForms = async () => {
  if (!formQuery.projectId) {
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    return
  }
  formQuery.pageNum = 1
  formsLoading.value = true
  try {
    const res = await queryProjectPartySummaryForms(buildFormPayload())
    if (res.data?.code !== 200) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      ElMessage.warning(res.data?.msg || '项目方汇总主表查询失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    forms.value = parsed.records
    formTotal.value = parsed.total
    await nextTick()
    ensureActiveFormSelection()
  } catch (error) {
    console.error('查询项目方汇总主表失败:', error)
    forms.value = []
    formTotal.value = 0
    activeFileRecordId.value = ''
    ElMessage.error('查询项目方汇总主表失败，请稍后重试')
  } finally {
    formsLoading.value = false
  }
}

const fetchMoreForms = async () => {
  if (!formQuery.projectId) return
  if (formsLoading.value || formsLoadingMore.value) return
  if (forms.value.length >= formTotal.value) return
  const nextPage = formQuery.pageNum + 1
  formsLoadingMore.value = true
  try {
    const res = await queryProjectPartySummaryForms({
      ...buildFormPayload(),
      pageNum: nextPage
    })
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '加载更多失败')
      return
    }
    const parsed = normalizePage(res.data?.data)
    formTotal.value = parsed.total
    if (parsed.records.length) {
      forms.value = [...forms.value, ...parsed.records]
      formQuery.pageNum = nextPage
    }
  } catch (error) {
    console.error('加载项目方汇总主表失败:', error)
    ElMessage.error('加载更多失败，请稍后重试')
  } finally {
    formsLoadingMore.value = false
  }
}

const openAudit = (row) => {
  partySummaryMainFormDraft.value = buildMainFormDraftFromRow(row)
  currentAuditFileRecordId.value = String(row?.fileRecordId || '')
  currentAuditFile.value = {
    id: row?.fileRecordId,
    fileRecordId: row?.fileRecordId,
    originalName: resolveFormFileName(row) || `项目方实测汇总表-${row?.fileRecordId || '-'}`,
    fileType: 'XLSX'
  }
  auditDialogVisible.value = true
}

const onPartySummaryMainFormSaved = () => {
  fetchForms()
}

watch(
  () => [props.projectId, props.active],
  async ([projectId, active]) => {
    const pid = projectId ? String(projectId) : ''
    formQuery.projectId = pid
    if (!pid) {
      forms.value = []
      formTotal.value = 0
      activeFileRecordId.value = ''
      return
    }
    if (active) {
      formQuery.pageNum = 1
      activeFileRecordId.value = ''
      await fetchForms()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.party-summary-tab {
  gap: 12px;
}

.forms-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.party-form-dashboard {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255, 255, 255, 0.45);
}

.party-form-empty {
  margin: 24px auto;
}

.party-file-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.88) 100%);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.party-file-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.party-file-panel__titles {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
  min-width: 0;
}

.party-file-panel__label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #475569;
}

.party-file-panel__count {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.party-file-panel__more {
  flex-shrink: 0;
  font-weight: 600;
}

.party-file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  max-height: min(220px, 42vh);
  overflow-y: auto;
  padding: 2px;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}

.party-file-grid::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.party-file-grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
}

.party-file-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.party-file-card:hover {
  border-color: rgba(59, 130, 246, 0.35);
  background: #fff;
  box-shadow: 0 6px 16px -12px rgba(29, 78, 216, 0.35);
  transform: translateY(-1px);
}

.party-file-card--active {
  border-color: rgba(37, 99, 235, 0.55);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.98) 0%, rgba(255, 255, 255, 0.98) 100%);
  box-shadow:
    0 0 0 1px rgba(59, 130, 246, 0.12),
    0 8px 20px -14px rgba(29, 78, 216, 0.45);
}

.party-file-card__badge {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 3px 6px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #047857;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.22);
}

.party-file-card__body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.party-file-card__name {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: #0f172a;
  word-break: break-all;
}

.party-file-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.party-file-card__status {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #64748b;
}

.party-file-card__status--success,
.party-file-card__status--partial {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.party-file-card__status--pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.party-file-card__status--failed {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
}

.party-file-card__index {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #94a3b8;
}

.party-form-focus {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.party-form-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.party-form-meta__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.party-form-meta__fid {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #64748b;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.party-declared-matrix-wrap {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.party-declared-matrix {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  border: none;
  font-size: 14px;
  line-height: 1.4;
  color: #334155;
}

.party-declared-matrix__caption {
  caption-side: top;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  padding: 10px 14px 6px;
}

.party-declared-matrix td {
  border-right: 1px solid rgba(226, 232, 240, 0.95);
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  padding: 12px 10px;
  text-align: center;
  vertical-align: middle;
  word-break: break-word;
}

.party-declared-matrix td:last-child {
  border-right: none;
}

.party-declared-matrix tbody tr:first-child td {
  border-top: 1px solid rgba(226, 232, 240, 0.95);
}

.party-declared-matrix tbody tr:last-child td {
  border-bottom: none;
}

.party-declared-matrix tbody tr:nth-child(odd) .party-declared-matrix__value {
  background: rgba(255, 255, 255, 0.65);
}

.party-declared-matrix tbody tr:nth-child(even) .party-declared-matrix__value {
  background: rgba(248, 250, 252, 0.85);
}

.party-declared-matrix tbody tr .party-declared-matrix__label {
  background: #f8fafc;
}

.party-declared-matrix__label {
  font-weight: 700;
  font-size: 13px;
  color: #475569;
  width: 18%;
}

.party-declared-matrix__value {
  font-weight: 400;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: #334155;
  width: 15%;
}

.planning-panel--modern.project-tab-panel {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 48%, #f1f5f9 100%);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 40px -22px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.planning-hero {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 11px 14px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 252, 0.92) 45%, rgba(241, 245, 249, 0.88) 100%);
  flex-shrink: 0;
  min-height: 64px;
  box-sizing: border-box;
}

.planning-hero::after {
  content: '';
  position: absolute;
  right: -16%;
  top: -50%;
  width: 40%;
  height: 180%;
  background: radial-gradient(closest-side, rgba(59, 130, 246, 0.08), transparent 72%);
  pointer-events: none;
}

.planning-hero__brand {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 200px;
  min-width: 0;
  z-index: 1;
}

.planning-hero__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow:
    0 8px 18px -10px rgba(29, 78, 216, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.planning-hero__icon {
  font-size: 21px;
  color: #fff;
}

.planning-hero__eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 2px;
}

.planning-hero__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.planning-stat-grid {
  position: relative;
  z-index: 1;
  flex: 1 1 260px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.planning-stat-tile {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-width: 0;
}

.planning-stat-tile--slate .planning-stat-tile__icon {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.planning-stat-tile--teal .planning-stat-tile__icon {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.planning-stat-tile--amber .planning-stat-tile__icon {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.planning-stat-tile__icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.planning-stat-tile__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

.planning-stat-tile__text--wide {
  flex: 1;
}

.planning-stat-tile__line {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1.1;
}

.planning-stat-tile__line--single {
  width: 100%;
}

.planning-stat-tile__value {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #0f172a;
}

.planning-stat-tile__unit {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}

.planning-stat-tile__pick {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.planning-stat-tile__label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  line-height: 1.2;
}

.planning-hero__actions {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.pr-btn {
  width: auto;
  min-width: 104px;
  justify-content: center;
  border-radius: 9px;
  font-weight: 600;
}

:deep(.pr-btn--ghost) {
  border: 1px solid rgba(148, 163, 184, 0.55);
  background: rgba(255, 255, 255, 0.92);
  color: #334155;
}

:deep(.pr-btn--ghost:hover) {
  border-color: #94a3b8;
  background: #fff;
  color: #0f172a;
}

@media (max-width: 1320px) {
  .party-summary-tab {
    height: auto;
    min-height: 0;
  }

  .party-file-grid {
    grid-template-columns: 1fr;
    max-height: min(280px, 50vh);
  }
}
</style>
