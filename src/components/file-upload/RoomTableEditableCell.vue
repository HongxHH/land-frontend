<template>
  <span
    v-if="!active"
    class="room-cell-display"
    :title="displayTitle"
    @click.stop="emit('activate')"
  >
    {{ display }}
  </span>
  <el-input
    v-else
    ref="inputRef"
    :model-value="row[field]"
    size="small"
    class="room-table-field"
    :type="inputType"
    :min="nonNegative ? 0 : undefined"
    step="any"
    :placeholder="placeholder"
    @update:model-value="onInput"
    @keydown="onKeydown"
    @blur="emit('commit')"
    @keydown.enter="emit('commit')"
  />
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { clampRoomAreaInput, sanitizeRoomAreaInputText } from '@/utils/roomInfoValidation.js'

const props = defineProps({
  row: { type: Object, required: true },
  field: { type: String, required: true },
  display: { type: String, default: '' },
  displayTitle: { type: String, default: '' },
  active: { type: Boolean, default: false },
  inputType: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  nonNegative: { type: Boolean, default: false },
  maxDecimals: { type: Number, default: null },
})

const emit = defineEmits(['activate', 'commit', 'update:field'])

const inputRef = ref(null)

const onInput = (value) => {
  let next = value
  if (props.nonNegative) {
    next = sanitizeRoomAreaInputText(String(value ?? ''))
  }
  if (props.maxDecimals != null) {
    next = clampRoomAreaInput(next, props.maxDecimals)
  }
  props.row[props.field] = next
}

const onKeydown = (event) => {
  if (!props.nonNegative) return
  if (event.key === '-' || event.key === 'Subtract') {
    event.preventDefault()
  }
}

watch(
  () => props.active,
  async (isActive) => {
    if (!isActive) return
    await nextTick()
    inputRef.value?.focus?.()
  }
)
</script>
