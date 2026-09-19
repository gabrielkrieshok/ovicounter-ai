<script setup>
import { onMounted, ref, watch } from 'vue'
import { RING_WIDTH, markRadius } from '@/lib/marks'

/* The mark language, drawn once for every screen that shows marks.
 *
 *   dashed blue ring   machine-proposed, not yet answered by a human
 *   solid green ring   kept — machine mark, human-accepted
 *   red ✕              removed by the human; the ring is gone, the ✕ remains
 *   pink +             added by hand
 *
 * Shape carries the meaning redundantly with colour, so the marks survive
 * sunlight and colour blindness. Every mark gets a white halo, because all of
 * them sit on warm paper photographed under whatever light the room had.
 *
 * Canvas, not DOM. A dense strip carries several hundred marks and they are
 * redrawn on every slider frame and every pan frame; that many elements will
 * not hold 60fps.
 *
 * The canvas is sized to the STAGE, not to the image. Under zoom the image's
 * box grows without limit — at 4× on a 1200px strip it is 4800 CSS px wide,
 * which at devicePixelRatio 2 would be a 9600px canvas and about 170MB of
 * backing store. Drawing a viewport-sized canvas through the transform costs
 * the same arithmetic and a fixed amount of memory.
 */

const props = defineProps({
  /** [{ x, y, w, h, status, fromClump }] — positions normalised 0–1. */
  marks: { type: Array, default: () => [] },
  /** Marks lost since the operator started moving a slider, drawn faint. */
  ghosts: { type: Array, default: () => [] },
  /** Bounding boxes, for the step of the scan that draws them. */
  boxes: { type: Array, default: () => [] },
  /** The image's box in stage coordinates. May be larger than the stage. */
  rect: { type: Object, required: true },
  /** The visible stage, in CSS pixels. */
  stage: { type: Object, required: true },
})

const canvas = ref(null)

/* Ring width and the 7–26px diameter clamp live in lib/marks.js, because
   hit-testing has to agree with drawing about how big a mark is. The clamp is
   what keeps a mark tappable on a strip whose eggs are three pixels across, and
   keeps it from swallowing the paper on one whose eggs are thirty. Zooming in
   walks a mark up to the ceiling, which is the point of zooming. */

const COLOUR = {
  proposed: '#1250c8',
  kept: '#0a8f4d',
  removed: '#c02d12',
  added: '#e0158f',
}

function drawRing(ctx, x, y, r, colour, dashed) {
  ctx.setLineDash(dashed ? [3.5, 2.5] : [])

  // White halo first, so the ring reads on dark eggs and pale paper alike.
  ctx.lineWidth = RING_WIDTH + 2
  ctx.strokeStyle = 'rgba(255,255,255,.55)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = RING_WIDTH
  ctx.strokeStyle = colour
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawGlyph(ctx, x, y, r, colour, glyph) {
  const size = Math.max(13, r * 2.4)
  ctx.font = `700 ${size}px Archivo, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,.8)'
  ctx.strokeText(glyph, x, y)
  ctx.fillStyle = colour
  ctx.fillText(glyph, x, y)
}

function drawMark(ctx, mark, rect) {
  const x = rect.left + mark.x * rect.width
  const y = rect.top + mark.y * rect.height
  const r = markRadius(mark, rect)

  switch (mark.status) {
    case 'kept':
      drawRing(ctx, x, y, r, COLOUR.kept, false)
      break
    case 'removed':
      // The ring is gone; only the ✕ remains, and faintly.
      ctx.globalAlpha *= 0.75
      drawGlyph(ctx, x, y, r, COLOUR.removed, '✕')
      ctx.globalAlpha /= 0.75
      break
    case 'added':
      drawGlyph(ctx, x, y, r, COLOUR.added, '+')
      break
    default:
      drawRing(ctx, x, y, r, COLOUR.proposed, true)
  }
}

function paint() {
  const el = canvas.value
  const { rect, stage } = props
  if (!el || !stage?.width || !stage?.height || !rect?.width) return

  const dpr = Math.min(3, window.devicePixelRatio || 1)
  el.width = Math.round(stage.width * dpr)
  el.height = Math.round(stage.height * dpr)
  el.style.width = `${stage.width}px`
  el.style.height = `${stage.height}px`

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, stage.width, stage.height)

  /* Anything off-screen costs nothing to skip and a full ring-and-halo stroke
     to draw. Zoomed in on a dense strip, most marks are off-screen. */
  const PAD = 32
  const visible = (m) => {
    const x = rect.left + m.x * rect.width
    const y = rect.top + m.y * rect.height
    return x > -PAD && x < stage.width + PAD && y > -PAD && y < stage.height + PAD
  }

  /* Cyan bounding boxes — what the scan drew round each dark island before it
     decided anything about it. Stroked at a fixed screen width rather than a
     scaled one: at working resolution these are sub-pixel by the time the strip
     is fitted to a 380px phone, and an invisible box is not a visible step. */
  if (props.boxes.length) {
    ctx.strokeStyle = '#19d5ff'
    ctx.lineWidth = 1.5
    for (const b of props.boxes) {
      if (!visible(b)) continue
      const w = Math.max(3, b.w * rect.width)
      const h = Math.max(3, b.h * rect.height)
      ctx.strokeRect(
        rect.left + b.x * rect.width - w / 2,
        rect.top + b.y * rect.height - h / 2,
        w,
        h,
      )
    }
  }

  /* Ghosts first, so a live mark always sits on top of the memory of one. */
  ctx.globalAlpha = 0.35
  for (const mark of props.ghosts) if (visible(mark)) drawMark(ctx, mark, rect)
  ctx.globalAlpha = 1

  for (const mark of props.marks) if (visible(mark)) drawMark(ctx, mark, rect)
}

onMounted(paint)
watch(
  () => [props.marks, props.ghosts, props.boxes, props.rect, props.stage],
  paint,
  { deep: false },
)
</script>

<template>
  <canvas ref="canvas" class="marks" />
</template>

<style scoped>
.marks {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  pointer-events: none;
}
</style>
