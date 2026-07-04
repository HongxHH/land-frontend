import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useFileUploadPage } from '@/composables/file-upload/useFileUploadPage'

const mocks = vi.hoisted(() => ({
  useProjectOptions: vi.fn(),
  useFileTableQuery: vi.fn(),
  useFileUploadOperations: vi.fn(),
  useCalibrationState: vi.fn(),
  useCalibrationViewer: vi.fn(),
  useRecognitionMarkdown: vi.fn(),
  useCurrentProjectSession: vi.fn(),
  useCalibrationActions: vi.fn(),
  useRoomEditWorkflow: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn(() => Promise.resolve()) })
}))

vi.mock('@/composables/file-upload/useProjectOptions', () => ({
  useProjectOptions: mocks.useProjectOptions
}))

vi.mock('@/composables/file-upload/useFileTableQuery', () => ({
  useFileTableQuery: mocks.useFileTableQuery
}))

vi.mock('@/composables/file-upload/useFileUploadConstants', () => ({
  useFileUploadConstants: () => ({
    statusMap: {},
    usageCategoryMap: {},
    usageCategoryReverseMap: {}
  }),
  useAuditSummaryDisplay: () => ({ auditSummaryDisplay: {} })
}))

vi.mock('@/composables/file-upload/useFileUploadOperations', () => ({
  useFileUploadOperations: mocks.useFileUploadOperations
}))

vi.mock('@/composables/file-upload/useCalibrationState', () => ({
  useCalibrationState: mocks.useCalibrationState
}))

vi.mock('@/composables/file-upload/useCalibrationViewer', () => ({
  useCalibrationViewer: mocks.useCalibrationViewer
}))

vi.mock('@/composables/file-upload/useRecognitionMarkdown', () => ({
  useRecognitionMarkdown: mocks.useRecognitionMarkdown
}))

vi.mock('@/composables/file-upload/useCurrentProjectSession', () => ({
  useCurrentProjectSession: mocks.useCurrentProjectSession
}))

vi.mock('@/composables/file-upload/useCalibrationActions', () => ({
  useCalibrationActions: mocks.useCalibrationActions
}))

vi.mock('@/composables/file-upload/useRoomEditWorkflow', () => ({
  useRoomEditWorkflow: mocks.useRoomEditWorkflow
}))

describe('useFileUploadPage room edit integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.useProjectOptions.mockReturnValue({
      projectOptions: ref([]),
      currentProject: ref('1'),
      showCreateProject: ref(false),
      newProjectForm: ref({}),
      fetchProjectList: vi.fn(),
      handleCreateProject: vi.fn()
    })
    mocks.useFileTableQuery.mockReturnValue({
      fileTableData: ref([]),
      tableLoading: ref(false),
      filterStatus: ref(''),
      filterFileName: ref(''),
      filterFileType: ref(''),
      currentPage: ref(1),
      pageSize: ref(10),
      total: ref(0),
      refreshData: vi.fn(),
      prependUploadedFiles: vi.fn(),
      resetFilter: vi.fn(),
      handleSizeChange: vi.fn(),
      handleCurrentChange: vi.fn(),
      handleRefresh: vi.fn()
    })
    mocks.useFileUploadOperations.mockReturnValue({
      deleteFile: vi.fn(),
      stopPolling: vi.fn(),
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
      clearUploadSelection: vi.fn(),
      openUploadDialog: vi.fn(),
      handleFileChange: vi.fn(),
      handleFileRemove: vi.fn(),
      handleUploadDialogClosed: vi.fn(),
      confirmUpload: vi.fn(),
      retryUploadFile: vi.fn(),
      startProcessing: vi.fn(),
      cancelProcessing: vi.fn()
    })
    mocks.useCalibrationState.mockReturnValue({
      roomInfoLoading: ref(false),
      roomInfoData: ref([]),
      roomInfoTotal: ref(0),
      roomInfoPageNum: ref(1),
      roomInfoPageSize: ref(50),
      roomSumInfo: ref(null),
      showCalibration: ref(false),
      calibrationLoading: ref(false),
      currentFile: ref(null),
      auditSummaryData: {}
    })
    mocks.useCalibrationViewer.mockReturnValue({
      currentViewType: ref('original'),
      preprocessGridfsId: ref(''),
      isPreprocessAvailable: ref(false),
      recognitionMdContent: ref(''),
      recognitionMdLoading: ref(false),
      calibrationPdfUrl: ref(''),
      pdfLoading: ref(false),
      realSurveyReportId: ref('2'),
      switchView: vi.fn(),
      resetCalibrationState: vi.fn(),
      openCalibration: vi.fn(),
      pdfLoaded: vi.fn(),
      pdfLoadError: vi.fn()
    })
    mocks.useRecognitionMarkdown.mockReturnValue({ recognitionHtml: ref('') })
    mocks.useCalibrationActions.mockReturnValue({ handleAuditPass: vi.fn() })
  })

  it('shares editing row state and room mutation handlers with the room workflow', () => {
    const handleCreateRoom = vi.fn()
    const handleDeleteRoom = vi.fn()
    const roomCreateLoading = ref(false)
    const roomDeleteLoading = ref(false)
    mocks.useRoomEditWorkflow.mockReturnValue({
      enterEditMode: vi.fn(),
      exitEditMode: vi.fn(),
      handleSaveData: vi.fn(),
      syncRoomRow: vi.fn(),
      handleRefreshSurveyReport: vi.fn(),
      handleCreateRoom,
      handleDeleteRoom,
      roomCreateLoading,
      roomDeleteLoading,
      reportRefreshLoading: ref(false),
      goRoomInfoPage: vi.fn(),
      goRoomInfoPageSizeChange: vi.fn(),
      fetchAllRoomInfoRows: vi.fn(),
      searchRoomInfosByPages: vi.fn(),
      loadMoreRoomInfo: vi.fn(),
      roomInfoHasMore: ref(false),
      roomInfoLoadingMore: ref(false)
    })

    const page = useFileUploadPage()
    const workflowOptions = mocks.useRoomEditWorkflow.mock.calls[0][0]

    expect(workflowOptions.editingRowId).toBe(page.editingRowId)
    workflowOptions.editingRowId.value = 'room-42'
    expect(page.editingRowId.value).toBe('room-42')
    expect(page.handleCreateRoom).toBe(handleCreateRoom)
    expect(page.handleDeleteRoom).toBe(handleDeleteRoom)
    expect(page.roomCreateLoading).toBe(roomCreateLoading)
    expect(page.roomDeleteLoading).toBe(roomDeleteLoading)
  })
})
