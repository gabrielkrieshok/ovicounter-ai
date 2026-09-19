<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import { bandFor, pointerFraction } from '@/lib/bands'
import { t } from '@/i18n'

/* The band scale, and the human count standing on it.
 *
 * The hierarchy here is the whole point of §6.4: if the band dominates and the
 * number hides, the tool looks evasive; if the number dominates, the band is
 * decoration. So the band is the shape of the answer — the widest, loudest
 * thing on the screen — and the count is the largest single element ON it,
 * black and unqualified, standing on a pointer inside its own zone.
 *
 * The count is the operator's. It carries no `~`, no grey, and no hedge,
 * because a human counted it. The machine's provisional total lives in the
 * header, struck through, and that is the only place it survives.
 *
 * Zone widths come from the band config's `weight` and have nothing to do with
 * how many counts each band spans, which is why the pointer is positioned
 * within its own zone rather than along a single linear scale.
 */

const props = defineProps({
  count: { type: Number, required: true },
  bands: { type: Array, required: true },
})

const active = computed(() => bandFor(props.count, props.bands))
const pointer = computed(() => pointerFraction(props.count, props.bands) * 100)

/* The number is kept on screen while the stem stays exactly where it belongs.
 *
 * The stem is the measurement, so it never moves. The number is a label for it,
 * and a label that runs off the edge of the phone is worse than one sitting
 * slightly off-centre above its own stem. The handoff's example count lands at
 * 30% and never meets this; a strip in the top band does, every time, and the
 * demo strip is such a strip.
 *
 * Measured rather than guessed at, because the number's width depends on how
 * many digits the count has and the type is not monospaced by accident — 18 and
 * 1842 need different amounts of room. */
const root = ref(null)
const countEl = ref(null)
const countLeft = ref(null)

function placeCount() {
  const scale = root.value
  const label = countEl.value
  if (!scale || !label) return
  const width = scale.clientWidth
  const half = label.offsetWidth / 2
  if (!width || !half) return
  const wanted = (pointer.value / 100) * width
  countLeft.value = `${Math.min(width - half, Math.max(half, wanted))}px`
}

onMounted(placeCount)
watch(() => [props.count, props.bands], placeCount, { flush: 'post' })
</script>

<template>
  <div class="scale" ref="root">
    <div class="zones">
      <span
        v-for="band in bands"
        :key="band.key"
        class="zone"
        :class="{ active: band.key === active.key }"
        :style="{ flex: band.weight }"
      />
    </div>

    <div class="labels">
      <span
        v-for="band in bands"
        :key="band.key"
        class="label"
        :class="{ active: band.key === active.key }"
        :style="{ flex: band.weight }"
      >
        {{ t(`bands.${band.key}`) }}
      </span>
    </div>

    <div ref="countEl" class="count mono" :style="{ left: countLeft ?? `${pointer}%` }">
      {{ count }}
    </div>
    <div class="stem" :style="{ left: `${pointer}%` }" />
  </div>
</template>

<style scoped>
.scale {
  position: relative;
  height: 118px;
}

.zones {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
}
.zone {
  height: 28px;
  background: var(--panel);
  border: var(--bd-fine) solid var(--rule-idle);
  border-radius: 4px;
}
.zone.active {
  background: var(--ink);
  border-color: var(--ink);
}

.labels {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
}
.label {
  text-align: center;
  font: 500 13px var(--font-sans);
  color: var(--muted);
}
.label.active {
  font-weight: 700;
  color: var(--ink);
}

.count {
  position: absolute;
  bottom: 74px;
  transform: translateX(-50%);
  font: 700 44px var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}
.stem {
  position: absolute;
  bottom: 58px;
  width: 2px;
  height: 16px;
  margin-left: -1px;
  background: var(--ink);
}
</style>
