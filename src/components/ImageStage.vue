<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* A photograph fitted into whatever space it is given, plus the mapping between
 * the photograph's coordinates and the screen's.
 *
 * Everything that draws over a strip — the crop box, the calibration ring, the
 * marks — needs that mapping, and needs it to be the same mapping, or overlays
 * drift against the thing they annotate. So it lives here once and is exposed
 * rather than recomputed per screen.
 *
 * Positions everywhere in this app are normalised 0–1 of the image. Nothing
 * downstream knows the working resolution.
 */

const props = defineProps({
  /** An image URL, or a canvas / ImageBitmap already in hand. */
  src: { type: [String, Object], default: null },
  /** 'contain' shows the whole strip; 'cover' fills the frame and crops. */
  fit: { type: String, default: 'contain' },
  background: { type: String, default: 'var(--stage-bg)' },
})

const root = ref(null)
const painted = ref(null)
const stageSize = ref({ width: 0, height: 0 })
const natural = ref({ width: 0, height: 0 })

let observer = null

async function load(source) {
  if (!source) {
    painted.value = null
    return
  }
  if (typeof source === 'string') {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error(`could not load ${source}`))
      img.src = source
    })
    natural.value = { width: img.naturalWidth, height: img.naturalHeight }
    painted.value = img
  } else {
    natural.value = { width: source.width, height: source.height }
    painted.value = source
  }
  paint()
}

const canvas = ref(null)

function paint() {
  const el = canvas.value
  const source = painted.value
  if (!el || !source) return
  const { width, height } = displayRect.value
  if (!width || !height) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  el.width = Math.round(width * dpr)
  el.height = Math.round(height * dpr)
  el.style.width = `${width}px`
  el.style.height = `${height}px`

  const ctx = el.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, el.width, el.height)
  ctx.drawImage(source, 0, 0, el.width, el.height)
}

/** The photograph's box within the stage, in CSS pixels. */
const displayRect = computed(() => {
  const s = stageSize.value
  const n = natural.value
  if (!n.width || !n.height || !s.width || !s.height) {
    return { left: 0, top: 0, width: 0, height: 0 }
  }
  const scale =
    props.fit === 'cover'
      ? Math.max(s.width / n.width, s.height / n.height)
      : Math.min(s.width / n.width, s.height / n.height)
  const width = n.width * scale
  const height = n.height * scale
  return {
    left: (s.width - width) / 2,
    top: (s.height - height) / 2,
    width,
    height,
  }
})

/** Screen point → normalised image point. Null when the point misses the photo. */
function toImage(clientX, clientY) {
  const el = root.value
  if (!el) return null
  const bounds = el.getBoundingClientRect()
  const r = displayRect.value
  if (!r.width || !r.height) return null
  const x = (clientX - bounds.left - r.left) / r.width
  const y = (clientY - bounds.top - r.top) / r.height
  return { x, y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 }
}

/** Normalised image point → screen point, relative to the stage. */
function toStage(x, y) {
  const r = displayRect.value
  return { x: r.left + x * r.width, y: r.top + y * r.height }
}

function measure() {
  const el = root.value
  if (!el) return
  stageSize.value = { width: el.clientWidth, height: el.clientHeight }
  paint()
}

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(root.value)
  load(props.src)
})

onBeforeUnmount(() => observer?.disconnect())

watch(() => props.src, load)
watch(displayRect, paint)

defineExpose({ toImage, toStage, displayRect, natural })
</script>

<template>
  <div ref="root" class="stage" :style="{ background }">
    <canvas ref="canvas" class="photo" :style="{ left: `${displayRect.left}px`, top: `${displayRect.top}px` }" />
    <slot :rect="displayRect" :stage="stageSize" />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
.photo {
  position: absolute;
  display: block;
  /* The photograph is the subject; gestures belong to the overlays above it. */
  pointer-events: none;
}
</style>
