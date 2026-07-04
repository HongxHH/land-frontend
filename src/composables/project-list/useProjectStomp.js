import '@/utils/ensureBufferPolyfill.js'
import { onBeforeUnmount, ref, watch } from 'vue'
import SockJS from 'sockjs-client/dist/sockjs'
import { Client } from '@stomp/stompjs'
import { getToken, SA_TOKEN_HEADER_NAME } from '@/utils/auth-token'

function buildWsUrl() {
  const token = getToken()
  if (!token) {
    return '/api/ws'
  }
  return `/api/ws?${SA_TOKEN_HEADER_NAME}=${encodeURIComponent(token)}`
}

function safeParseMessage(frameBody) {
  try {
    return JSON.parse(frameBody || '{}')
  } catch {
    return null
  }
}

export function useProjectStomp({
  projectIdRef,
  activeRef,
  onFileUpdate,
  onConnected,
  disconnectGraceMs = 45000
}) {
  let client = null
  let subscriptions = []
  let currentProjectId = ''
  let isDisconnecting = false
  let reconnectAttempts = 0
  let reconnectTimer = null
  let disconnectGraceTimer = null
  const maxReconnectAttempts = 5
  const connectionState = ref('idle')
  const reconnectCount = ref(0)

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const clearDisconnectGraceTimer = () => {
    if (disconnectGraceTimer) {
      clearTimeout(disconnectGraceTimer)
      disconnectGraceTimer = null
    }
  }

  const unsubscribeAll = () => {
    subscriptions.forEach((sub) => {
      try {
        sub.unsubscribe()
      } catch {
        // ignore unsubscribe errors
      }
    })
    subscriptions = []
  }

  const shouldStayConnected = (projectId) => {
    const active = typeof activeRef === 'function' ? Boolean(activeRef()) : true
    const current = typeof projectIdRef === 'function' ? String(projectIdRef() || '') : ''
    return active && current === String(projectId || '')
  }

  const getLiveProjectId = () =>
    typeof projectIdRef === 'function' ? String(projectIdRef() || '') : ''

  /** 传输层保持 STOMP 连接，仅更换 project 相关订阅（及全局兜底 topic）。 */
  const resubscribeForProject = (projectId) => {
    if (!client?.connected || !projectId) return
    currentProjectId = String(projectId)
    connectionState.value = 'connected'
    subscribeProjectTopics(projectId)
    if (typeof onConnected === 'function') {
      Promise.resolve(onConnected(String(projectId || ''))).catch((error) => {
        console.error('STOMP resubscribe onConnected failed:', error)
      })
    }
  }

  const disconnect = async (resetAttempts = true) => {
    isDisconnecting = true
    clearReconnectTimer()
    clearDisconnectGraceTimer()
    if (resetAttempts) {
      reconnectAttempts = 0
      reconnectCount.value = 0
    }
    unsubscribeAll()
    if (!client) {
      isDisconnecting = false
      currentProjectId = ''
      connectionState.value = 'disconnected'
      return
    }

    try {
      await client.deactivate({ force: true })
    } catch {
      // ignore disconnect errors
    } finally {
      client = null
      currentProjectId = ''
      isDisconnecting = false
      connectionState.value = 'disconnected'
    }
  }

  const scheduleGracefulDisconnect = (resetAttempts = true) => {
    if (disconnectGraceMs <= 0) {
      disconnect(resetAttempts)
      return
    }
    if (disconnectGraceTimer) return
    disconnectGraceTimer = setTimeout(() => {
      disconnectGraceTimer = null
      disconnect(resetAttempts)
    }, disconnectGraceMs)
  }

  const shouldDeliverPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return false
    const pid = getLiveProjectId()
    const msgProjectId = payload.projectId
    if (msgProjectId == null || msgProjectId === '') return true
    if (!pid) return false
    return String(msgProjectId) === String(pid)
  }

  const wrapTopicHandler = (handler) => (message) => {
    const payload = safeParseMessage(message.body)
    if (!payload || typeof handler !== 'function') return
    if (!shouldDeliverPayload(payload)) return
    handler(payload)
  }

  const subscribeProjectTopics = (projectId) => {
    if (!client || !projectId) return
    unsubscribeAll()

    const fileTopic = `/topic/project/${projectId}/file-updates`
    const globalFileTopic = '/topic/file-updates'

    subscriptions.push(client.subscribe(globalFileTopic, wrapTopicHandler(onFileUpdate)))
    subscriptions.push(client.subscribe(fileTopic, wrapTopicHandler(onFileUpdate)))
  }

  const scheduleReconnect = () => {
    const pid = getLiveProjectId()
    if (isDisconnecting || reconnectTimer || !pid || !shouldStayConnected(pid) || !getToken()) return
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.warn(`STOMP reconnect stopped after ${maxReconnectAttempts} attempts`)
      connectionState.value = 'stopped'
      return
    }

    reconnectAttempts += 1
    reconnectCount.value = reconnectAttempts
    connectionState.value = 'reconnecting'
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      const retryPid = getLiveProjectId()
      if (!retryPid || !shouldStayConnected(retryPid)) return
      connect(retryPid, true)
    }, 2000)
  }

  const connect = (projectId, isReconnect = false) => {
    if (!projectId) return
    if (!getToken()) {
      connectionState.value = 'stopped'
      return
    }
    if (!isReconnect && client?.connected && String(currentProjectId) === String(projectId)) return

    if (
      !isReconnect
      && client?.connected
      && String(projectId) !== String(currentProjectId)
      && shouldStayConnected(projectId)
    ) {
      resubscribeForProject(projectId)
      return
    }

    disconnect(!isReconnect).finally(() => {
      const livePid = getLiveProjectId() || String(projectId || '')
      if (!livePid || !shouldStayConnected(livePid)) return

      currentProjectId = String(livePid)
      connectionState.value = isReconnect ? 'reconnecting' : 'connecting'
      client = new Client({
        reconnectDelay: 0,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectHeaders: {
          [SA_TOKEN_HEADER_NAME]: getToken()
        },
        webSocketFactory: () => new SockJS(buildWsUrl()),
        debug: () => { }
      })

      client.onConnect = () => {
        const subPid = getLiveProjectId()
        if (!subPid || !shouldStayConnected(subPid)) return
        reconnectAttempts = 0
        reconnectCount.value = 0
        connectionState.value = 'connected'
        currentProjectId = String(subPid)
        subscribeProjectTopics(subPid)
        if (typeof onConnected === 'function') {
          Promise.resolve(onConnected(String(subPid || ''))).catch((error) => {
            console.error('STOMP connected callback failed:', error)
          })
        }
      }

      client.onWebSocketClose = (event) => {
        if (isDisconnecting) return
        console.warn('STOMP websocket closed:', event?.code, event?.reason || '')
        connectionState.value = 'disconnected'
        scheduleReconnect()
      }

      client.onWebSocketError = (event) => {
        console.error('STOMP websocket error:', event)
        connectionState.value = 'error'
        scheduleReconnect()
      }

      client.onStompError = (frame) => {
        const message = frame.headers?.message || ''
        const body = frame.body || ''
        console.error('STOMP broker error:', message, body)
        connectionState.value = 'error'
        // broker 拒绝（如订阅鉴权失败）时立即断开，避免在无效连接上继续重试同一批订阅
        if (/订阅|非法|未登录|禁止/i.test(`${message} ${body}`)) {
          disconnect(false)
        }
        scheduleReconnect()
      }

      client.activate()
    })
  }

  watch(
    [projectIdRef, activeRef],
    ([projectId, active]) => {
      const pid = String(projectId || '')
      if (!active || !pid) {
        scheduleGracefulDisconnect()
        return
      }
      clearDisconnectGraceTimer()
      reconnectAttempts = 0
      connect(pid, false)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    scheduleGracefulDisconnect()
  })

  return {
    disconnect,
    connectionState,
    reconnectCount,
    maxReconnectAttempts
  }
}
