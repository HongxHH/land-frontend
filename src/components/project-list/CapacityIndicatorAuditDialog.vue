<template>
  <el-dialog
    v-model="dialogVisible"
    title="容量指标核查审核"
    fullscreen
    append-to-body
    :close-on-click-modal="false"
    class="capacity-indicator-audit-dialog"
    @closed="handleClosed"
  >
    <div
      ref="auditLayoutRef"
      class="audit-split-layout audit-split-layout--responsive capacity-audit-shell"
    >
      <section class="audit-split-layout__left audit-preview-shell" :style="leftPanelStyle">
        <AuditDocumentPreviewPanel
          :loading="metaLoading || mdLoading || pdfLoading"
          :current-view="leftView"
          :download-disabled="!fileMeta.gridfsId"
          :views="previewViews"
          @update:current-view="leftView = $event"
          @download="downloadSourceFile"
        >
          <template #pdf>
            <iframe v-if="pdfUrl" :src="pdfUrl" class="audit-preview-iframe" title="PDF 预览" />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无可预览 PDF" />
            </div>
          </template>
          <template #markdown>
            <!-- eslint-disable-next-line vue/no-v-html -- recognitionHtml 经 renderRecognitionMarkdownHtml + DOMPurify 消毒 -->
            <div v-if="recognitionMdContent" class="audit-preview-md" v-html="recognitionHtml" />
            <div v-else class="audit-preview-empty">
              <el-empty description="暂无解析内容" />
            </div>
          </template>
        </AuditDocumentPreviewPanel>
      </section>

      <div
        class="audit-splitter"
        role="separator"
        aria-orientation="vertical"
        aria-label="拖动调节左右区域宽度"
        @pointerdown="onSplitterMouseDown"
      />

      <section class="audit-split-layout__right capacity-audit-right">
        <div class="capacity-audit-right__head">
          <div class="capacity-audit-right__title">核查数据</div>
          <el-tag v-if="formEdit.id" size="small" type="info" effect="plain"
            >主表 id: {{ formEdit.id }}</el-tag
          >
        </div>

        <div class="capacity-audit-right__body">
          <div class="summary-card">
            <div class="summary-title">本次报建建筑面积（㎡）</div>
            <el-table
              class="capacity-audit-table project-tab-el-table"
              :data="areaEditRows"
              border
              stripe
              size="default"
            >
              <el-table-column prop="label" label="指标" width="140" align="center" />
              <el-table-column label="面积(㎡)" min-width="200" align="center">
                <template #default="{ row }">
                  <el-input-number
                    v-model="formEdit[row.field]"
                    :precision="2"
                    :controls="false"
                    align="center"
                    placeholder="请输入"
                    class="capacity-audit-table__input"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="remark-card">
            <div class="remark-card__title">备注</div>
            <el-input
              v-model.trim="formEdit.remark"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="可填写核对说明或补充信息"
            />
          </div>
        </div>

        <div class="capacity-audit-right__footer">
          <el-button @click="dialogVisible = false">关闭</el-button>
          <el-button type="primary" :loading="mainFormSaveLoading" @click="submitMainFormEdit"
            >保存</el-button
          >
        </div>
      </section>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import AuditDocumentPreviewPanel from '@/components/audit/AuditDocumentPreviewPanel.vue'
import { downloadGridFsFile, queryFiles } from '@/services/file.service'
import {
  queryCapacityIndicatorForms,
  updateCapacityIndicatorForm,
} from '@/services/project.service'
import { useRecognitionMarkdown } from '@/composables/file-upload/useRecognitionMarkdown'
import { useAuditSplitPanel } from '@/composables/audit/useAuditSplitPanel'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  projectId: { type: [String, Number], default: '' },
  fileRecordId: { type: [String, Number], default: '' },
  initialFile: { type: Object, default: null },
  mainFormDraft: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'main-form-saved'])

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const leftView = ref('pdf')
const metaLoading = ref(false)
const mdLoading = ref(false)
const pdfLoading = ref(false)
const mainFormSaveLoading = ref(false)

const previewViews = [
  { id: 'pdf', label: 'PDF预览' },
  { id: 'markdown', label: '解析内容(MD)' },
]

const areaEditRows = [
  { label: '合计', field: 'totalArea' },
  { label: '商业类', field: 'commercialArea' },
  { label: '住宅类', field: 'residentialArea' },
]

const recognitionMdContent = ref('')
const { recognitionHtml } = useRecognitionMarkdown({ recognitionMdContent })

const fileMeta = reactive({
  id: null,
  originalName: '',
  gridfsId: '',
  preprocessGridfsId: '',
})

const pdfUrl = ref('')

const { auditLayoutRef, leftPanelStyle, onSplitterMouseDown } = useAuditSplitPanel()

const formEdit = reactive({
  id: null,
  totalArea: null,
  commercialArea: null,
  residentialArea: null,
  remark: '',
})

const resetMainFormEdit = () => {
  Object.assign(formEdit, {
    id: null,
    totalArea: null,
    commercialArea: null,
    residentialArea: null,
    remark: '',
  })
}

const assignMainFormFromDraft = (draft) => {
  if (!draft) {
    resetMainFormEdit()
    return
  }
  Object.assign(formEdit, {
    id: draft.id ?? null,
    totalArea: draft.totalArea ?? null,
    commercialArea: draft.commercialArea ?? null,
    residentialArea: draft.residentialArea ?? null,
    remark: draft.remark || '',
  })
}

const normalizePage = (payload) => {
  if (Array.isArray(payload)) return { records: payload, total: payload.length }
  const records = Array.isArray(payload?.records) ? payload.records : []
  return { records, total: Number(payload?.total ?? records.length) }
}

const clearPdfUrl = () => {
  if (pdfUrl.value) {
    URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
  }
}

const fetchCapacityFormRow = async () => {
  if (!props.fileRecordId || !props.projectId) return null
  try {
    const res = await queryCapacityIndicatorForms({
      pageNum: 1,
      pageSize: 1,
      sortField: 'updateTime',
      sortDirection: 'desc',
      projectId: Number(props.projectId),
      fileRecordId: Number(props.fileRecordId),
    })
    if (res.data?.code !== 200) return null
    return Array.isArray(res.data?.data?.records) ? res.data.data.records[0] : null
  } catch (error) {
    console.error('查询容量指标核查表失败:', error)
    return null
  }
}

const fetchFileMeta = async () => {
  if (!props.fileRecordId) return
  metaLoading.value = true
  try {
    const fromProps = props.initialFile || null
    if (fromProps?.gridfsId) {
      Object.assign(fileMeta, {
        id: fromProps.id,
        originalName: fromProps.originalName || '',
        gridfsId: fromProps.gridfsId || fromProps.fileId || '',
        preprocessGridfsId: fromProps.preprocessGridfsId || '',
      })
      return
    }
    const res = await queryFiles({
      pageNum: 1,
      pageSize: 1,
      fileId: String(props.fileRecordId),
    })
    const parsed = normalizePage(res.data?.data)
    const hit = parsed.records?.[0]
    if (!hit) {
      ElMessage.warning('未找到关联文件')
      return
    }
    Object.assign(fileMeta, {
      id: hit.id,
      originalName: hit.originalName || '',
      gridfsId: hit.gridfsId || '',
      preprocessGridfsId: hit.preprocessGridfsId || '',
    })
  } catch (error) {
    console.error('查询容量指标核查文件失败:', error)
    ElMessage.error('查询文件信息失败')
  } finally {
    metaLoading.value = false
  }
}

const fetchPdfPreview = async () => {
  pdfLoading.value = true
  clearPdfUrl()
  try {
    if (!fileMeta.gridfsId) return
    const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'blob' })
    const blob = new Blob([res.data], { type: 'application/pdf' })
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    console.error('PDF 预览加载失败:', error)
    ElMessage.warning('PDF 预览加载失败，可下载原文件查看')
  } finally {
    pdfLoading.value = false
  }
}

const fetchMarkdown = async () => {
  if (!props.fileRecordId) {
    recognitionMdContent.value = ''
    return
  }
  mdLoading.value = true
  try {
    const res = await axios.post('/api/data-tables/ocr-execution-results/query', {
      fileRecordId: Number(props.fileRecordId),
      pageNum: 1,
      pageSize: 20,
      sortField: 'createTime',
      sortDirection: 'desc',
      loadGridFsPayload: true,
    })
    const hit = res.data?.data?.records?.[0]
    recognitionMdContent.value = hit?.markdownContent || ''
  } catch (error) {
    console.error('加载容量指标核查 MD 失败:', error)
    recognitionMdContent.value = ''
  } finally {
    mdLoading.value = false
  }
}

const downloadSourceFile = async () => {
  if (!fileMeta.gridfsId) {
    ElMessage.warning('缺少 gridfsId，无法下载')
    return
  }
  try {
    const res = await downloadGridFsFile(fileMeta.gridfsId, { responseType: 'blob' })
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileMeta.originalName || '容量指标核查表.pdf'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载容量指标核查表失败:', error)
    ElMessage.error('下载失败')
  }
}

const loadDialogData = async () => {
  if (props.mainFormDraft) {
    assignMainFormFromDraft(props.mainFormDraft)
  } else {
    const row = await fetchCapacityFormRow()
    assignMainFormFromDraft(row)
  }
  await fetchFileMeta()
  await Promise.all([fetchPdfPreview(), fetchMarkdown()])
}

const handleClosed = () => {
  leftView.value = 'pdf'
  recognitionMdContent.value = ''
  clearPdfUrl()
  resetMainFormEdit()
  mainFormSaveLoading.value = false
}

const submitMainFormEdit = async () => {
  if (!formEdit.id) {
    ElMessage.warning('缺少主表ID，无法更新')
    return
  }
  mainFormSaveLoading.value = true
  try {
    const res = await updateCapacityIndicatorForm({
      id: Number(formEdit.id),
      totalArea: formEdit.totalArea,
      commercialArea: formEdit.commercialArea,
      residentialArea: formEdit.residentialArea,
      remark: formEdit.remark || null,
    })
    if (res.data?.code !== 200) {
      ElMessage.warning(res.data?.msg || '更新失败')
      return
    }
    ElMessage.success('保存成功')
    emit('main-form-saved')
  } catch (error) {
    console.error('更新容量指标核查表失败:', error)
    ElMessage.error('保存失败，请稍后重试')
  } finally {
    mainFormSaveLoading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadDialogData()
  }
)
</script>

<style>
/* teleport 到 body 的全屏 Dialog 需非 scoped 样式，否则 flex 链断裂、下方留白 */
.el-dialog.is-fullscreen.capacity-indicator-audit-dialog {
  margin: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: none !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.el-dialog.is-fullscreen.capacity-indicator-audit-dialog .el-dialog__header {
  flex: 0 0 auto;
  margin-right: 0;
  padding-bottom: 8px;
}

.el-dialog.is-fullscreen.capacity-indicator-audit-dialog .el-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  padding: 8px !important;
  box-sizing: border-box;
}
</style>

<style scoped>
@import '@/styles/project-tab-tables.css';

.capacity-audit-shell {
  flex: 1 1 auto;
  min-height: 0;
  align-self: stretch;
  background: #f3f6fa;
  border-radius: 10px;
  padding: 8px;
  box-sizing: border-box;
}

.capacity-audit-shell.audit-split-layout {
  height: 100%;
}

.capacity-audit-right {
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
  min-height: 0;
  height: 100%;
  align-self: stretch;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  flex: 1 1 auto;
  min-width: 280px;
}

.audit-preview-shell :deep(.audit-doc-preview) {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
}

.capacity-audit-right__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6edf5;
}

.capacity-audit-right__title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.capacity-audit-right__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.capacity-audit-right__footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  margin-top: 10px;
  border-top: 1px solid #e4ebf4;
}

.summary-card {
  flex-shrink: 0;
  border: 1px solid #e5ecf6;
  background: #f8fbff;
  border-radius: 8px;
  padding: 12px;
}

.summary-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}

.capacity-audit-table :deep(.el-table__inner-wrapper) {
  border-radius: 6px;
}

.capacity-audit-table__input {
  width: 100%;
  max-width: 220px;
}

.remark-card {
  flex: 1 1 auto;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5ecf6;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.remark-card :deep(.el-textarea) {
  flex: 1 1 auto;
}

.remark-card :deep(.el-textarea__inner) {
  min-height: 80px;
  height: 100%;
}

.remark-card__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #334155;
  flex-shrink: 0;
}
</style>
