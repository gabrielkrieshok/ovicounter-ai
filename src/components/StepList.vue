<script setup>
import { computed } from 'vue'

import { t } from '@/i18n'
import { useSteps } from '@/lib/use-steps'

/* The steps of this strip as ruled rows — the accordion on the laptop, and the
 * list in the phone's step sheet.
 *
 * `before` draws the finished steps above the current screen's own header,
 * collapsed to one row each; `after` draws the steps still to come below its
 * actions. Together with the screen between them, the left column reads top
 * to bottom as the strip's whole path, open at the step being worked on.
 * `all` draws every step, the current one marked, for the phone's sheet.
 *
 * A step that can be returned to is a button; one that cannot (Measure runs on
 * its own; nothing reopens once the strip is counted) is plain text. The
 * current step is marked with a yellow edge — "you are here".
 *
 * Every step keeps its own row, finished ones included (Oct 2026 — they were
 * folded into one row for a while; seeing all six, every time, orients better
 * than saving 130px). Where that makes a laptop screen taller than the window,
 * the screen scrolls (App.vue) rather than cutting anything off. */
const props = defineProps({
  part: { type: String, default: 'all' }, // before | after | all
})
const emit = defineEmits(['went'])

const { steps, current, furthest, canGo, go, label } = useSteps()

const rows = computed(() =>
  steps.value
    .map((step, index) => ({
      step,
      index,
      done:
        !step.skipped &&
        !step.optional &&
        (index < current.value || (index > current.value && index <= furthest.value)),
      here: index === current.value,
      open: canGo(index),
    }))
    .filter((row) =>
      props.part === 'before'
        ? row.index < current.value
        : props.part === 'after'
          ? row.index > current.value
          : true,
    ),
)

function choose(row) {
  if (!row.open) return
  go(row.index)
  emit('went')
}
</script>

<template>
  <ol v-if="current >= 0 && rows.length" class="step-list" :class="part">
    <li v-for="row in rows" :key="row.step.key">
      <component
        :is="row.open ? 'button' : 'div'"
        class="row"
        :class="{ done: row.done, here: row.here, open: row.open }"
        :type="row.open ? 'button' : undefined"
        :aria-current="row.here ? 'step' : undefined"
        :data-step="row.step.key"
        @click="choose(row)"
      >
        <span class="num t-title">{{ row.index + 1 }}</span>
        <span class="name t-title">
          {{ label(row.step) }}
          <span v-if="row.step.skipped" class="aside t-label">{{ t('steps.skipped') }}</span>
          <span v-else-if="row.step.optional" class="aside t-label">{{ t('steps.optional') }}</span>
        </span>
        <span v-if="row.done && !row.here" class="state t-title" aria-hidden="true">✓</span>
      </component>
    </li>
  </ol>
</template>

<style scoped>
/* Not `.steps`: Your fixes names its numbered instructions that, and a parent's
   scoped rule reaches a child component's root. */
/* Steps that are not this one sit on the sunken panel, in grey, so the open
   step — on paper, numbered in yellow — is the one thing that reads as here.
   Finished steps are --muted (still legible: they can be returned to);
   upcoming ones --disabled. */
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--panel);
}
.step-list.before {
  border-bottom: var(--bd) solid var(--ink);
}
.step-list.after {
  border-top: var(--bd) solid var(--ink);
}
li + li {
  border-top: var(--bd-inner) solid var(--ink);
}

.row {
  width: 100%;
  min-height: var(--hit-min);
  display: flex;
  align-items: stretch;
  text-align: left;
  color: var(--disabled);
  background: var(--panel);
}
.row.done,
.row.open {
  color: var(--muted);
}
.row.here {
  color: var(--ink);
  background: var(--paper);
}
.row {
  border-left: 6px solid transparent;
}
.row.here {
  border-left-color: var(--action);
}
.row.open:hover,
.row.open:active {
  color: var(--ink);
}

.num {
  flex: none;
  width: 44px;
  display: grid;
  place-items: center;
  border-right: var(--bd-inner) solid currentColor;
}
.name {
  flex: 1;
  display: flex;
  align-items: center;
  padding: var(--sp-8) var(--sp-14);
}
.name .aside {
  margin-left: var(--sp-10);
}

.state {
  flex: none;
  width: 44px;
  display: grid;
  place-items: center;
}
</style>
