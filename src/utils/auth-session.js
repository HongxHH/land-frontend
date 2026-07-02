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

/** 顶栏问候语：优先 realName，其次 username */
export function getUserDisplayName() {
  const session = getUserSession()
  const realName = String(session?.realName || '').trim()
  if (realName) return realName
  const username = String(session?.username || '').trim()
  return username || '用户'
}

/** 与后端 SysUserController @SaCheckRole(SUPER_ADMIN|ADMIN|DEVELOPER) 对齐；写操作仍仅管理员 */
export function canAccessUserManagement() {
  const userType = getUserSession()?.userType
  return userType === 'SUPER_ADMIN' || userType === 'ADMIN' || userType === 'DEVELOPER'
}

/** 可修改用户权限类型、启用/禁用、删除等写操作 */
export function canManageUsers() {
  const userType = getUserSession()?.userType
  return userType === 'SUPER_ADMIN' || userType === 'ADMIN'
}

/** 与任务监控页 / 相关 API @SaCheckRole(DEVELOPER) 对齐 */
export function canAccessTaskPoolMonitor() {
  return getUserSession()?.userType === 'DEVELOPER'
}
