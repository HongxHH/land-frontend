import { describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'
import FileUpload from '@/views/FileUpload.vue'

const pageState = vi.hoisted(() => ({
  handleCreateRoom: vi.fn(),
  handleDeleteRoom: vi.fn(),
  enterEditMode: vi.fn(),
  exitEditMode: vi.fn(),
  handleSaveData: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn(() => Promise.resolve()) })
}))

vi.mock('@/composables/file-upload/useFileUploadPage', () => ({
  useFileUploadPage: () => ({
    statusMap: {},
    tableRowClassName: vi.fn(),
    projectOptions: ref([]),
    currentProject: ref('1'),
    showCreateProject: ref(false),
    newProjectForm: ref({}),
    handleCreateProject: vi.fn(),
    fileTableData: ref([]),
    tableLoading: ref(false),
    filterStatus: ref(''),
    filterFileName: ref(''),
    filterFileType: ref(''),
    currentPage: ref(1),
    pageSize: ref(10),
    total: ref(0),
    refreshData: vi.fn(),
    resetFilter: vi.fn(),
    handleSizeChange: vi.fn(),
    handleCurrentChange: vi.fn(),
    handleRefresh: vi.fn(),
    selectedRows: ref([]),
    batchLoading: ref(false),
    canBatchParse: ref(false),
    handleSelectionChange: vi.fn(),
    batchDelete: vi.fn(),
    batchParse: vi.fn(),
    uploadDialogVisible: ref(false),
    tempUploadType: ref(''),
    uploadPhase: ref('select'),
    tempFiles: ref([]),
    uploadLoading: ref(false),
    getFileUploadState: vi.fn(),
    openUploadDialog: vi.fn(),
    handleFileChange: vi.fn(),
    handleFileRemove: vi.fn(),
    handleUploadDialogClosed: vi.fn(),
    confirmUpload: vi.fn(),
    retryUploadFile: vi.fn(),
    openCalibration: vi.fn(),
    startProcessing: vi.fn(),
    cancelProcessing: vi.fn(),
    deleteFile: vi.fn(),
    showCalibration: ref(true),
    resetCalibrationState: vi.fn(),
    currentFile: ref({ rawId: 7, fileId: 'gridfs-7' }),
    isEditing: ref(true),
    editingRowId: ref('room-42'),
    enterEditMode: pageState.enterEditMode,
    exitEditMode: pageState.exitEditMode,
    handleSaveData: pageState.handleSaveData,
    syncRoomRow: vi.fn(),
    handleRefreshSurveyReport: vi.fn(),
    handleCreateRoom: pageState.handleCreateRoom,
    handleDeleteRoom: pageState.handleDeleteRoom,
    roomCreateLoading: ref(true),
    roomDeleteLoading: ref(true),
    reportRefreshLoading: ref(false),
    handleAuditPass: vi.fn(),
    calibrationLoading: ref(false),
    currentViewType: ref('original'),
    isPreprocessAvailable: ref(false),
    switchView: vi.fn(),
    pdfLoading: ref(false),
    calibrationPdfUrl: ref(''),
    pdfLoaded: vi.fn(),
    pdfLoadError: vi.fn(),
    recognitionMdLoading: ref(false),
    recognitionHtml: ref(''),
    auditSummaryData: {},
    auditSummaryDisplay: {},
    roomInfoData: ref([]),
    roomInfoLoading: ref(false),
    roomInfoTotal: ref(0),
    fetchAllRoomInfoRows: vi.fn(),
    searchRoomInfosByPages: vi.fn(),
    loadMoreRoomInfo: vi.fn(),
    roomInfoHasMore: ref(false),
    roomInfoLoadingMore: ref(false)
  })
}))

const CalibrationWorkspaceDialogStub = defineComponent({
  name: 'CalibrationWorkspaceDialog',
  props: {
    modelValue: Boolean,
    editingRowId: [String, Number],
    handleCreateRoom: Function,
    handleDeleteRoom: Function,
    roomCreateLoading: Boolean,
    roomDeleteLoading: Boolean,
    startRowEdit: Function,
    exitEditMode: Function,
    handleSaveData: Function
  },
  template: '<section data-testid="calibration-dialog" />'
})

describe('FileUpload calibration dialog integration', () => {
  it('passes room edit and mutation workflow props to the calibration dialog', () => {
    const wrapper = mount(FileUpload, {
      global: {
        stubs: {
          UploadActionHeader: true,
          FileUploadTaskPanel: true,
          CreateProjectDialog: true,
          BatchUploadDialog: true,
          CalibrationWorkspaceDialog: CalibrationWorkspaceDialogStub
        }
      }
    })

    const dialog = wrapper.findComponent(CalibrationWorkspaceDialogStub)
    expect(dialog.exists()).toBe(true)
    expect(dialog.props('editingRowId')).toBe('room-42')
    expect(dialog.props('handleCreateRoom')).toBe(pageState.handleCreateRoom)
    expect(dialog.props('handleDeleteRoom')).toBe(pageState.handleDeleteRoom)
    expect(dialog.props('roomCreateLoading')).toBe(true)
    expect(dialog.props('roomDeleteLoading')).toBe(true)
    expect(dialog.props('startRowEdit')).toBe(pageState.enterEditMode)
    expect(dialog.props('exitEditMode')).toBe(pageState.exitEditMode)
    expect(dialog.props('handleSaveData')).toBe(pageState.handleSaveData)
  })
})
