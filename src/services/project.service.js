import axios from 'axios'

export const getProjectList = async () => {
  const res = await axios.post('/api/project/projects/query', {
    pageNum: 1,
    pageSize: 500,
    sortField: 'updateTime',
    sortDirection: 'desc',
  })
  const code = Number(res?.data?.code)
  if (code !== 200) {
    return res
  }
  const records = Array.isArray(res?.data?.data?.records) ? res.data.data.records : []
  return {
    ...res,
    data: {
      ...res.data,
      data: records,
    },
  }
}

export const queryProjects = (payload, config = {}) =>
  axios.post('/api/project/projects/query', payload, config)

export const getParsedSurveyReportsByProject = (projectId, config = {}) =>
  axios.get(`/api/project/${projectId}/survey-reports/parsed`, config)

export const queryProjectAreaComparison = (projectId, config = {}) =>
  axios.get(`/api/project/${projectId}/area-comparison/triple-lines`, config)

export const createProject = (projectName, projectTime) =>
  axios.post('/api/project/create', null, {
    params: { projectName, projectTime },
  })

export const refreshSurveyReportsByProject = (projectId) =>
  axios.post(`/api/project/${projectId}/refresh-survey-reports`)

export const getSurveyRoomInfo = (projectId, reportId) =>
  axios.get(`/api/project/${projectId}/survey-reports/${reportId}/room-info`)

/** 户室分页查询（审核页懒加载） */
export const queryRoomInfos = (payload) => axios.post('/api/project/room-info/query', payload)

export const querySurveyReports = (payload) =>
  axios.post('/api/project/survey-reports/query', payload)

export const updateSurveyReportInfo = (payload) =>
  axios.put('/api/project/survey-report-info/update', payload)

export const queryOperationAuditLogs = (payload) =>
  axios.post('/api/operation-audit/query', payload)

export const queryProjectDetails = (payload, config = {}) =>
  axios.post('/api/project/projects/query/detail', payload, config)

export const deleteProjectById = (projectId) => axios.delete(`/api/project/${projectId}`)

export const queryPlanningReviewForms = (payload) =>
  axios.post('/api/project/planning-review-forms/query', payload)

export const queryPlanningReviewRows = (payload) =>
  axios.post('/api/project/planning-review-rows/query', payload)

export const updatePlanningReviewRow = (payload) =>
  axios.put('/api/project/planning-review-row/update', payload)

export const createPlanningReviewRow = (payload) =>
  axios.post('/api/project/planning-review-row/create', payload)

export const deletePlanningReviewRow = (rowId) =>
  axios.delete(`/api/project/planning-review-row/${rowId}`)

export const queryProjectPartySummaryForms = (payload) =>
  axios.post('/api/project/project-party-summary-forms/query', payload)

export const updateProjectPartySummaryForm = (payload) =>
  axios.put('/api/project/project-party-summary-form/update', payload)

export const queryCapacityIndicatorForms = (payload) =>
  axios.post('/api/project/capacity-indicator-forms/query', payload)

export const updateCapacityIndicatorForm = (payload) =>
  axios.put('/api/project/capacity-indicator-form/update', payload)
