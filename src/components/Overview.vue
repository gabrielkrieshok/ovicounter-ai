<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { MARK_COLOUR } from '@/lib/marks'
import { COVERAGE_PARTS } from '@/stores/strip'

/* Where you are on the strip, and where you have already looked.
 *
 * The whole strip at contain — the working image and its marks, painted small —
 * with a 3px box in --action for what the stage is showing. Parts already
 * looked at close up are shaded, so "have I checked all of it?" has an answer
 * at a glance instead of by panning back to find out.
 *
 * Drawn on a canvas at its own size rather than as a second MarkLayer: a few
 * hundred rings at 1px are texture, and texture is what tells you which part of
 * a dense strip you are in. */
const props = defineProps({
  source: { type: Object, default: null }, // the working canvas
  marks: { type: Array, default: () => [] },
  viewport: { type: Object, required: true }, // { x0, y0, x1, y1 } normalised
  looked: { type: Array, default: () => [] },
})

/* Touch or drag anywhere on it to move the view there (Oct 2026): emits the
   point of the strip, normalised, for the stage to centre on. */
const emit = defineEmits(['move'])
const root = ref(null)
const frame = ref(null)
let dragging = false
function pointAt(event) {
  const r = frame.value.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - r.left) / r.width)),
    y: Math.min(1, Math.max(0, (event.clientY - r.top) / r.height)),
  }
}
function down(event) {
  dragging = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
  emit('move', pointAt(event))
}
function move(event) {
  if (dragging) emit('move', pointAt(event))
}
function up() {
  dragging = false
}
const canvas = ref(null)
const size = ref({ width: 0, height: 0 })
let observer = null

/* Contain within whatever box the overview is given — the phone's band is
   short and wide, and a thumbnail sized by width alone spilled out of it. */
function paint() {
  const el = canvas.value
  const box = root.value
  const src = props.source
  if (!el || !box || !src?.width) return
  const aspect = src.width / src.height
  const width = Math.floor(Math.min(box.clientWidth, box.clientHeight * aspect))
  const height = Math.floor(width / aspect)
  if (!width || !height) return
  size.value = { width, height }
  const dpr = Math.min(3, window.devicePixelRatio || 1)
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.drawImage(src, 0, 0, width, height)
  ctx.lineWidth = 1
  for (const m of props.marks) {
    if (m.status === 'removed') continue
    const hue = MARK_COLOUR[m.status]
    ctx.strokeStyle = hue
    ctx.beginPath()
    ctx.arc(m.x * width, m.y * height, 2, 0, Math.PI * 2)
    ctx.stroke()
  }
}

onMounted(() => {
  paint()
  observer = new ResizeObserver(paint)
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
watch(() => [props.source, props.marks], paint, { deep: true })
</script>

<template>
  <div ref="root" class="overview">
    <div
      ref="frame"
      class="frame"
      :style="{ width: `${size.width}px`, height: `${size.height}px` }"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <canvas ref="canvas" class="thumb" />
      <!-- Looked-at parts are shaded, not tinted a mark colour: this is the
           person's own effort, not something about the eggs. -->
      <span
        v-for="(done, i) in looked"
        v-show="done"
        :key="i"
        class="looked"
        :style="{ left: `${(i / COVERAGE_PARTS) * 100}%`, width: `${100 / COVERAGE_PARTS}%` }"
      />
      <span
        class="viewport"
        :style="{
          left: `${viewport.x0 * 100}%`,
          top: `${viewport.y0 * 100}%`,
          width: `${(viewport.x1 - viewport.x0) * 100}%`,
          height: `${(viewport.y1 - viewport.y0) * 100}%`,
        }"
      />
    </div>
  </div>
</template>

<style scoped>
.overview {
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.frame {
  position: relative;
  flex: none;
  line-height: 0;
  cursor: grab;
  touch-action: none;
}
.thumb {
  display: block;
  width: 100%;
  height: 100%;
}
.looked {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--scrim);
  pointer-events: none;
}
.viewport {
  position: absolute;
  border: var(--bd) solid var(--action);
  pointer-events: none;
}
</style>
