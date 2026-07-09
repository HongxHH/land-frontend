import axios from 'axios'
import { clearAuth, getToken, SA_TOKEN_HEADER_NAME } from '@/utils/auth-token'
import { savePostLoginRedirect } from '@/utils/auth-redirect.js'
import { getPermissionDeniedMessage, isForbiddenApiPayload } from '@/utils/apiErrorMessage'
import logger from '@/utils/logger'

export const REQUEST_ID_HEADER = 'X-Request-Id'

/** 最近一次完成/失败请求的 traceId，供非 HTTP 错误兜底 */
let lastTraceId = null

export function getLastTraceId() {
  return lastTraceId
}

export function getTraceIdFromConfig(config) {
  if (!config?.headers) {
    return null
  }
  const headers = config.headers
  const raw = headers[REQUEST_ID_HEADER]
    ?? headers[REQUEST_ID_HEADER.toLowerCase()]
    ?? (typeof headers.get === 'function' ? headers.get(REQUEST_ID_HEADER) : null)
  if (raw == null || String(raw).trim() === '') {
    return null
  }
  return String(raw).trim()
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fe-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function redirectToLogin() {
  const path = `${window.location?.pathname || ''}${window.location?.search || ''}`
  if (path.startsWith('/login') || path.startsWith('/register')) {
    return
  }
  savePostLoginRedirect(path)
  clearAuth()
  window.location.href = '/login'
}

function rememberTraceId(traceId) {
  if (traceId != null && String(traceId).trim() !== '') {
    lastTraceId = String(traceId).trim()
  }
}

function normalizeForbiddenPayload(payload) {
  if (payload && typeof payload === 'object' && isForbiddenApiPayload(payload)) {
    payload.msg = getPermissionDeniedMessage()
  }
}

function readResponseTraceId(response) {
  const fromHeader = response?.headers?.[REQUEST_ID_HEADER.toLowerCase()]
    || response?.headers?.[REQUEST_ID_HEADER]
  if (fromHeader != null && String(fromHeader).trim() !== '') {
    rememberTraceId(fromHeader)
    return
  }
  rememberTraceId(getTraceIdFromConfig(response?.config))
}

axios.interceptors.request.use((config) => {
  const token = getToken()
  config.headers = config.headers || {}
  if (token) {
    config.headers[SA_TOKEN_HEADER_NAME] = token
  }
  if (!getTraceIdFromConfig(config)) {
    config.headers[REQUEST_ID_HEADER] = createRequestId()
  }
  return config
})

axios.interceptors.response.use(
  (response) => {
    readResponseTraceId(response)
    const d = response?.data
    if (d && typeof d === 'object' && Number(d.code) === 401) {
      redirectToLogin()
      return Promise.reject(new Error(d.msg || '未登录'))
    }
    normalizeForbiddenPayload(d)
    return response
  },
  (error) => {
    readResponseTraceId(error?.response)
    normalizeForbiddenPayload(error.response?.data)
    const status = error.response?.status
    const code = error.response?.data?.code
    const method = error.config?.method?.toUpperCase?.() || 'UNKNOWN'
    const url = error.config?.url || 'unknown'
    const traceId = getTraceIdFromConfig(error.config) || lastTraceId
    logger.error('HTTP 请求失败', {
      traceId,
      method,
      url,
      status: status ?? 'network',
      code: code ?? null,
      msg: error.response?.data?.msg ?? error.message,
    }, error)
    if (status === 401 || Number(code) === 401) {
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)
