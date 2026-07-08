const FORBIDDEN_MSG_PATTERN = /无此角色|无此权限|角色不符/

/**
 * 判断 AjaxJson 或 axios 错误体是否为无权限（403 / Sa-Token 角色不符）
 */
export function isForbiddenApiPayload(payload) {
  if (!payload || typeof payload !== 'object') return false
  const code = Number(payload.code ?? payload.response?.data?.code)
  if (code === 403) return true
  const msg = String(payload.msg ?? payload.response?.data?.msg ?? '')
  return FORBIDDEN_MSG_PATTERN.test(msg)
}

/** 无权限场景统一提示文案 */
export function getPermissionDeniedMessage(fallback = '暂无权限') {
  return fallback
}

/**
 * 从 axios 错误响应体读取后端 AjaxJson.msg（如 429 限流、业务错误码等）
 */
export function getApiErrorMessage(error, fallback) {
  if (isForbiddenApiPayload(error)) {
    return getPermissionDeniedMessage()
  }
  const msg = error?.response?.data?.msg
  if (msg != null && String(msg).trim() !== '') {
    return String(msg).trim()
  }
  return fallback
}
