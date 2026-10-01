<script setup>
import { computed, ref } from 'vue'

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
 * More than one finished step folds into a single row — "✓ Photograph · Crop ·
 * Measure" — which opens into the separate steps when tapped. That is the
 * accordion: what is done stays out of the way, at one row however far along
 * the strip is, and the steps are there the moment someone wants one back. A
 * 768px-tall laptop had no room for four finished rows above Check the marks. */
const props = defineProps({
  part: { type: String, default: 'all' }, // before | after | all
})
const emit = defineEmits(['went'])

const { steps, current, furthest, canGo, go, label } = useSteps()
const expanded = ref(false)

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

const folded = computed(() => props.part === 'before' && rows.value.length > 1 && !expanded.value)
const summary = computed(() =>
  rows.value
    .filter((row) => !row.step.skipped)
    .map((row) => label(row.step))
    .join(' · '),
)

function choose(row) {
  if (!row.open) return
  go(row.index)
  emit('went')
}
</script>

<template>
  <div v-if="folded" class="step-list before">
    <button class="row done open" type="button" :aria-expanded="false" @click="expanded = true">
      <span class="num t-title" aria-hidden="true">✓</span>
      <span class="name t-title">{{ summary }}</span>
      <span class="state t-title" aria-hidden="true">▸</span>
    </button>
  </div>
  <ol v-else-if="current >= 0 && rows.length" class="step-list" :class="part">
    <li v-for="row in rows" :key="row.step.key">
      <component
        :is="row.open ? 'button' : 'div'"
        class="row"
        :class="{ done: row.done, here: row.here, open: row.open }"
        :type="row.open ? 'button' : undefined"
        :aria-current="row.here ? 'step' : undefined"
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
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--paper);
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
  background: var(--paper);
}
.row.done,
.row.here {
  color: var(--ink);
}
.row {
  border-left: 6px solid transparent;
}
.row.here {
  border-left-color: var(--action);
}
.row.open:active {
  background: var(--panel);
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
