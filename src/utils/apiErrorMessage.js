/**
 * 从 axios 错误响应体读取后端 AjaxJson.msg（如 429 限流、业务错误码等）
 */
export function getApiErrorMessage(error, fallback) {
  const msg = error?.response?.data?.msg
  if (msg != null && String(msg).trim() !== '') {
    return String(msg).trim()
  }
  return fallback
}
