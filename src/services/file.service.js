import axios from 'axios'

export const getFilesByProject = (projectId) => axios.get(`/api/file/project/${projectId}`)

export const queryFiles = (payload, config = {}) => axios.post('/api/file/query', payload, config)

export const deleteFileById = (fileId) => axios.delete(`/api/file/${fileId}`)

export const parseFileById = (fileId) => axios.post(`/api/file/parse/${fileId}`)

export const cancelParseByFileId = (fileId, reason = '用户手动取消') =>
  axios.post(`/api/file/cancel/${fileId}`, null, {
    params: { reason },
  })

export const uploadFile = (formData, config = {}) =>
  axios.post('/api/file/upload', formData, config)

export const downloadGridFsFile = (gridfsId, config = {}) =>
  axios.get(`/api/file/download/gridfs/${gridfsId}`, config)

export const getProjectArchives = (projectId) =>
  axios.get(`/api/file/project/${projectId}/archives`)

export const createProjectArchive = (payload) => {
  const projectId = payload?.projectId
  if (projectId) {
    return axios.post(`/api/file/project/${projectId}/archives`, payload)
  }
  return axios.post('/api/file/project/archives', payload)
}

export const deleteProjectArchive = (projectId, archiveId) =>
  axios.delete(`/api/file/project/delete-archives/${projectId}/${archiveId}`)

export const getTaskPoolStatus = () => axios.get('/api/file/task/status')

export const getTaskDetailByTaskId = (taskId) => axios.get(`/api/file/task/detail/${taskId}`)

export const getParseJobFlow = (parseJobId) => axios.get(`/api/file/parse-job/${parseJobId}/flow`)

export const cancelTaskByTaskId = (taskId, reason = '用户主动取消') =>
  axios.post(`/api/file/task/cancel/${taskId}`, null, {
    params: { reason },
  })

export const getSystemRuntimeStatus = () => axios.get('/api/file/task/system-status')

export const updateTaskPoolSize = (payload) => axios.post('/api/file/task/pool-size', payload)

export const enqueueAllPendingParse = () => axios.post('/api/file/task/enqueue-pending-parse')
