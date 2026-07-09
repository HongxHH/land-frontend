// src/hooks/usePrint.ts
import { ref, nextTick, onMounted, onUnmounted } from 'vue'

export function usePrint() {
  // 控制 Teleport 是否激活（显示打印内容）
  const isPrinting = ref(false)
  let savedTitle = ''

  // 触发打印流程
  const triggerPrint = async () => {
    // 1. 开启 Teleport，渲染打印内容到 #print-target
    isPrinting.value = true
    // 2. 等待 Vue 完成 DOM 更新（关键：避免打印空白页）
    await nextTick()
    // 3. 清空文档标题，避免 PDF 页眉显示页面标题
    savedTitle = document.title
    document.title = ''
    // 4. 调用浏览器打印
    window.print()
  }

  // 打印完成/取消后，关闭 Teleport
  const handleAfterPrint = () => {
    document.title = savedTitle
    savedTitle = ''
    isPrinting.value = false
  }

  // 监听打印事件
  onMounted(() => {
    window.addEventListener('afterprint', handleAfterPrint)
  })
  onUnmounted(() => {
    window.removeEventListener('afterprint', handleAfterPrint)
  })

  return {
    isPrinting,
    triggerPrint,
  }
}
