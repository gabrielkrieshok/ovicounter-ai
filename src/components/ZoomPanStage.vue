<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

/* A strip you can get close to, and act on.
 *
 * A dense strip carries several hundred eggs. Fitted to a 380px phone they sit
 * about three pixels apart, which is not a tap target — so review needs zoom,
 * and zoom needs a gesture vocabulary that does not collide with the three
 * things the operator is here to do.
 *
 * THE GESTURE SPLIT
 *
 *   one finger   acts on the strip   tap removes · drag draws a split · hold adds
 *   two fingers  moves the strip     pinch to zoom, drag to pan
 *
 * This is the drawing-app convention rather than the map convention, and it is
 * the right way round here: the operator's job is culling, so the cheap,
 * unmodified, one-finger gesture belongs to culling. Navigation is the thing
 * you do occasionally, between bouts of work.
 *
 * It also resolves the collision that has no other answer. "Tap a mark to
 * remove it" and "draw a stroke across a clump to split it" and "drag to pan"
 * are all one finger on glass; something has to give, and panning is the one
 * with a spare hand available.
 *
 * On a desktop there is no second finger, so the wheel zooms about the cursor
 * and Shift-drag pans. That is for checking work on a laptop, not a field
 * gesture.
 *
 * The image's box is published as `rect`, the same shape ImageStage publishes,
 * so MarkLayer draws over either without knowing which it is inside.
 */

const props = defineProps({
  src: { type: [String, Object], default: null },
  background: { type: String, default: 'var(--stage-bg)' },
  maxZoom: { type: Number, default: 8 },
  /* How the strip opens. 'contain' shows all of it at zoom 1. 'cover' opens
     fitted to the stage's larger dimension — zoomed in until the strip fills
     the pane. Your fixes opened at cover from Sep 19 to Sep 30, 2026, and was
     put back to contain: on a wide strip cover hid two thirds of it, and the
     operator could not tell what had been left unseen. Zoom 1 is contain
     either way. */
  initialFit: { type: String, default: 'contain' },
})

/* `navigate` fires on any zoom or pan the operator makes. Your fixes counts
   it as review: someone who zoomed in to look at the marks has looked. */
const emit = defineEmits(['tap', 'stroke', 'add', 'navigate'])

const root = ref(null)
const canvas = ref(null)
const painted = ref(null)
const natural = ref({ width: 0, height: 0 })
const stageSize = ref({ width: 0, height: 0 })

/* Zoom is a multiplier on top of the fitted scale, so 1 always means "the whole
   strip is visible" whatever the photograph's shape. */
const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })

/* The finger that is adding an egg, while it is down. */
const hold = ref(null)
const stroke = ref([])

const HOLD_MS = 420
const MOVE_SLOP = 10
const TAP_MS = 320

let observer = null
let holdTimer = null
const pointers = new Map()
let gesture = null

const fitScale = computed(() => {
  const s = stageSize.value
  const n = natural.value
  if (!n.width || !n.height || !s.width || !s.height) return 1
  return Math.min(s.width / n.width, s.height / n.height)
})

const scale = computed(() => fitScale.value * zoom.value)

/** The image's box in stage coordinates. Larger than the stage when zoomed in. */
const rect = computed(() => {
  const n = natural.value
  const s = scale.value
  const width = n.width * s
  const height = n.height * s
  const base = {
    left: (stageSize.value.width - width) / 2,
    top: (stageSize.value.height - height) / 2,
  }
  return { left: base.left + pan.value.x, top: base.top + pan.value.y, width, height }
})

/* Panning is bounded so the strip cannot be flung off into the dark. When an
   axis fits entirely on screen it stays centred on that axis; the operator has
   no reason to push it sideways and every reason not to lose it. */
function clampPan(next) {
  const n = natural.value
  const s = scale.value
  const overflowX = Math.max(0, (n.width * s - stageSize.value.width) / 2)
  const overflowY = Math.max(0, (n.height * s - stageSize.value.height) / 2)
  return {
    x: Math.min(overflowX, Math.max(-overflowX, next.x)),
    y: Math.min(overflowY, Math.max(-overflowY, next.y)),
  }
}

function localPoint(event) {
  const bounds = root.value.getBoundingClientRect()
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
}

/** Stage point → normalised image point. */
function toImage(stagePoint) {
  const r = rect.value
  if (!r.width || !r.height) return null
  return { x: (stagePoint.x - r.left) / r.width, y: (stagePoint.y - r.top) / r.height }
}

/** Normalised image point → stage point. */
function toStage(x, y) {
  const r = rect.value
  return { x: r.left + x * r.width, y: r.top + y * r.height }
}

/** Zoom about a fixed stage point, so what is under the fingers stays there. */
function zoomAbout(stagePoint, nextZoom) {
  const clamped = Math.min(props.maxZoom, Math.max(1, nextZoom))
  const before = toImage(stagePoint)
  zoom.value = clamped
  const after = toStage(before.x, before.y)
  pan.value = clampPan({
    x: pan.value.x + (stagePoint.x - after.x),
    y: pan.value.y + (stagePoint.y - after.y),
  })
}

function cancelHold() {
  clearTimeout(holdTimer)
  holdTimer = null
}

function capture(pointerId, take) {
  /* Capture keeps a gesture alive when the finger leaves the element, which
     matters for panning and for a stroke that runs off the edge of the strip.
     It throws for a pointer the browser does not consider active — a pointer
     already released, or a synthetic one from a test — and that is never worth
     failing a gesture over. */
  try {
    if (take) root.value?.setPointerCapture(pointerId)
    else root.value?.releasePointerCapture(pointerId)
  } catch {
    /* not capturable */
  }
}

function onPointerDown(event) {
  capture(event.pointerId, true)
  pointers.set(event.pointerId, localPoint(event))

  if (pointers.size === 2) {
    // A second finger means navigation; abandon whatever the first was doing.
    cancelHold()
    hold.value = null
    stroke.value = []
    const [a, b] = [...pointers.values()]
    gesture = {
      kind: 'pinch',
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      zoom: zoom.value,
      pan: { ...pan.value },
    }
    return
  }

  if (pointers.size > 2) return

  const point = localPoint(event)
  gesture = {
    kind: event.shiftKey ? 'pan' : 'pending',
    start: point,
    startedAt: performance.now(),
    pan: { ...pan.value },
  }

  if (gesture.kind === 'pending') {
    holdTimer = setTimeout(() => {
      // Held still long enough: this is an add, not a tap or a stroke.
      gesture.kind = 'hold'
      hold.value = { image: toImage(point), stage: point }
    }, HOLD_MS)
  }
}

function onPointerMove(event) {
  if (!pointers.has(event.pointerId)) return
  const point = localPoint(event)
  pointers.set(event.pointerId, point)

  if (gesture?.kind === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    const factor = distance / gesture.distance

    zoom.value = Math.min(props.maxZoom, Math.max(1, gesture.zoom * factor))
    // Keep the point between the fingers under the fingers, and let the
    // midpoint's own travel do the panning.
    pan.value = clampPan({
      x: midpoint.x - (gesture.midpoint.x - gesture.pan.x) * (scale.value / (fitScale.value * gesture.zoom)),
      y: midpoint.y - (gesture.midpoint.y - gesture.pan.y) * (scale.value / (fitScale.value * gesture.zoom)),
    })
    emit('navigate')
    return
  }

  if (!gesture || pointers.size !== 1) return

  const dx = point.x - gesture.start.x
  const dy = point.y - gesture.start.y
  const moved = Math.hypot(dx, dy)

  if (gesture.kind === 'pan') {
    pan.value = clampPan({ x: gesture.pan.x + dx, y: gesture.pan.y + dy })
    emit('navigate')
    return
  }

  if (gesture.kind === 'hold') {
    // Fine adjustment: the target follows the finger 1:1, and the magnifier
    // above it shows exactly where the egg will land.
    hold.value = { image: toImage(point), stage: point }
    return
  }

  if (gesture.kind === 'pending' && moved > MOVE_SLOP) {
    cancelHold()
    gesture.kind = 'stroke'
    stroke.value = [toImage(gesture.start), toImage(point)]
    return
  }

  if (gesture.kind === 'stroke') {
    stroke.value = [...stroke.value, toImage(point)]
  }
}

function onPointerUp(event) {
  const point = pointers.get(event.pointerId) ?? localPoint(event)
  pointers.delete(event.pointerId)
  capture(event.pointerId, false)
  cancelHold()

  if (!gesture) return

  if (gesture.kind === 'hold' && hold.value) {
    emit('add', hold.value.image)
  } else if (gesture.kind === 'stroke' && stroke.value.length > 1) {
    emit('stroke', stroke.value)
  } else if (gesture.kind === 'pending') {
    const moved = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y)
    const elapsed = performance.now() - gesture.startedAt
    if (moved <= MOVE_SLOP && elapsed <= TAP_MS) emit('tap', toImage(point))
  }

  hold.value = null
  stroke.value = []
  if (pointers.size === 0) gesture = null
}

function onWheel(event) {
  event.preventDefault()
  zoomAbout(localPoint(event), zoom.value * (event.deltaY < 0 ? 1.15 : 1 / 1.15))
  emit('navigate')
}

function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
}

/* For the zoom buttons (ZoomRail): the same zoom the wheel does, about the
   middle of the stage, for people who do not know they can pinch. */
function zoomBy(factor) {
  const s = stageSize.value
  if (!s.width || !s.height || !natural.value.width) return
  zoomAbout({ x: s.width / 2, y: s.height / 2 }, zoom.value * factor)
  emit('navigate')
}

/* What the stage is showing, as a box in normalised image coordinates clipped
   to the strip — what the Overview outlines, and what coverage is measured
   against. The whole strip at zoom 1. */
const viewport = computed(() => {
  const r = rect.value
  const s = stageSize.value
  if (!r.width || !r.height) return { x0: 0, y0: 0, x1: 1, y1: 1 }
  const clip = (v) => Math.min(1, Math.max(0, v))
  return {
    x0: clip(-r.left / r.width),
    y0: clip(-r.top / r.height),
    x1: clip((s.width - r.left) / r.width),
    y1: clip((s.height - r.top) / r.height),
  }
})

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
  if (props.initialFit === 'cover') openCovering()
  paint()
}

/* Zoom so the strip fills the stage's larger dimension, centred. */
function openCovering() {
  const s = stageSize.value
  const n = natural.value
  if (!n.width || !n.height || !s.width || !s.height) return
  const cover = Math.max(s.width / n.width, s.height / n.height)
  zoom.value = Math.min(props.maxZoom, Math.max(1, cover / fitScale.value))
  pan.value = { x: 0, y: 0 }
}

function paint() {
  const el = canvas.value
  const source = painted.value
  const s = stageSize.value
  if (!el || !source || !s.width || !s.height) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  el.width = Math.round(s.width * dpr)
  el.height = Math.round(s.height * dpr)
  el.style.width = `${s.width}px`
  el.style.height = `${s.height}px`

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, s.width, s.height)
  /* Nearest-neighbour past 2×: an egg is a dozen pixels, and smoothing them
     into a soft grey lozenge hides the thing the operator is judging. */
  ctx.imageSmoothingEnabled = zoom.value < 2
  ctx.imageSmoothingQuality = 'high'

  const r = rect.value
  ctx.drawImage(source, r.left, r.top, r.width, r.height)
}

/* Where the stage's top-left sat on the page at the last measure. When the
   stage is resized from above — Your fixes' overview band arriving as the
   operator zooms past 1 — the photograph is kept where it was on screen by
   moving the pan by however far the stage itself moved, so nothing jumps
   under a pinch. */
let lastOrigin = null

/* The stage's place in the page's layout, ignoring CSS transforms. A screen
   sliding in between steps (App.vue) is translated while it mounts; measured
   with getBoundingClientRect, that slide would later read as the stage having
   moved, and the strip would jump sideways by the width of the screen. */
function layoutOrigin(el) {
  let left = 0
  let top = 0
  for (let e = el; e; e = e.offsetParent) {
    left += e.offsetLeft
    top += e.offsetTop
  }
  return { left, top }
}

function measure() {
  const el = root.value
  if (!el) return
  const bounds = layoutOrigin(el)
  const before = lastOrigin && natural.value.width ? {
    x: lastOrigin.x + rect.value.left,
    y: lastOrigin.y + rect.value.top,
  } : null
  stageSize.value = { width: el.clientWidth, height: el.clientHeight }
  if (before) {
    const after = { x: bounds.left + rect.value.left, y: bounds.top + rect.value.top }
    pan.value = clampPan({
      x: pan.value.x + (before.x - after.x),
      y: pan.value.y + (before.y - after.y),
    })
    rebaseGesture(bounds.left - lastOrigin.x, bounds.top - lastOrigin.y)
  }
  lastOrigin = { x: bounds.left, y: bounds.top }
  paint()
}

/* A gesture in flight remembers its fingers in stage coordinates, and the
   stage just moved under them by (dx, dy). Shift what it remembers, and start
   a pinch or pan afresh from here — otherwise its next move would recompute
   the pan from the old origin and undo the correction above. */
function rebaseGesture(dx, dy) {
  if (!dx && !dy) return
  for (const [id, p] of pointers) pointers.set(id, { x: p.x - dx, y: p.y - dy })
  if (!gesture) return
  if (gesture.start) gesture.start = { x: gesture.start.x - dx, y: gesture.start.y - dy }
  if (gesture.kind === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    gesture.distance = Math.hypot(a.x - b.x, a.y - b.y) || 1
    gesture.midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    gesture.zoom = zoom.value
    gesture.pan = { ...pan.value }
  } else if (gesture.kind === 'pan') {
    gesture.pan = { ...pan.value }
    const p = [...pointers.values()][0]
    if (p) gesture.start = { ...p }
  }
}

onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(root.value)
  load(props.src)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelHold()
})

watch(() => props.src, load)
watch(rect, paint)

defineExpose({ toImage, toStage, rect, resetView, zoom, zoomBy, viewport, natural })
</script>

<template>
  <div
    ref="root"
    class="stage"
    :style="{ background }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel="onWheel"
  >
    <canvas ref="canvas" class="photo" />
    <slot
      :rect="rect"
      :stage="stageSize"
      :hold="hold"
      :stroke="stroke"
      :zoom="zoom"
      :viewport="viewport"
    />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
  /* Every gesture here is handled in script; the browser must not also decide
     to scroll or zoom the page out from under it. */
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.photo {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  pointer-events: none;
}
</style>
