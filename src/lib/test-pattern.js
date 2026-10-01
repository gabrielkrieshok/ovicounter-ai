/* The test-pattern demo: a strip of paper with egg-like ovoids drawn on it,
 * made on this phone when it is chosen, so nothing is downloaded and the
 * exact number drawn is known (Sep 30, 2026).
 *
 * It is a test, and says so: the result shows how many were drawn, so anyone
 * can see how close the app's marks and their own checking came. It is not a
 * picture of a real strip and nothing here is meant to pass as one.
 *
 * What it draws, and why:
 *   - paper slightly off-white, with fine grain and a few pale stains — the
 *     things that should NOT be marked;
 *   - ovoids about 18 by 7 pixels at this size, which lands near 15px long at
 *     the 1200px working resolution — comfortably above the 6px floor
 *     (cv/gate.js), in the range of the bundled field photos;
 *   - most of them in a band across the strip, the way eggs collect along a
 *     waterline, and the rest scattered;
 *   - one in twelve touching a neighbour, so splitting has something to do.
 *
 * A new pattern each time it is chosen; the count is returned with it.
 */

const W = 1500
const H = 620

export async function drawTestPattern() {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  let seed = Math.floor(Math.random() * 2147483646) + 1
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const gauss = () => {
    let u = 0
    let v = 0
    while (!u) u = rand()
    while (!v) v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  // Paper
  ctx.fillStyle = '#ebe7dc'
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = `rgba(150, 120, 60, ${0.04 + rand() * 0.05})`
    ctx.beginPath()
    ctx.ellipse(rand() * W, rand() * H, 40 + rand() * 120, 20 + rand() * 60, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 2600; i++) {
    const shade = 150 + Math.floor(rand() * 60)
    ctx.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 20}, ${0.25 + rand() * 0.35})`
    ctx.fillRect(rand() * W, rand() * H, 1 + rand() * 1.5, 1 + rand() * 1.5)
  }

  // Ovoids
  const target = 140 + Math.floor(rand() * 120)
  const eggs = []
  const bandY = H * (0.38 + rand() * 0.2)
  let guard = 0
  while (eggs.length < target && guard++ < 20000) {
    const inBand = rand() < 0.75
    const x = 30 + rand() * (W - 60)
    const y = inBand ? bandY + gauss() * H * 0.11 : 30 + rand() * (H - 60)
    if (y < 24 || y > H - 24) continue
    const touching = eggs.length > 0 && rand() < 1 / 12
    let ex = x
    let ey = y
    if (touching) {
      // Lay this one against the last, end to side — a small clump.
      const last = eggs[eggs.length - 1]
      const a = rand() * Math.PI * 2
      ex = last.x + Math.cos(a) * 13
      ey = last.y + Math.sin(a) * 13
    } else if (eggs.some((e) => Math.hypot(e.x - x, e.y - y) < 26)) {
      continue
    }
    eggs.push({ x: ex, y: ey, angle: rand() * Math.PI, len: 8.5 + rand() * 1.5, wid: 3.2 + rand() * 0.6 })
  }

  for (const egg of eggs) {
    ctx.save()
    ctx.translate(egg.x, egg.y)
    ctx.rotate(egg.angle)
    const tone = 18 + Math.floor(rand() * 22)
    ctx.fillStyle = `rgb(${tone}, ${tone - 4}, ${tone - 8})`
    // An egg is not an ellipse: one end a little fuller than the other.
    ctx.beginPath()
    ctx.ellipse(-egg.len * 0.12, 0, egg.len * 0.88, egg.wid, 0, 0, Math.PI * 2)
    ctx.ellipse(egg.len * 0.3, 0, egg.len * 0.7, egg.wid * 0.82, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return { url: URL.createObjectURL(blob), drawn: eggs.length }
}
