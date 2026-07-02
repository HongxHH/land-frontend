import axios from 'axios'

/** @param {{ username: string, password: string, realName: string, phone?: string, email?: string }} payload */
export const registerUser = (payload) => axios.post('/api/auth/register', payload).then((r) => r.data)

/** @returns {Promise<{ code: number, data?: object, msg?: string }>} */
export const fetchCurrentUser = () => axios.get('/api/auth/me').then((r) => r.data)

/**
 * @param {{ realName: string, phone?: string, email?: string, oldPassword?: string, newPassword?: string }} payload
 * @returns {Promise<{ code: number, data?: object, msg?: string }>}
 */
export const updateProfile = (payload) => axios.put('/api/auth/profile', payload).then((r) => r.data)

/**
 * @param {object} params
 * @returns {Promise<{ code: number, data?: unknown[], total?: number }>}
 */
export const listUsersPage = (params) =>
  axios.get('/api/user/list', { params }).then((r) => r.data)
