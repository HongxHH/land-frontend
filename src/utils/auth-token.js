import { clearUserSession } from '@/utils/auth-session.js'

/**
 * Sa-Token 与后端 sa-token.token-name 一致（默认 satoken）。
 */
export const SA_TOKEN_HEADER_NAME = 'satoken'

const TOKEN_KEY = 'landcheck_satoken'

export function getToken() {
  const t = sessionStorage.getItem(TOKEN_KEY)
  return t != null && String(t).trim() !== '' ? String(t).trim() : ''
}

export function setToken(token) {
  if (token != null && String(token).trim() !== '') {
    sessionStorage.setItem(TOKEN_KEY, String(token).trim())
  } else {
    sessionStorage.removeItem(TOKEN_KEY)
  }
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem('isAuthenticated')
  sessionStorage.removeItem('userId')
  clearUserSession()
}

export function isLoggedIn() {
  return Boolean(getToken())
}

/** 供 fetch 等手动组头使用 */
export function withSaTokenHeaders(headers = {}) {
  const next = { ...headers }
  const t = getToken()
  if (t) {
    next[SA_TOKEN_HEADER_NAME] = t
  }
  return next
}
