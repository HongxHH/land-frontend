import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import { downloadGridFsFile, getFilesByProject, queryFiles } from '@/services/file.service'

export function useContractLandManagement({ filterProject, currentProjectInfo, onContractLandChanged }) {
  const contractLandList = ref([])
  const selectedContract = reactive({ id: '', contractNumber: '', fileRecordId: '' })
  const currentLandParcelList = ref([])

  const contractDialogVisible = ref(false)
  const contractWorkspaceVisible = ref(false)
  const contractWorkspacePdfUrl = ref('')
  const contractWorkspacePdfLoading = ref(false)
  const contractWorkspaceFileName = ref('')
  const contractFileOptions = ref([])
  const contractFileOptionsLoading = ref(false)
  const selectedPreviewFileId = ref('')
  const contractFormRef = ref(null)
  const contractFormLoading = ref(false)
  const setContractFormRef = (formRef) => {
    contractFormRef.value = formRef
  }

  const contractForm = reactive({
    id: '',
    fileRecordId: '',
    contractNumber: '',
    transferor: '',
    transferee: '',
    remark: ''
  })

  const contractFormRules = reactive({
    contractNumber: [{ required: true, message: '请输入合同编号', trigger: 'blur' }]
  })

  const landParcelDialogVisible = ref(false)
  const landParcelFormRef = ref(null)
  const landParcelFormLoading = ref(false)
  const setLandParcelFormRef = (formRef) => {
    landParcelFormRef.value = formRef
  }

  const landParcelForm = reactive({
    id: '',
    contractId: '',
    parcelCode: '',
    parcelName: '',
    plannedUse: '',
    totalArea: null,
    residentialArea: null,
    commercialArea: null,
    commercialResidentialRatio: null,
    remark: ''
  })

  const landParcelFormRules = reactive({
    parcelCode: [{ required: true, message: '请输入地块编号', trigger: 'blur' }],
    plannedUse: [{ required: true, message: '请选择规划用途', trigger: 'change' }],
    totalArea: [{ required: true, message: '请输入地块总面积', trigger: 'blur' }],
    commercialResidentialRatio: [{ required: true, message: '商住比必填', trigger: 'blur' }]
  })

  const normalizeRatio = (value) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return Number(n.toFixed(4))
  }

  const hasMoreThan4Decimals = (value) => {
    const text = String(value ?? '')
    if (!text.includes('.')) return false
    const decimal = text.split('.')[1] || ''
    return decimal.length > 4
  }

  const calcLandAreasByRatio = () => {
    const totalArea = Number(landParcelForm.totalArea)
    const ratio = normalizeRatio(landParcelForm.commercialResidentialRatio)

    if (!Number.isFinite(totalArea) || totalArea < 0 || ratio === null || ratio < 0 || ratio > 1) {
      landParcelForm.commercialArea = null
      landParcelForm.residentialArea = null
      return
    }

    const commercialArea = Number((totalArea * ratio).toFixed(2))
    const residentialArea = Number((totalArea - commercialArea).toFixed(2))
    landParcelForm.commercialArea = commercialArea
    landParcelForm.residentialArea = residentialArea
  }

  const notifyContractLandChanged = async () => {
    if (typeof onContractLandChanged !== 'function') return
    try {
      await onContractLandChanged()
    } catch (error) {
      console.error('合同地块变更后刷新汇总失败:', error)
    }
  }

  const normalizePlannedUse = (value) => {
    const mapping = {
      住宅: 'RESIDENTIAL',
      商业: 'COMMERCIAL',
      商住混合: 'COMMERCIAL_AND_RESIDENTIAL',
      RESIDENTIAL: 'RESIDENTIAL',
      COMMERCIAL: 'COMMERCIAL',
      COMMERCIAL_AND_RESIDENTIAL: 'COMMERCIAL_AND_RESIDENTIAL'
    }
    return mapping[value] || value || ''
  }

  const clearWorkspacePdfUrl = () => {
    if (contractWorkspacePdfUrl.value) {
      URL.revokeObjectURL(contractWorkspacePdfUrl.value)
      contractWorkspacePdfUrl.value = ''
    }
  }

  const loadContractPdfByFileRecordId = async (fileRecordId) => {
    const targetId = Number(fileRecordId || 0)
    clearWorkspacePdfUrl()
    contractWorkspacePdfLoading.value = false
    if (!targetId) return

    contractWorkspacePdfLoading.value = true
    try {
      const res = await queryFiles({
        pageNum: 1,
        pageSize: 1,
        projectId: Number(currentProjectInfo.id || filterProject.value || 0),
        fileId: String(targetId)
      })
      const file = res?.data?.data?.records?.[0]
      if (!file?.gridfsId) return
      const pdfRes = await downloadGridFsFile(file.gridfsId, { responseType: 'blob' })
      const blob = new Blob([pdfRes.data], { type: 'application/pdf' })
      contractWorkspacePdfUrl.value = URL.createObjectURL(blob)
      contractWorkspaceFileName.value = file.originalName || ''
    } catch (error) {
      console.error('获取合同预览文件失败:', error)
      ElMessage.warning('合同预览加载失败，不影响字段编辑')
    } finally {
      contractWorkspacePdfLoading.value = false
    }
  }

  const loadProjectContractFiles = async () => {
    const pid = Number(currentProjectInfo.id || filterProject.value || 0)
    if (!pid) {
      contractFileOptions.value = []
      return
    }
    contractFileOptionsLoading.value = true
    try {
      const res = await getFilesByProject(pid)
      const records = Array.isArray(res?.data?.data) ? res.data.data : []
      const contextLabelMap = {
        CONTRACT: '合同',
        DATA_FILE: '数据文件',
        SURVEY_REPORT: '实测报告',
        OTHER: '其他'
      }
      contractFileOptions.value = records
        .map((item) => ({
          value: String(item.id),
          label: `[${contextLabelMap[String(item?.fileContextType || '')] || '文件'}] ${item.originalName || `文件-${item.id}`}`,
          uploadTime: item.uploadTime || ''
        }))
        .sort((a, b) => String(b.uploadTime).localeCompare(String(a.uploadTime)))
    } catch (error) {
      console.error('加载项目合同文件列表失败:', error)
      contractFileOptions.value = []
      ElMessage.warning('合同文件列表加载失败，请重试')
    } finally {
      contractFileOptionsLoading.value = false
    }
  }

  const handleSelectPreviewFile = async (fileRecordId) => {
    selectedPreviewFileId.value = fileRecordId ? String(fileRecordId) : ''
    if (!selectedPreviewFileId.value) {
      clearWorkspacePdfUrl()
      contractWorkspaceFileName.value = ''
      return
    }
    await loadContractPdfByFileRecordId(selectedPreviewFileId.value)
  }

  let contractListAbortController = null
  let contractListRequestSeq = 0

  const isAbortError = (error) =>
    error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError'

  const fetchContractListByProjectId = async (projectId) => {
    if (!projectId) return false

    contractListAbortController?.abort()
    contractListAbortController = new AbortController()
    const { signal } = contractListAbortController
    const seq = ++contractListRequestSeq

    try {
      const res = await axios.post(
        '/api/project/contracts/query',
        {
          projectId: Number(projectId),
          current: 1,
          size: 100
        },
        { signal }
      )
      if (seq !== contractListRequestSeq) return false

      if (res.data.code === 200) {
        contractLandList.value = (res.data.data.records || []).map((contract) => ({
          id: contract.id || '',
          fileRecordId: contract.fileRecordId || '',
          createTime: contract.createTime || '',
          updateTime: contract.updateTime || '',
          contractNumber: contract.contractNumber || '',
          transferor: contract.transferor || '',
          transferee: contract.transferee || '',
          totalArea: contract.totalArea || null,
          residentialArea: contract.residentialArea || null,
          commercialArea: contract.commercialArea || null,
          plannedUse: contract.plannedUse || '',
          remark: contract.remark || ''
        }))

        Object.assign(selectedContract, { id: '', contractNumber: '', fileRecordId: '' })
        currentLandParcelList.value = []
        return true
      }
      return false
    } catch (error) {
      if (isAbortError(error) || seq !== contractListRequestSeq) return false
      console.error('查询项目合同列表失败:', error)
      ElMessage.error('获取合同列表失败，请重试')
      contractLandList.value = []
      return false
    }
  }

  const fetchLandParcelByContractId = async (contractId) => {
    if (!contractId) return

    try {
      const res = await axios.get(`/api/project/contract/${contractId}/with-parcels`)
      if (res.data.code === 200) {
        currentLandParcelList.value = res.data.data.parcels || []
      } else {
        currentLandParcelList.value = []
        ElMessage.warning('该合同暂无关联地块信息')
      }
    } catch (error) {
      console.error('查询合同地块信息失败:', error)
      ElMessage.error('获取地块信息失败，请重试')
      currentLandParcelList.value = []
    }
  }

  const handleContractRowClick = async (row) => {
    if (row.id === selectedContract.id) return

    Object.assign(selectedContract, {
      id: row.id,
      contractNumber: row.contractNumber || '',
      fileRecordId: row.fileRecordId || ''
    })

    await fetchLandParcelByContractId(row.id)
  }

  const addContract = () => {
    Object.assign(contractForm, {
      id: '',
      fileRecordId: '',
      contractNumber: '',
      transferor: '',
      transferee: '',
      remark: ''
    })
    contractFormRef.value?.clearValidate()
    contractDialogVisible.value = true
  }

  const openContractWorkspace = async (row) => {
    contractWorkspaceVisible.value = true
    contractWorkspaceFileName.value = row?.contractNumber ? `合同编号：${row.contractNumber}` : ''
    await loadProjectContractFiles()
    selectedPreviewFileId.value = String(row?.fileRecordId || selectedContract.fileRecordId || '')
    await loadContractPdfByFileRecordId(selectedPreviewFileId.value)
  }

  const editContract = (row) => {
    Object.assign(contractForm, {
      id: row.id,
      fileRecordId: row.fileRecordId || '',
      contractNumber: row.contractNumber || '',
      transferor: row.transferor || '',
      transferee: row.transferee || '',
      remark: row.remark || ''
    })
    contractFormRef.value?.clearValidate()
    openContractWorkspace(row)
  }

  const submitContractForm = async () => {
    if (!contractFormRef.value) return

    try {
      await contractFormRef.value.validate()
    } catch {
      ElMessage.warning('请完善必填项后提交')
      return
    }

    contractFormLoading.value = true
    try {
      if (!contractForm.id) {
        ElMessage.warning('新增合同已下线，请通过合同上传流程创建')
        return
      }

      const requestData = {
        id: Number(contractForm.id),
        contractNumber: contractForm.contractNumber,
        transferor: contractForm.transferor,
        transferee: contractForm.transferee,
        remark: contractForm.remark
      }

      const res = await axios.put('/api/project/contract-info/update', requestData)

      if (res.data.code === 200) {
        contractDialogVisible.value = false
        contractWorkspaceVisible.value = false
        clearWorkspacePdfUrl()
        await fetchContractListByProjectId(currentProjectInfo.id)
        await notifyContractLandChanged()
      } else {
        ElMessage.error('保存失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      console.error('保存合同信息失败:', error)
      ElMessage.error('保存合同信息失败，请重试')
    } finally {
      contractFormLoading.value = false
    }
  }

  const addLandParcel = () => {
    if (!selectedContract.id) {
      ElMessage.warning('请先选中一个合同')
      return
    }

    Object.assign(landParcelForm, {
      id: '',
      contractId: selectedContract.id,
      parcelCode: '',
      parcelName: '',
      plannedUse: '',
      totalArea: null,
      residentialArea: null,
      commercialArea: null,
      commercialResidentialRatio: null,
      remark: ''
    })
    landParcelFormRef.value?.clearValidate()
    loadProjectContractFiles()
    selectedPreviewFileId.value = String(selectedContract.fileRecordId || '')
    loadContractPdfByFileRecordId(selectedPreviewFileId.value)
    landParcelDialogVisible.value = true
  }

  const editLandParcel = (row) => {
    Object.assign(landParcelForm, {
      id: row.id,
      contractId: selectedContract.id,
      parcelCode: row.parcelCode || '',
      parcelName: row.parcelName || '',
      plannedUse: normalizePlannedUse(row.plannedUse),
      totalArea: row.totalArea || null,
      residentialArea: row.residentialArea || null,
      commercialArea: row.commercialArea || null,
      commercialResidentialRatio: row.commercialResidentialRatio || null,
      remark: row.remark || ''
    })
    landParcelFormRef.value?.clearValidate()
    loadProjectContractFiles()
    selectedPreviewFileId.value = String(selectedContract.fileRecordId || '')
    loadContractPdfByFileRecordId(selectedPreviewFileId.value)
    landParcelDialogVisible.value = true
  }

  const submitLandParcelForm = async () => {
    if (!landParcelFormRef.value) return
    if (landParcelForm.commercialResidentialRatio === null || landParcelForm.commercialResidentialRatio === '' || Number.isNaN(Number(landParcelForm.commercialResidentialRatio))) {
      ElMessage.warning('商住比必填，不填写无法保存')
      return
    }
    if (hasMoreThan4Decimals(landParcelForm.commercialResidentialRatio)) {
      ElMessage.warning('商住比最多支持4位小数')
      return
    }
    const normalizedRatio = normalizeRatio(landParcelForm.commercialResidentialRatio)
    if (normalizedRatio === null || normalizedRatio < 0 || normalizedRatio > 1) {
      ElMessage.warning('商住比必须是 0~1 之间的小数（例如 0.6）')
      return
    }
    landParcelForm.commercialResidentialRatio = normalizedRatio
    calcLandAreasByRatio()

    try {
      await landParcelFormRef.value.validate()
    } catch {
      ElMessage.warning('请完善必填项后提交')
      return
    }

    landParcelFormLoading.value = true
    try {
      let res
      if (!landParcelForm.id) {
        const createData = {
          contractId: Number(landParcelForm.contractId),
          parcelCode: landParcelForm.parcelCode,
          parcelName: landParcelForm.parcelName,
          plannedUse: normalizePlannedUse(landParcelForm.plannedUse),
          totalArea: Number(landParcelForm.totalArea),
          residentialArea: Number(landParcelForm.residentialArea || 0),
          commercialArea: Number(landParcelForm.commercialArea || 0),
          commercialResidentialRatio: normalizedRatio,
          remark: landParcelForm.remark
        }
        res = await axios.post('/api/project/land-parcel/create', createData)
      } else {
        const updateData = {
          id: landParcelForm.id,
          parcelCode: landParcelForm.parcelCode,
          parcelName: landParcelForm.parcelName,
          plannedUse: normalizePlannedUse(landParcelForm.plannedUse),
          totalArea: landParcelForm.totalArea,
          residentialArea: Number(landParcelForm.residentialArea || 0),
          commercialArea: Number(landParcelForm.commercialArea || 0),
          commercialResidentialRatio: normalizedRatio,
          remark: landParcelForm.remark
        }
        res = await axios.put('/api/project/land-parcel/update', updateData)
      }

      if (res.data.code === 200) {
        landParcelDialogVisible.value = false
        const keepSelectedContractId = String(selectedContract.id || '')
        await fetchContractListByProjectId(currentProjectInfo.id)
        const matchedContract = contractLandList.value.find((item) => String(item.id) === keepSelectedContractId)
        if (matchedContract) {
          Object.assign(selectedContract, {
            id: matchedContract.id,
            contractNumber: matchedContract.contractNumber || '',
            fileRecordId: matchedContract.fileRecordId || ''
          })
          await fetchLandParcelByContractId(matchedContract.id)
        } else {
          currentLandParcelList.value = []
        }
        await notifyContractLandChanged()
      } else {
        ElMessage.error('操作失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      console.error('地块操作失败:', error)
      ElMessage.error('操作地块信息失败，请重试')
    } finally {
      landParcelFormLoading.value = false
    }
  }

  const deleteContract = async (row) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除该合同信息吗？此操作会同时删除关联的地块信息，且不可撤销。',
        '删除合同确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
          dangerMode: true
        }
      )

      const res = await axios.delete(`/api/project/contract-info/${row.id}`)

      if (res.data.code === 200) {
        await fetchContractListByProjectId(currentProjectInfo.id)
        Object.assign(selectedContract, { id: '', contractNumber: '', fileRecordId: '' })
        currentLandParcelList.value = []
        await notifyContractLandChanged()
      } else {
        ElMessage.error('删除失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      if (error.name !== 'ElMessageBoxCloseError') {
        console.error('删除合同失败:', error)
      } else {
        ElMessage.info('已取消删除操作')
      }
    }
  }

  const deleteLandParcel = async (row) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除该地块信息吗？此操作不可撤销。',
        '删除确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
          dangerMode: true
        }
      )

      const res = await axios.delete(`/api/project/land-parcel/${row.id}`)

      if (res.data.code === 200) {
        const keepSelectedContractId = String(selectedContract.id || '')
        await fetchContractListByProjectId(currentProjectInfo.id)
        const matchedContract = contractLandList.value.find((item) => String(item.id) === keepSelectedContractId)
        if (matchedContract) {
          Object.assign(selectedContract, {
            id: matchedContract.id,
            contractNumber: matchedContract.contractNumber || '',
            fileRecordId: matchedContract.fileRecordId || ''
          })
          await fetchLandParcelByContractId(matchedContract.id)
        } else {
          currentLandParcelList.value = []
        }
        await notifyContractLandChanged()
      } else {
        ElMessage.error('删除失败：' + (res.data.msg || '系统异常'))
      }
    } catch (error) {
      if (error.name !== 'ElMessageBoxCloseError') {
        console.error('删除地块失败:', error)
      } else {
        ElMessage.info('已取消删除操作')
      }
    }
  }

  watch(filterProject, (newVal) => {
    if (!newVal) {
      contractLandList.value = []
      Object.assign(selectedContract, { id: '', contractNumber: '', fileRecordId: '' })
      currentLandParcelList.value = []
      contractFileOptions.value = []
      selectedPreviewFileId.value = ''
      clearWorkspacePdfUrl()
    }
  })

  watch(contractWorkspaceVisible, (visible) => {
    if (!visible) {
      clearWorkspacePdfUrl()
      contractWorkspacePdfLoading.value = false
    }
  })

  watch(
    () => [landParcelForm.totalArea, landParcelForm.commercialResidentialRatio],
    () => {
      calcLandAreasByRatio()
    }
  )

  onBeforeUnmount(() => {
    clearWorkspacePdfUrl()
  })

  return {
    contractLandList,
    selectedContract,
    currentLandParcelList,
    contractDialogVisible,
    contractWorkspaceVisible,
    contractWorkspacePdfUrl,
    contractWorkspacePdfLoading,
    contractWorkspaceFileName,
    contractFileOptions,
    contractFileOptionsLoading,
    selectedPreviewFileId,
    contractForm,
    contractFormRules,
    contractFormLoading,
    setContractFormRef,
    submitContractForm,
    landParcelDialogVisible,
    landParcelForm,
    landParcelFormRules,
    landParcelFormLoading,
    setLandParcelFormRef,
    submitLandParcelForm,
    fetchContractListByProjectId,
    handleContractRowClick,
    addContract,
    editContract,
    deleteContract,
    addLandParcel,
    editLandParcel,
    deleteLandParcel,
    loadProjectContractFiles,
    handleSelectPreviewFile
  }
}
