import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { renderRecognitionMarkdownHtml } from '@/utils/recognitionMarkdownHtml.js'

const DEBOUNCE_MS = 300

export function useRecognitionMarkdown({ recognitionMdContent }) {
  const debouncedMd = ref('')
  let debounceTimer = null

  const clearDebounceTimer = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  watch(
    recognitionMdContent,
    (next) => {
      clearDebounceTimer()
      const value = String(next ?? '')
      if (!value.trim()) {
        debouncedMd.value = ''
        return
      }
      debounceTimer = setTimeout(() => {
        debouncedMd.value = value
        debounceTimer = null
      }, DEBOUNCE_MS)
    },
    { immediate: true }
  )

  onBeforeUnmount(clearDebounceTimer)

  const recognitionHtml = computed(() => renderRecognitionMarkdownHtml(debouncedMd.value))
  return { recognitionHtml }
}
