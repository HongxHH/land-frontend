import { canAccessTaskPoolMonitor, canAccessUserManagement } from '@/utils/auth-session.js'

/** @param {import('vue-router').RouteLocationNormalized} to */
export function isRouteAccessDenied(to) {
  if (to.meta?.requiresUserManagement && !canAccessUserManagement()) {
    return { name: 'Dashboard', replace: true }
  }
  if (to.meta?.requiresDeveloper && !canAccessTaskPoolMonitor()) {
    return { name: 'Dashboard', replace: true }
  }
  return null
}
