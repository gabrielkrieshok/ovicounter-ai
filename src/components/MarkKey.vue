<script setup>
import { t } from '@/i18n'

/* The mark language, said the same way everywhere: found by the app, you kept
 * it, you removed it, you added one. Before this, Welcome said "you kept it"
 * and Your fixes said "machine, kept" about the same green ring.
 *
 * Always drawn on paper, never over the dark stage — the glyphs are the mark
 * hues and have to read the way the marks themselves do. The glyph carries the
 * colour; the words stay ink, because green and pink are not dark enough to be
 * small text (tools/check-contrast.mjs). */
defineProps({
  /* Which marks to explain. Your fixes has no proposed marks left to see. */
  show: { type: Array, default: () => ['found', 'kept', 'removed', 'added'] },
  /* `column` on Welcome, `row` in the strip under the laptop photograph. */
  layout: { type: String, default: 'column' },
})
</script>

<template>
  <ul class="key" :class="layout">
    <li v-for="kind in show" :key="kind" class="entry">
      <span class="glyph" :class="kind" aria-hidden="true">
        <template v-if="kind === 'removed'">✕</template>
        <template v-else-if="kind === 'added'">+</template>
      </span>
      <span class="t-body">{{ t(`markKey.${kind}`) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.key {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.key.row {
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sp-5) var(--sp-16);
}

.entry {
  display: flex;
  align-items: center;
  gap: var(--sp-10);
  white-space: nowrap;
}

.glyph {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  font: 700 18px/1 var(--font-sans);
}
.glyph.found,
.glyph.kept {
  width: 16px;
  height: 16px;
  margin: 1px;
  border-radius: 50%;
}
.glyph.found { border: 2.5px dashed var(--blue); }
.glyph.kept { border: 2.5px solid var(--green); }
.glyph.removed { color: var(--red); }
.glyph.added { color: var(--pink); font-size: 22px; }
</style>
