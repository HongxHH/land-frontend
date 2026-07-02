import axios from 'axios'

export const fetchUnreadStationNotifications = (projectIds = []) => {
  const normalized = Array.isArray(projectIds)
    ? projectIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  const params = {}
  if (normalized.length > 0) {
    params.projectIds = normalized.join(',')
  }
  return axios.get('/api/station-notification/unread', { params })
}

/** 登录后拉取：不传 projectIds，由后端按「最近站内未读」返回 */
export const fetchUnreadStationNotificationsAfterLogin = () =>
  fetchUnreadStationNotifications([])

export const markStationNotificationsRead = (messageIds = []) => {
  const normalized = Array.isArray(messageIds)
    ? messageIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []
  return axios.post('/api/station-notification/read', { messageIds: normalized })
}
