/* Mark geometry, shared by the layer that draws marks and the screens that let
 * a finger hit them. Drawing and hit-testing have to agree about how big a mark
 * is, or the operator taps a ring and misses it.
 */

/* Token rule: 2.5px rings, diameter clamped 7–26px. */
export const RING_WIDTH = 2.5
export const MIN_DIAMETER = 7
export const MAX_DIAMETER = 26

/** A mark's drawn radius in stage pixels, given the image's on-screen box. */
export function markRadius(mark, rect) {
  const longEdge = Math.max(mark.w * rect.width, mark.h * rect.height)
  return Math.min(MAX_DIAMETER, Math.max(MIN_DIAMETER, longEdge + 4)) / 2
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
