/* Placing a known number of eggs inside a clump.
 *
 * When a clump's count comes from somewhere other than the watershed — its
 * area, or the person's own number on Manually refine — the marks still need
 * to sit somewhere sensible: one per egg, spread over the clump's dark pixels.
 * k-means over a sample of those pixels does that. It is placement, not
 * detection: the number is given, and this only decides where the rings go.
 *
 * Plain JavaScript, no OpenCV, so the same function runs in the worker and on
 * the main thread. Deterministic — farthest-point seeding from the pixel
 * nearest the middle — so the same clump and the same number always give the
 * same marks.
 */

/**
 * @param {number[]} points  flat [x0, y0, x1, y1, …], normalised 0–1
 * @param {number} k         how many eggs
 * @param {number} aspect    image width / height, so distances are in pixels
 * @returns {{x: number, y: number}[]} k centres, normalised
 */
export function placeInClump(points, k, aspect = 1) {
  const n = points.length / 2
  if (!n || k < 1) return []
  const X = (i) => points[2 * i] * aspect
  const Y = (i) => points[2 * i + 1]

  // Seed: the pixel nearest the middle, then each next seed the pixel farthest
  // from every seed so far.
  let mx = 0
  let my = 0
  for (let i = 0; i < n; i++) {
    mx += X(i)
    my += Y(i)
  }
  mx /= n
  my /= n
  let first = 0
  let best = Infinity
  for (let i = 0; i < n; i++) {
    const d = (X(i) - mx) ** 2 + (Y(i) - my) ** 2
    if (d < best) {
      best = d
      first = i
    }
  }
  const cx = [X(first)]
  const cy = [Y(first)]
  const nearest = new Float64Array(n).fill(Infinity)
  while (cx.length < k) {
    let far = -1
    let farD = -1
    const j = cx.length - 1
    for (let i = 0; i < n; i++) {
      const d = (X(i) - cx[j]) ** 2 + (Y(i) - cy[j]) ** 2
      if (d < nearest[i]) nearest[i] = d
      if (nearest[i] > farD) {
        farD = nearest[i]
        far = i
      }
    }
    // Fewer distinct pixels than eggs: stack the rest on the last seed.
    cx.push(farD > 0 ? X(far) : cx[j])
    cy.push(farD > 0 ? Y(far) : cy[j])
  }

  // Lloyd's iterations.
  const sx = new Float64Array(k)
  const sy = new Float64Array(k)
  const count = new Uint32Array(k)
  for (let iter = 0; iter < 12; iter++) {
    sx.fill(0)
    sy.fill(0)
    count.fill(0)
    for (let i = 0; i < n; i++) {
      let c = 0
      let cd = Infinity
      for (let j = 0; j < k; j++) {
        const d = (X(i) - cx[j]) ** 2 + (Y(i) - cy[j]) ** 2
        if (d < cd) {
          cd = d
          c = j
        }
      }
      sx[c] += X(i)
      sy[c] += Y(i)
      count[c]++
    }
    let moved = 0
    for (let j = 0; j < k; j++) {
      if (!count[j]) continue
      const nx = sx[j] / count[j]
      const ny = sy[j] / count[j]
      moved += Math.abs(nx - cx[j]) + Math.abs(ny - cy[j])
      cx[j] = nx
      cy[j] = ny
    }
    if (moved < 1e-7) break
  }

  return cx.map((x, j) => ({ x: x / aspect, y: cy[j] }))
}
