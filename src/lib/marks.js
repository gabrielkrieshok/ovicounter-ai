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
