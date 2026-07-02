const USER_SESSION_KEY = 'landcheck_user'

/** @typedef {{ id?: number|string, userType?: string, username?: string, realName?: string }} UserSession */

/** @param {Record<string, unknown>|null|undefined} user */
export function setUserSession(user) {
  if (!user || typeof user !== 'object') {
    sessionStorage.removeItem(USER_SESSION_KEY)
    return
  }
  const snapshot = {
    id: user.id,
    userType: user.userType,
    username: user.username,
    realName: user.realName
  }
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(snapshot))
}

/** @returns {UserSession|null} */
export function getUserSession() {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function clearUserSession() {
  sessionStorage.removeItem(USER_SESSION_KEY)
}

/** @returns {string} 优先真实姓名，否则用户名 */
export function getUserDisplayName() {
  const session = getUserSession()
  const name = session?.realName?.trim() || session?.username?.trim()
  return name || '用户'
}

/** 与后端 SysUserController @SaCheckRole(SUPER_ADMIN|ADMIN) 对齐 */
export function canAccessUserManagement() {
  const userType = getUserSession()?.userType
  return userType === 'SUPER_ADMIN' || userType === 'ADMIN'
}
