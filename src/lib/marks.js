/* Mark geometry, shared by the layer that draws marks and the screens that let
 * a finger hit them. Drawing and hit-testing have to agree about how big a mark
 * is, or the operator taps a ring and misses it.
 */

/* Token rule: 2.5px rings, diameter clamped 7–26px — with the ring thinning as
   the mark shrinks (Sep 2026). At the 7px floor a 2.5px stroke leaves a 2px
   hole, and the egg under it — three or four pixels across at zoom 1 on a
   phone — was invisible. A mark has to show what it marks. */
/* The mark hues, for canvases that cannot read a CSS custom property. Must
   match --blue, --green, --red and --pink in tokens.css; these four mean a mark
   and nothing else. */
export const MARK_COLOUR = {
  proposed: '#1250c8',
  kept: '#0a8f4d',
  removed: '#c02d12',
  added: '#e0158f',
}

export const RING_WIDTH = 2.5
export const MIN_RING_WIDTH = 1.25
export const MIN_DIAMETER = 7
export const MAX_DIAMETER = 26

/* Clearance between the egg's long edge and the ring, each side. */
const CLEARANCE = 2

/** A mark's drawn radius in stage pixels, given the image's on-screen box. */
export function markRadius(mark, rect) {
  const longEdge = Math.max(mark.w * rect.width, mark.h * rect.height)
  return Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, longEdge + 2 * CLEARANCE)) / 2
}

/**
 * Stroke width for a ring of radius `r`: full weight from an 18px diameter up,
 * thinning to MIN_RING_WIDTH at the 7px floor, so the hole inside the ring
 * always shows the egg. Linear in between.
 */
export function ringWidth(r) {
  const d = r * 2
  const t = Math.min(1, Math.max(0, (d - MIN_DIAMETER) / (18 - MIN_DIAMETER)))
  return MIN_RING_WIDTH + t * (RING_WIDTH - MIN_RING_WIDTH)
}

/**
 * The mark under a finger, or null.
 *
 * `point` is in normalised image coordinates; the search happens in stage
 * pixels, because the tolerance that matters is the width of a fingertip on
 * glass, not a fraction of a photograph.
 *
 * `slack` forgives the gap between where a finger looks like it is and where
 * the browser says it is. Rejecting a proposal has to be the cheapest gesture
 * on the screen, and a tap that has to be repeated is not cheap — so this errs
 * toward hitting something. Nearest-wins keeps that from removing the wrong
 * mark when two sit close together.
 */
export function markAt(marks, point, rect, slack = 8) {
  const px = rect.left + point.x * rect.width
  const py = rect.top + point.y * rect.height

  let best = null
  let bestDistance = Infinity

  for (const mark of marks) {
    const mx = rect.left + mark.x * rect.width
    const my = rect.top + mark.y * rect.height
    const reach = markRadius(mark, rect) + slack
    const distance = Math.hypot(mx - px, my - py)
    if (distance <= reach && distance < bestDistance) {
      bestDistance = distance
      best = mark
    }
  }

  return best
}

/* Drawing the mark language. */

function drawDot(ctx, x, y, r, colour) {
  const d = Math.max(2, Math.min(4.5, r * 0.4))
  ctx.beginPath()
  ctx.arc(x, y, d + 1.25, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,.75)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y, d, 0, Math.PI * 2)
  ctx.fillStyle = colour
  ctx.fill()
}

function drawRing(ctx, x, y, r, colour, dashed) {
  const width = ringWidth(r)
  ctx.setLineDash(dashed ? [3.5, 2.5] : [])

  // White halo first, so the ring reads on dark eggs and pale paper alike.
  // It scales with the ring, or at small sizes it is most of the mark.
  ctx.lineWidth = width + 1.5
  ctx.strokeStyle = 'rgba(255,255,255,.55)'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = width
  ctx.strokeStyle = colour
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawGlyph(ctx, x, y, r, colour, glyph) {
  const size = Math.max(13, r * 2.4)
  /* Barlow 600 — the heaviest Barlow shipped (the brief asks for 700; there
     is no 700 file, and a canvas would fake one). ✕ is outside the Latin
     subset and comes from the system font either way. */
  ctx.font = `600 ${size}px Barlow, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,.8)'
  ctx.strokeText(glyph, x, y)
  ctx.fillStyle = colour
  ctx.fillText(glyph, x, y)
}

/**
 * Draw one mark — the same way everywhere a mark is drawn: the review stages
 * (MarkLayer) and the marked-up image Share sends (lib/share.js). `rect` is
 * the image's box on the canvas being drawn on.
 */
export function drawMark(ctx, mark, rect) {
  const x = rect.left + mark.x * rect.width
  const y = rect.top + mark.y * rect.height
  const r = markRadius(mark, rect)

  /* An egg inside a clump is a dot, not a ring (Oct 2026): a ring says "this
     is one egg, found", and inside a clump the app is guessing where the eggs
     are. The clump's outline (drawClump) carries the dashed/solid meaning and
     the number; the dots only say where. */
  if (mark.clump !== undefined && (mark.status === 'proposed' || mark.status === 'kept')) {
    drawDot(ctx, x, y, r, MARK_COLOUR[mark.status])
    return
  }

  switch (mark.status) {
    case 'kept':
      drawRing(ctx, x, y, r, MARK_COLOUR.kept, false)
      break
    case 'removed':
      // The ring is gone; only the ✕ remains, and faintly.
      ctx.globalAlpha *= 0.75
      drawGlyph(ctx, x, y, r, MARK_COLOUR.removed, '✕')
      ctx.globalAlpha /= 0.75
      break
    case 'added':
      drawGlyph(ctx, x, y, r, MARK_COLOUR.added, '+')
      break
    default:
      drawRing(ctx, x, y, r, MARK_COLOUR.proposed, true)
  }
}

/**
 * Draw a clump: an ellipse round the touching eggs, dashed blue while it is the
 * app's guess and solid green once the person has given its number, with that
 * number on a tag — "~4" for the app's, "4" for the person's, the same
 * grey-`~` / black rule as every other count (Oct 2026, non-negotiable 6:
 * clump-inferred counts are visible as inferred).
 *
 * `clump` carries cx, cy (normalised), rx, ry (fractions of the image WIDTH)
 * and angle; `count` is how many of its marks stand; `checked` whether the
 * person has answered it. The tag is left off while the clump is too small on
 * screen for it to be anything but clutter.
 */
export function drawClump(ctx, clump, rect, { count, checked = false, focus = false } = {}) {
  /* Where the clump's size and the app's count disagree by two or more, the
     tag says so: a range, "~2–5", rather than one number the app cannot stand
     behind. The person's number is always one number. */
  const byArea = clump.byArea ?? count
  const doubtful = !checked && Math.abs(byArea - count) >= 2
  const x = rect.left + clump.cx * rect.width
  const y = rect.top + clump.cy * rect.height
  const rx = Math.max(6, clump.rx * rect.width)
  const ry = Math.max(5, clump.ry * rect.width)
  const colour = checked ? MARK_COLOUR.kept : MARK_COLOUR.proposed

  ctx.save()
  if (focus) {
    // The one being checked: a wide safety-yellow band under the outline.
    ctx.lineWidth = 8
    ctx.strokeStyle = 'rgba(255,210,63,.85)'
    ctx.beginPath()
    ctx.ellipse(x, y, rx + 3, ry + 3, clump.angle, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash(checked ? [] : [5, 3])
  ctx.lineWidth = 3.5
  ctx.strokeStyle = 'rgba(255,255,255,.6)'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, clump.angle, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.strokeStyle = colour
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, clump.angle, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  if (Math.max(rx, ry) >= 12) {
    const text = checked
      ? String(count)
      : doubtful
        ? `~${Math.min(count, byArea)}–${Math.max(count, byArea)}`
        : `~${count}`
    ctx.font = `700 11px "JetBrains Mono", ui-monospace, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const w = ctx.measureText(text).width + 8
    // Above the ellipse's top, whatever its tilt.
    const top = y - Math.sqrt((rx * Math.sin(clump.angle)) ** 2 + (ry * Math.cos(clump.angle)) ** 2)
    const ty = top - 9
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - w / 2, ty - 8, w, 16)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = colour
    ctx.strokeRect(x - w / 2, ty - 8, w, 16)
    ctx.fillStyle = checked ? '#000000' : '#4a4a4a'
    ctx.fillText(text, x, ty + 0.5)
  }
  ctx.restore()
}

/** How many marks in each clump still stand: Map clump id → count. */
export function clumpCounts(marks) {
  const counts = new Map()
  for (const m of marks) {
    if (m.clump === undefined || m.status === 'removed') continue
    counts.set(m.clump, (counts.get(m.clump) ?? 0) + 1)
  }
  return counts
}
