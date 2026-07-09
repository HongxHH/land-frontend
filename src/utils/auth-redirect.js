const POST_LOGIN_REDIRECT_KEY = 'landcheck_post_login_redirect'

/** @param {unknown} raw */
export function normalizePostLoginRedirect(raw) {
  const value = String(raw || '').trim()
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return ''
  }
  const path = value.split('?')[0]
  if (
    path === '/login' ||
    path.startsWith('/login/') ||
    path === '/register' ||
    path.startsWith('/register/')
  ) {
    return ''
  }
  return value
}

/** @param {string} fullPath */
export function savePostLoginRedirect(fullPath) {
  const normalized = normalizePostLoginRedirect(fullPath)
  if (!normalized) return
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, normalized)
  } catch {
    /* ignore */
  }
}

function clearSavedPostLoginRedirect() {
  try {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  } catch {
    /* ignore */
  }
}

/** @param {unknown} queryRedirect */
export function resolvePostLoginRedirect(queryRedirect) {
  const fromQuery = normalizePostLoginRedirect(queryRedirect)
  if (fromQuery) {
    clearSavedPostLoginRedirect()
    return fromQuery
  }
  try {
    const fromStorage = normalizePostLoginRedirect(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY))
    clearSavedPostLoginRedirect()
    return fromStorage
  } catch {
    clearSavedPostLoginRedirect()
    return ''
  }
}
