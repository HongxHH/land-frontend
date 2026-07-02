/**
 * 与后端 {@code UserTypeConstants} / sys_user.user_type 一致。
 */
export const USER_TYPE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: '超级管理员' },
  { value: 'ADMIN', label: '管理员' },
  { value: 'DEVELOPER', label: '开发人员' },
  { value: 'USER', label: '普通用户' }
]

const LEGACY_DEPT_USER = 'DEPT_USER'

export function userTypeLabel(code) {
  if (code == null || code === '') return '—'
  if (code === LEGACY_DEPT_USER) return '普通用户'
  const hit = USER_TYPE_OPTIONS.find((o) => o.value === code)
  return hit ? hit.label : code
}
