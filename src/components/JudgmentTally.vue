<script setup>
import { t } from '@/i18n'

/* The person's own judgments, counted: removed, added, split — and on Strip
 * result, the machine marks they kept.
 *
 * This is the tally non-negotiable 1 explicitly allows on Your fixes: every
 * number here is a count of something a human did. It is never a machine
 * total, and it never appears on Refine, where a running number would let the
 * operator tune the sliders until it said what they expected.
 *
 * The numeral takes the mark's hue at `tally` size, the only size at which the
 * mark hues are allowed as text; the label beside it is ink. A trailing slot
 * is a fourth cell — Undo sits there on the phone. */
defineProps({
  /* [{ kind: 'kept' | 'removed' | 'added' | 'split', n: Number }] */
  cells: { type: Array, required: true },
})
</script>

<template>
  <div class="tally">
    <div v-for="cell in cells" :key="cell.kind" class="cell">
      <span class="n t-tally" :class="cell.kind">{{ cell.n }}</span>
      <span class="what t-title">
        <span v-if="cell.kind === 'removed'" aria-hidden="true">✕ </span>
        <span v-else-if="cell.kind === 'added'" aria-hidden="true">+ </span>
        {{ t(`tally.${cell.kind}`) }}
      </span>
    </div>
    <div v-if="$slots.default" class="cell extra"><slot /></div>
  </div>
</template>

<style scoped>
.tally {
  display: flex;
  border-top: var(--bd) solid var(--ink);
  border-bottom: var(--bd) solid var(--ink);
  background: var(--paper);
}
.cell {
  flex: 1;
  min-width: 0;
  padding: var(--sp-10) var(--sp-12);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.cell + .cell {
  border-left: var(--bd) solid var(--ink);
}
.cell.extra {
  padding: 0;
  align-items: stretch;
}

/* The `title` role a step down, so three labels share a 390px row. Long
   languages wrap to a second line rather than being cut: "+ acrescentadas". */
.what {
  font-size: 18px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.n.kept { color: var(--green); }
.n.removed { color: var(--red); }
.n.added { color: var(--pink); }
.n.split { color: var(--ink); }
</style>
