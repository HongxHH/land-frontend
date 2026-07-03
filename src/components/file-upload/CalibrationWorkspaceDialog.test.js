import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import CalibrationWorkspaceDialog from '@/components/file-upload/CalibrationWorkspaceDialog.vue'

vi.mock('@/services/file.service', () => ({
  downloadGridFsFile: vi.fn()
}))

vi.mock('@/composables/file-upload/useCalibrationUnknownUsagePolicy', () => ({
  parseUnknownUsageNames: () => [],
  useCalibrationUnknownUsagePolicy: () => ({
    calibrationUnknownRows: ref([]),
    calibrationUnknownLoading: ref(false)
  })
}))

const slotStub = {
  template: '<div><slot name="header" /><slot /><slot name="footer" /></div>'
}

const buttonStub = {
  props: ['disabled', 'loading'],
  emits: ['click'],
  template: '<button :disabled="disabled || loading" @click="$emit(\'click\')"><slot /></button>'
}

const mountDialog = (overrides = {}) =>
  shallowMount(CalibrationWorkspaceDialog, {
    props: {
      modelValue: true,
      currentFile: { rawId: 12, status: 'PARSE_COMPLETE', fileId: 'gridfs-1', name: 'report.pdf' },
      startRowEdit: vi.fn(),
      exitEditMode: vi.fn(),
      handleSaveData: vi.fn(),
      handleAuditPass: vi.fn(),
      switchView: vi.fn(),
      pdfLoaded: vi.fn(),
      pdfLoadError: vi.fn(),
      auditSummaryData: {
        isVerified: 1,
        pendingConfirmArea: 0,
        unknownUsageCount: 0,
        unknownUsages: []
      },
      auditSummaryDisplay: {
        isVerifiedTagType: 'success',
        isVerifiedText: '校验通过',
        hasUnknownUsageText: '无'
      },
      roomInfoData: [],
      ...overrides
    },
    global: {
      directives: {
        loading: {}
      },
      stubs: {
        ElDialog: slotStub,
        ElTooltip: slotStub,
        ElButton: buttonStub,
        ElTag: slotStub,
        ElIcon: slotStub,
        ElEmpty: true,
        ElTable: slotStub,
        ElTableColumn: slotStub,
        ElInput: true,
        ElAlert: true,
        ElForm: slotStub,
        ElFormItem: slotStub,
        ElRow: slotStub,
        ElCol: slotStub,
        ElSelect: slotStub,
        ElOption: true,
        ElOptionGroup: slotStub,
        CalibrationHeader: true,
        AuditDocumentPreviewPanel: slotStub,
        UnknownUsagePolicyList: true,
        Loading: true,
        CircleCheck: true,
        WarningFilled: true,
        Search: true
      }
    }
  })

describe('CalibrationWorkspaceDialog', () => {
  it('renders an audit-pass button that calls the supplied handler', async () => {
    const handleAuditPass = vi.fn()
    const wrapper = mountDialog({ handleAuditPass })

    const auditPassButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('审核通过'))

    expect(auditPassButton?.exists()).toBe(true)
    expect(auditPassButton.attributes('disabled')).toBeUndefined()

    await auditPassButton.trigger('click')
    await nextTick()

    expect(handleAuditPass).toHaveBeenCalledTimes(1)
  })
})
