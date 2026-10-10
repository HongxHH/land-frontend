<template>
  <el-dialog
    :model-value="modelValue"
    title="自动归类规则"
    width="960px"
    append-to-body
    align-center
    class="smart-import-rule-dialog"
    body-class="smart-import-rule-dialog__body"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="smart-import-rule__summary">{{ guide.summary }}</p>
    <ol class="smart-import-rule__list">
      <li
        v-for="(item, index) in guide.categories"
        :key="item.type"
        class="smart-import-rule__item"
        :class="{ 'is-wide': spansFullRow(index) }"
      >
        <div class="smart-import-rule__heading">
          <span class="smart-import-rule__index">{{ index + 1 }}</span>
          <span class="smart-import-rule__label">{{ item.label }}</span>
          <span class="smart-import-rule__formats">{{ item.formats }}</span>
        </div>

        <p v-if="item.sections.length" class="smart-import-rule__primary-label">文件名包含</p>
        <div class="smart-import-rule__tags">
          <span v-for="word in item.keywords" :key="word" class="smart-import-rule__tag">{{
            word
          }}</span>
        </div>

        <div v-if="item.sections.length" class="smart-import-rule__sections">
          <div v-for="section in item.sections" :key="section.label" class="smart-import-rule__section">
            <div class="smart-import-rule__section-label">
              {{ section.label }}
              <span v-if="section.hint" class="smart-import-rule__hint">{{ section.hint }}</span>
            </div>
            <div class="smart-import-rule__tags">
              <span
                v-for="word in section.keywords"
                :key="`${section.label}-${word}`"
                class="smart-import-rule__tag is-muted"
                >{{ word }}</span
              >
            </div>
          </div>
        </div>

        <div class="smart-import-rule__examples">
          <span class="smart-import-rule__example-label">例如</span>
          <span v-for="name in item.examples" :key="name" class="smart-import-rule__example">
            <template v-for="(part, partIndex) in exampleParts(name, item)" :key="partIndex">
              <em v-if="part.hit">{{ part.text }}</em>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
        </div>
      </li>
    </ol>
  </el-dialog>
</template>

<script setup>
import { getSmartImportRuleGuide } from '@/utils/localFolderFileMatcher.js'

defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const guide = getSmartImportRuleGuide()

function spansFullRow(index) {
  const item = guide.categories[index]
  if (item.sections.length > 0) return true
  const next = guide.categories[index + 1]
  const rowEnds = !next || next.sections.length > 0
  return rowEnds && index % 2 === 0
}

function exampleParts(filename, item) {
  const keywords = [
    ...item.keywords,
    ...item.sections.flatMap((section) => section.keywords),
  ].sort((left, right) => right.length - left.length)
  const match = keywords.find((keyword) => filename.includes(keyword))
  if (!match) return [{ text: filename, hit: false }]
  const index = filename.indexOf(match)
  return [
    { text: filename.slice(0, index), hit: false },
    { text: match, hit: true },
    { text: filename.slice(index + match.length), hit: false },
  ].filter((part) => part.text)
}
</script>

<style>
.smart-import-rule-dialog {
  max-width: calc(100vw - 48px);
}

.smart-import-rule-dialog__body {
  max-height: min(76vh, 720px);
  overflow-y: auto;
  padding-top: 8px;
}
</style>

<style scoped>
.smart-import-rule__summary {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
}

.smart-import-rule__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.smart-import-rule__item {
  min-width: 0;
  padding: 14px 16px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.smart-import-rule__item.is-wide {
  grid-column: 1 / -1;
}

.smart-import-rule__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.smart-import-rule__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex: none;
}

.smart-import-rule__label {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.smart-import-rule__formats {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  flex: none;
}

.smart-import-rule__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.smart-import-rule__tag {
  padding: 5px 10px;
  border-radius: 8px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  color: #1e3a8a;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.smart-import-rule__tag.is-muted {
  background: #fff;
  color: #334155;
  font-weight: 600;
}

.smart-import-rule__primary-label {
  margin: 12px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.smart-import-rule__primary-label + .smart-import-rule__tags {
  margin-top: 8px;
}

.smart-import-rule__sections {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.smart-import-rule__section {
  min-width: 0;
}

.smart-import-rule__section-label {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.smart-import-rule__hint {
  font-weight: 500;
  color: #94a3b8;
}

.smart-import-rule__section .smart-import-rule__tags {
  margin-top: 8px;
}

.smart-import-rule__examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.smart-import-rule__example-label {
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
}

.smart-import-rule__example {
  padding: 4px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  line-height: 1.4;
}

.smart-import-rule__example em {
  font-style: normal;
  font-weight: 700;
  color: #1d4ed8;
}

@media (max-width: 800px) {
  .smart-import-rule__list,
  .smart-import-rule__sections {
    grid-template-columns: 1fr;
  }
}
</style>
