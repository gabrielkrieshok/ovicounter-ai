<script setup>
import { t } from '@/i18n'

/* What one finger does on Manually refine (Oct 2026): Remove · Keep · Add ·
 * Split. Each carries the glyph of the mark it makes — ✕ red, ○ green, + pink,
 * ╱ ink — so the tools double as the key to the marks. The chosen tool is
 * filled ink, its glyph still in its hue, so the choice never rests on colour
 * alone. Remove is the default: culling is the job.
 *
 * Undo sits at the end of the row (Oct 2026, Gabriel): it takes back the last
 * thing a tool did, and beside Done it read as undoing the whole step. It is a
 * plain button, set apart from the radio group, never a fifth tool. */
const props = defineProps({
  modelValue: { type: String, required: true },
  canUndo: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'undo'])

/* The ratified label carries its own arrow; the arrow goes in the glyph row. */
const undoLabel = () => t('fixes.undo').replace(/^↩\s*/, '')

const TOOLS = [
  { key: 'remove', glyph: '✕' },
  { key: 'keep', glyph: '' },
  { key: 'add', glyph: '+' },
  { key: 'split', glyph: '╱' },
]
</script>

<template>
  <div class="tool-row">
  <div class="tools" role="radiogroup" :aria-label="t('fixes.toolsLabel')">
    <button
      v-for="tool in TOOLS"
      :key="tool.key"
      class="tool"
      :class="[tool.key, { on: props.modelValue === tool.key }]"
      type="button"
      role="radio"
      :aria-checked="props.modelValue === tool.key"
      @click="emit('update:modelValue', tool.key)"
    >
      <span class="glyph t-title" aria-hidden="true">
        <span v-if="tool.key === 'keep'" class="ring" />
        <template v-else>{{ tool.glyph }}</template>
      </span>
      <span class="name t-label">{{ t(`fixes.tool${tool.key.charAt(0).toUpperCase()}${tool.key.slice(1)}`) }}</span>
    </button>
  </div>
  <button class="tool undo" type="button" :disabled="!props.canUndo" @click="emit('undo')">
    <span class="glyph t-title" aria-hidden="true">↩</span>
    <span class="name t-label">{{ undoLabel() }}</span>
  </button>
  </div>
</template>

<style scoped>
.tool-row {
  display: flex;
  gap: var(--sp-8);
}
.tools {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: var(--bd) solid var(--ink);
}
.tool {
  min-height: var(--hit-secondary);
  padding: var(--sp-5) 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: var(--paper);
  color: var(--ink);
}
.tool + .tool {
  border-left: var(--bd) solid var(--ink);
}
.undo {
  flex: none;
  min-width: 64px;
  padding: var(--sp-5) var(--sp-8);
  border: var(--bd) solid var(--ink);
}
.undo:disabled {
  color: var(--disabled);
  cursor: default;
}
.tool.on {
  background: var(--ink);
  color: var(--paper);
}
.glyph {
  height: 22px;
  display: grid;
  place-items: center;
}
.remove .glyph { color: var(--red); }
.add .glyph { color: var(--pink); }
.ring {
  width: 16px;
  height: 16px;
  border: 2.5px solid var(--green);
  border-radius: 50%;
}
</style>
