import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useRoomTableInfiniteScroll } from '@/composables/file-upload/useRoomTableInfiniteScroll.js'

function mountInfiniteScroll(options) {
  let api
  const Comp = defineComponent({
    setup() {
      api = useRoomTableInfiniteScroll(options)
      return () => h('div')
    }
  })
  mount(Comp)
  return api
}

describe('useRoomTableInfiniteScroll', () => {
  it('loads more when scroll reaches bottom', async () => {
    const onLoadMore = vi.fn()
    const tableRef = ref({
      $refs: {
        bodyWrapper: {
          scrollHeight: 1000,
          clientHeight: 400,
          scrollTop: 560,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        }
      }
    })

    mountInfiniteScroll({
      tableRef,
      enabled: ref(true),
      hasMore: ref(true),
      loading: ref(false),
      loadingMore: ref(false),
      onLoadMore
    })

    await nextTick()
    const body = tableRef.value.$refs.bodyWrapper
    const handler = body.addEventListener.mock.calls.find(([event]) => event === 'scroll')?.[1]
    expect(handler).toBeTypeOf('function')

    handler()
    await new Promise((resolve) => requestAnimationFrame(resolve))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
