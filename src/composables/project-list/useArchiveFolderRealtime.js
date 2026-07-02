import { computed, toValue } from 'vue'
import { useProjectStomp } from '@/composables/project-list/useProjectStomp'
import { PARSE_SCENE_TO_STATE } from '@/composables/project-list/archiveFileRowPresent.js'
import { getArchiveFileRecordId } from '@/composables/project-list/archiveFolderQuery.js'
import {
  fetchUnreadStationNotifications,
  markStationNotificationsRead
} from '@/services/station-notification.service'

/** 归档 Tab：STOMP 实时推送、站内通知已读、列表增量刷新 */
export function useArchiveFolderRealtime(deps) {
  let realtimeRefreshTimer = null
  let realtimePendingRefresh = false
  let readAckTimer = null
  const pendingReadMessageIds = new Set()
  const handledMessageIdOrder = []
  const handledMessageIds = new Set()
  const MAX_HANDLED_MESSAGE_IDS = 2000

  const normalizeNotificationList = (payload) => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.records)) return payload.records
    if (Array.isArray(payload?.list)) return payload.list
    if (Array.isArray(payload?.rows)) return payload.rows
    return []
  }

  const extractMessageId = (payload) => String(payload?.messageId || payload?.id || '').trim()

  const registerHandledMessageId = (messageId) => {
    if (!messageId) return true
    if (handledMessageIds.has(messageId)) return false
    handledMessageIds.add(messageId)
    handledMessageIdOrder.push(messageId)
    if (handledMessageIdOrder.length > MAX_HANDLED_MESSAGE_IDS) {
      const stale = handledMessageIdOrder.shift()
      if (stale) handledMessageIds.delete(stale)
    }
    return true
  }

  const scheduleReadAck = () => {
    if (readAckTimer) return
    readAckTimer = setTimeout(async () => {
      readAckTimer = null
      const ids = [...pendingReadMessageIds]
      if (!ids.length) return
      try {
        await markStationNotificationsRead(ids)
        ids.forEach((id) => pendingReadMessageIds.delete(id))
      } catch (error) {
        console.error('确认站内通知已读失败:', error)
      }
    }, 600)
  }

  const scheduleRealtimeRefresh = () => {
    realtimePendingRefresh = true
    deps.clearArchiveQueryCache?.()
    if (!toValue(deps.active)) return
    if (realtimeRefreshTimer) return
    realtimeRefreshTimer = setTimeout(async () => {
      realtimeRefreshTimer = null
      if (!realtimePendingRefresh || !toValue(deps.active)) return
      realtimePendingRefresh = false
      await deps.fetchArchiveFiles?.({ force: true })
    }, 1200)
  }

  const applyRealtimeRowState = (payload) => {
    const archiveFiles = toValue(deps.archiveFiles)
    if (!Array.isArray(archiveFiles)) return false
    const targetFileId = String(payload?.fileId || '')
    const nextState = PARSE_SCENE_TO_STATE[payload?.scene] || ''
    if (!targetFileId || !nextState) return false
    let hit = false
    const next = archiveFiles.map((row) => {
      const rowFileId = String(getArchiveFileRecordId(row) || row?.fileId || '')
      if (rowFileId !== targetFileId) return row
      hit = true
      return {
        ...row,
        fileState: nextState,
        isVerified: payload?.isVerified ?? row.isVerified,
        verificationErrorReason: payload?.verificationErrorReason ?? row.verificationErrorReason
      }
    })
    deps.setArchiveFiles?.(next)
    return hit
  }

  const handleRealtimeFileUpdate = (payload) => {
    const scene = String(payload?.scene || '')
    if (!scene) return

    const isParseTerminalScene = scene === 'PARSE_SUCCESS' || scene === 'PARSE_FAILED' || scene === 'PARSE_FAIL'
    const isParseProgressScene = scene === 'PARSE_START' || scene === 'PARSE_PENDING'

    const rowUpdated = applyRealtimeRowState(payload)

    if (isParseProgressScene) {
      if (!rowUpdated) scheduleRealtimeRefresh()
      return
    }

    if (isParseTerminalScene) {
      scheduleRealtimeRefresh()
      return
    }

    if (!rowUpdated) scheduleRealtimeRefresh()
  }

  const handleIncomingNotification = (payload) => {
    if (!payload || typeof payload !== 'object') return
    if (
      String(payload?.projectId || '')
      && String(payload.projectId) !== String(toValue(deps.projectId) || '')
    ) {
      return
    }
    const messageId = extractMessageId(payload)
    if (messageId && !registerHandledMessageId(messageId)) return
    if (messageId) {
      pendingReadMessageIds.add(messageId)
      scheduleReadAck()
    }
    handleRealtimeFileUpdate(payload)
  }

  const fetchUnreadNotifications = async (projectId) => {
    const pid = String(projectId || toValue(deps.projectId) || '').trim()
    if (!pid) return
    try {
      const res = await fetchUnreadStationNotifications([pid])
      if (res?.data?.code !== 200) return
      const records = normalizeNotificationList(res?.data?.data)
      records.forEach((item) => {
        const body = item?.payload ?? item?.content ?? item?.data ?? item?.extra ?? item
        let parsed = body
        if (typeof body === 'string') {
          try {
            parsed = JSON.parse(body)
          } catch {
            parsed = {}
          }
        }
        const merged = {
          ...(parsed && typeof parsed === 'object' ? parsed : {}),
          messageId: item?.messageId ?? item?.id ?? parsed?.messageId
        }
        if (String(merged?.projectId || '') && String(merged.projectId) !== pid) return
        handleIncomingNotification(merged)
      })
    } catch (error) {
      console.error('补拉站内未读通知失败:', error)
    }
  }

  const flushReadAckNow = async () => {
    if (readAckTimer) {
      clearTimeout(readAckTimer)
      readAckTimer = null
    }
    const ids = [...pendingReadMessageIds]
    if (!ids.length) return
    try {
      await markStationNotificationsRead(ids)
      ids.forEach((id) => pendingReadMessageIds.delete(id))
    } catch (error) {
      console.error('离开前确认站内通知已读失败:', error)
    }
  }

  const resetRealtimeState = () => {
    realtimePendingRefresh = false
    if (realtimeRefreshTimer) {
      clearTimeout(realtimeRefreshTimer)
      realtimeRefreshTimer = null
    }
    pendingReadMessageIds.clear()
    handledMessageIds.clear()
    handledMessageIdOrder.length = 0
  }

  const cleanupRealtime = () => {
    flushReadAckNow()
    resetRealtimeState()
    if (readAckTimer) {
      clearTimeout(readAckTimer)
      readAckTimer = null
    }
  }

  const {
    connectionState,
    reconnectCount,
    maxReconnectAttempts
  } = useProjectStomp({
    projectIdRef: () => toValue(deps.projectId),
    activeRef: () => Boolean(toValue(deps.active) && toValue(deps.projectId)),
    onFileUpdate: (payload) => handleIncomingNotification(payload),
    onConnected: async (projectId) => {
      await fetchUnreadNotifications(projectId)
    }
  })

  const socketStatus = computed(() => connectionState.value)
  const socketStatusText = computed(() => {
    if (connectionState.value === 'connected') return '实时连接: 已连接'
    if (connectionState.value === 'connecting') return '实时连接: 连接中'
    if (connectionState.value === 'reconnecting') {
      return `实时连接: 重连中 ${reconnectCount.value}/${maxReconnectAttempts}`
    }
    if (connectionState.value === 'stopped') return '实时连接: 重连已停止'
    if (connectionState.value === 'error') return '实时连接: 异常'
    if (connectionState.value === 'disconnected') return '实时连接: 已断开'
    return '实时连接: 空闲'
  })

  const onTabActivated = async () => {
    const active = toValue(deps.active)
    if (!active) return
    await fetchUnreadNotifications(toValue(deps.projectId))
    const selectedArchiveId = toValue(deps.selectedArchiveId)
    if (selectedArchiveId) {
      await deps.fetchArchiveFiles?.({ force: realtimePendingRefresh })
    }
    if (realtimePendingRefresh) {
      scheduleRealtimeRefresh()
    }
  }

  return {
    socketStatus,
    socketStatusText,
    fetchUnreadNotifications,
    flushReadAckNow,
    resetRealtimeState,
    cleanupRealtime,
    onTabActivated,
    getRealtimePendingRefresh: () => realtimePendingRefresh
  }
}
