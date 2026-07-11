import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const MIN_TABLE_HEIGHT = 160
const TABLE_CONTAINER_PAD_Y = 26
const LAYOUT_SLACK_PX = 2

function resolveCardRoot(cardRef) {
  const raw = cardRef.value
  return raw?.$el ?? raw ?? null
}

/**
 * 按 section-card 内「card body − toolbar − table-container padding」计算 el-table height，
 * 使表格撑满剩余区域并在数据多时表内滚动。
 */
export function useSectionCardTableHeight() {
  const cardRef = ref(null)
  const tableHeight = ref(MIN_TABLE_HEIGHT)
  let resizeObserver = null

  const measure = () => {
    const root = resolveCardRoot(cardRef)
    const body = root?.querySelector('.el-card__body')
    const toolbar = body?.querySelector('.table-toolbar')
    if (!body || !toolbar) return
    const next = Math.floor(
      body.clientHeight - toolbar.offsetHeight - TABLE_CONTAINER_PAD_Y - LAYOUT_SLACK_PX
    )
    tableHeight.value = Math.max(MIN_TABLE_HEIGHT, next)
  }

  const bind = () => {
    resizeObserver?.disconnect()
    resizeObserver = null
    const root = resolveCardRoot(cardRef)
    if (!root) return
    if (typeof ResizeObserver === 'undefined') {
      measure()
      return
    }
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(root)
    measure()
  }

  onMounted(() => {
    nextTick(bind)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return {
    cardRef,
    tableHeight,
    measure,
    bind,
  }
}
