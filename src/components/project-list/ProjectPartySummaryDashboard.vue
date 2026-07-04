<template>
  <div class="party-form-dashboard">
    <el-empty
      v-if="!formsLoading && !forms.length"
      class="party-form-empty"
      description="暂无项目方汇总主表数据"
    />

    <template v-else-if="forms.length">
      <div v-if="forms.length > 1 || formTotal > forms.length" class="party-file-panel">
        <div class="party-file-panel__head">
          <div class="party-file-panel__titles">
            <span class="party-file-panel__label">汇总文件</span>
            <span class="party-file-panel__count">
              已加载 {{ forms.length
              }}<template v-if="formTotal > forms.length"> / {{ formTotal }}</template> 份
            </span>
          </div>
          <el-button
            v-if="forms.length < formTotal"
            class="party-file-panel__more"
            link
            type="primary"
            :loading="formsLoadingMore"
            @click="emit('load-more')"
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
            @click="emit('select-form', f)"
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
            <el-tag
              size="small"
              effect="light"
              :type="parseStatusTagType[displayedForm.parseStatus] || 'info'"
            >
              解析 {{ parseStatusText[displayedForm.parseStatus] || '-' }}
            </el-tag>
            <el-tag
              size="small"
              effect="light"
              :type="Number(displayedForm.isParsed) === 1 ? 'success' : 'info'"
            >
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
          <el-button
            class="op-btn audit-btn"
            size="small"
            type="primary"
            plain
            @click="emit('audit', displayedForm)"
          >
            审核
          </el-button>
        </div>

        <div class="party-declared-matrix-wrap">
          <table
            class="party-declared-matrix"
            aria-label="声明汇总：建筑面积、商业面积、住宅面积（㎡）"
          >
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
</template>

<script setup>
defineProps({
  formsLoading: { type: Boolean, default: false },
  forms: { type: Array, default: () => [] },
  formTotal: { type: Number, default: 0 },
  formsLoadingMore: { type: Boolean, default: false },
  displayedForm: { type: Object, default: null },
  activeFileRecordId: { type: String, default: '' },
  displayedFormFileTitle: { type: String, default: '' },
  displayedFormFileLabel: { type: String, default: '' },
  parseStatusText: { type: Object, required: true },
  parseStatusTagType: { type: Object, required: true },
  resolveFormFileName: { type: Function, required: true },
  formFileTitle: { type: Function, required: true },
  formatNum: { type: Function, required: true },
})

defineEmits(['load-more', 'select-form', 'audit'])
</script>
