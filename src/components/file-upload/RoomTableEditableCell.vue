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
    :placeholder="placeholder"
    @update:model-value="onInput"
    @blur="emit('commit')"
    @keydown.enter="emit('commit')"
  />
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  row: { type: Object, required: true },
  field: { type: String, required: true },
  display: { type: String, default: '' },
  displayTitle: { type: String, default: '' },
  active: { type: Boolean, default: false },
  inputType: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
})

const emit = defineEmits(['activate', 'commit', 'update:field'])

const inputRef = ref(null)

const onInput = (value) => {
  props.row[props.field] = value
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
