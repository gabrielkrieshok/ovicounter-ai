<script setup>
import { computed, ref, watch } from 'vue'

/* The loupe that appears while a finger is adding an egg.
 *
 * The hand is the problem this solves. An egg is a dozen pixels; a fingertip
 * covers several hundred, so at the moment of placing a mark the operator
 * cannot see the thing they are placing it on. The loupe puts a magnified copy
 * of that spot somewhere the hand is not.
 *
 * "Never under the finger" is the whole point, so it is enforced rather than
 * assumed: above by default, and beside when there is no room above. It is
 * never placed below, because below is where the hand is.
 */

const props = defineProps({
  /** The working image. */
  source: { type: Object, default: null },
  /** Where the egg will land, normalised 0–1 of the image. */
  point: { type: Object, default: null },
  /** The finger, in stage pixels. */
  anchor: { type: Object, default: null },
  /** The visible stage, for keeping the loupe inside it. */
  stage: { type: Object, required: true },
})

const SIZE = 76
const GAP = 26
/* How much of the photograph to show across the loupe. About two and a half
   egg-lengths — enough context to tell an egg from a fibre, tight enough that
   the egg is unmistakably an egg. */
const SPAN_PX = 34

const canvas = ref(null)

const position = computed(() => {
  if (!props.anchor) return null
  const half = SIZE / 2
  const above = props.anchor.y - GAP - half

  /* Room above: the preferred place, directly over the target. */
  if (above - half >= 0) {
    return {
      left: clamp(props.anchor.x - half, 0, props.stage.width - SIZE),
      top: above - half,
    }
  }

  /* No room above — go beside, on whichever side has space. Never below. */
  const preferRight = props.anchor.x < props.stage.width / 2
  const left = preferRight ? props.anchor.x + GAP : props.anchor.x - GAP - SIZE
  return {
    left: clamp(left, 0, props.stage.width - SIZE),
    top: clamp(props.anchor.y - half, 0, props.stage.height - SIZE),
  }
})

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value))
}

function paint() {
  const el = canvas.value
  const source = props.source
  const point = props.point
  if (!el || !source || !point) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  el.width = SIZE * dpr
  el.height = SIZE * dpr
  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, SIZE, SIZE)

  const cx = point.x * source.width
  const cy = point.y * source.height
  const half = SPAN_PX / 2

  /* Nearest-neighbour. Smoothing a twelve-pixel egg into a soft grey lozenge
     would hide exactly the detail the operator is leaning in to see. */
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(source, cx - half, cy - half, SPAN_PX, SPAN_PX, 0, 0, SIZE, SIZE)
}

watch(() => [props.point, props.source], paint, { deep: false, immediate: true })
watch(canvas, paint)
</script>

<template>
  <div
    v-if="position"
    class="loupe"
    :style="{ left: `${position.left}px`, top: `${position.top}px` }"
  >
    <canvas ref="canvas" class="view" />
    <!-- Pink, because this will be a hand-added egg, and the mark language says
         so before it is committed as well as after. -->
    <span class="target" />
  </div>
</template>

<style scoped>
.loupe {
  position: absolute;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: var(--bd) solid var(--ink);
  overflow: hidden;
  background: rgba(255, 253, 249, 0.92);
  box-shadow: var(--halo-dark);
  pointer-events: none;
  display: grid;
  place-items: center;
}
.view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.target {
  position: relative;
  width: 18px;
  height: 18px;
  border: 2.5px solid var(--pink);
  border-radius: 50%;
  box-shadow: var(--halo-light);
}
</style>
