import { ref, onUnmounted } from 'vue'
import { isActiveFileProcessState } from '@/utils/fileStatePresent.js'

export function useBatchPoller(apiCheckFunction, onPollingEnd, options = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? 5000
  const onPollTick = options.onPollTick ?? null
  const isPolling = ref(false)
  const pollTimer = ref(null)
  const abortController = ref(null)

  const stopPolling = () => {
    if (pollTimer.value) {
      clearTimeout(pollTimer.value)
      pollTimer.value = null
    }
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    isPolling.value = false
  }

  const startPolling = () => {
    if (isPolling.value) return
    stopPolling()
    isPolling.value = true

    const executePoll = async () => {
      if (!isPolling.value) return

      try {
        abortController.value = new AbortController()
        const res = await apiCheckFunction({ signal: abortController.value.signal })

        let rawList = []
        if (Array.isArray(res.data.data)) {
          rawList = res.data.data
        } else if (res.data.data && Array.isArray(res.data.data.records)) {
          rawList = res.data.data.records
        } else if (res.data.data && Array.isArray(res.data.data.rows)) {
          rawList = res.data.data.rows
        } else if (res.data.data && Array.isArray(res.data.data.list)) {
          rawList = res.data.data.list
        }

        const hasPending = rawList.some((item) =>
          isActiveFileProcessState(item.fileState)
        )

        if (typeof onPollTick === 'function') {
          onPollTick(rawList)
        }

        if (!hasPending) {
          stopPolling()
          if (typeof onPollingEnd === 'function') {
            onPollingEnd()
          }
          return
        }
        pollTimer.value = setTimeout(executePoll, pollIntervalMs)
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('轮询查询失败：', error)
          stopPolling()
        }
      }
    }

    executePoll()
  }

  onUnmounted(() => stopPolling())

  return { isPolling, startPolling, stopPolling }
}
