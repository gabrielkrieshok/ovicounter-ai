import { loadImage } from '@/lib/image'
import { MARK_COLOUR, clumpCounts, drawClump, drawMark } from '@/lib/marks'

/* Share (Oct 2026): one picture that tells what happened to a strip, sent
 * wherever the person chooses — and only then. Nothing leaves the phone until
 * they pick a destination in their own share sheet.
 *
 * A story-shaped card, 1080 × 1920, to be forwarded or posted as it is: the
 * name; the photograph as it was taken; the same strip with every mark drawn
 * exactly as the review screens draw it (lib/marks.js drawMark); then the
 * count on yellow — the person's number, or the machine's in grey with its `~`
 * when nobody checked — with the sentence the result screen said, the band,
 * and what the person removed and added. Part show of the work, part record.
 *
 * Colours are the tokens' values, written out because a canvas cannot read a
 * custom property; they must match src/styles/tokens.css.
 */

const C = {
  ink: '#000000',
  paper: '#ffffff',
  panel: '#f1f1ee',
  muted: '#4a4a4a',
  action: '#ffd23f',
  stage: '#111111',
  idle: '#9a9a9a',
}
/* The logo (components/AppLogo.vue): its ring path on a 100-unit box. */
const LOGO_RING = new Path2D('M52.47 12.04A38.04 38.04 0 0 1 70.31 17.84L64.39 25.99A27.99 27.99 0 0 0 52.47 22.12ZM74.31 20.74A38.04 38.04 0 0 1 85.34 35.92L75.75 39.04A27.99 27.99 0 0 0 68.39 28.89ZM86.86 40.62A38.04 38.04 0 0 1 86.86 59.38L77.28 56.27A27.99 27.99 0 0 0 77.28 43.73ZM85.34 64.08A38.04 38.04 0 0 1 74.31 79.26L68.39 71.11A27.99 27.99 0 0 0 75.75 60.96ZM70.31 82.16A38.04 38.04 0 0 1 52.47 87.96L52.47 77.88A27.99 27.99 0 0 0 64.39 74.01ZM47.53 87.96A38.04 38.04 0 0 1 29.69 82.16L35.61 74.01A27.99 27.99 0 0 0 47.53 77.88ZM25.69 79.26A38.04 38.04 0 0 1 14.66 64.08L24.25 60.96A27.99 27.99 0 0 0 31.61 71.11ZM13.14 59.38A38.04 38.04 0 0 1 13.14 40.62L22.72 43.73A27.99 27.99 0 0 0 22.72 56.27ZM14.66 35.92A38.04 38.04 0 0 1 25.69 20.74L31.61 28.89A27.99 27.99 0 0 0 24.25 39.04ZM29.69 17.84A38.04 38.04 0 0 1 47.53 12.04L47.53 22.12A27.99 27.99 0 0 0 35.61 25.99Z')
const BRAND = '#0064fc'

const W = 1080
const H = 1920
const PAD = 64

const display = (px, weight = 800) => `${weight} ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`
const body = (px, weight = 500) => `${weight} ${px}px Barlow, system-ui, sans-serif`
const mono = (px, weight = 700) => `${weight} ${px}px "JetBrains Mono", ui-monospace, monospace`

/** Fit (w, h) inside (bw, bh), keeping its shape. */
function contain(w, h, bw, bh) {
  const s = Math.min(bw / w, bh / h)
  return { w: Math.round(w * s), h: Math.round(h * s) }
}

/** Break `text` into lines no wider than `width` in the current font. */
function wrap(ctx, text, width) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function label(ctx, text, x, y, colour = C.ink) {
  ctx.font = mono(26, 700)
  ctx.fillStyle = colour
  ctx.fillText(text.toUpperCase().split('').join(' '), x, y)
}

/** A photograph in a ruled box, centred in its slot on a dark ground. */
function framed(ctx, source, sw, sh, top, slotH, drawOver) {
  const box = { x: PAD, y: top, w: W - 2 * PAD, h: slotH }
  ctx.fillStyle = C.stage
  ctx.fillRect(box.x, box.y, box.w, box.h)
  const fit = contain(sw, sh, box.w, box.h)
  const x = box.x + (box.w - fit.w) / 2
  const y = box.y + (box.h - fit.h) / 2
  ctx.drawImage(source, x, y, fit.w, fit.h)
  drawOver?.({ left: x, top: y, width: fit.w, height: fit.h })
  ctx.lineWidth = 4
  ctx.strokeStyle = C.ink
  ctx.strokeRect(box.x, box.y, box.w, box.h)
}

/**
 * The card, as a JPEG blob.
 *
 * `text` carries every word already translated: { photo, marks, sentence,
 * judged, date, footer, bands: [{ key, label, weight }] }.
 */
export async function storyImage({ photoUrl, working, marks, clumps = [], checked, count, bandKey, text }) {
  const photo = await loadImage(photoUrl)
  const pw = photo.naturalWidth ?? photo.width
  const ph = photo.naturalHeight ?? photo.height

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  ctx.fillStyle = C.paper
  ctx.fillRect(0, 0, W, H)

  // The name, on black.
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, W, 150)
  // The mark: the brand ring, the egg in paper on the black band.
  ctx.save()
  ctx.translate(PAD, 27)
  ctx.scale(0.96, 0.96)
  ctx.fillStyle = BRAND
  ctx.fill(LOGO_RING)
  ctx.translate(50, 50)
  ctx.rotate((33 * Math.PI) / 180)
  ctx.beginPath()
  ctx.ellipse(0, 0, 20.1, 7.3, 0, 0, Math.PI * 2)
  ctx.fillStyle = C.paper
  ctx.fill()
  ctx.restore()
  const nameX = PAD + 116
  ctx.fillStyle = C.paper
  ctx.font = display(72, 800)
  ctx.fillText('OVICOUNTER', nameX, 40)
  const nameW = ctx.measureText('OVICOUNTER').width
  ctx.font = display(72, 600)
  ctx.fillText('AI', nameX + nameW + 8, 40)
  ctx.textAlign = 'right'
  ctx.font = mono(28, 500)
  ctx.fillStyle = C.action
  ctx.fillText(text.date, W - PAD, 62)
  ctx.textAlign = 'left'

  // 1 · the photograph as it was.
  let y = 190
  label(ctx, `1  ${text.photo}`, PAD, y)
  y += 48
  framed(ctx, photo, pw, ph, y, 400)
  y += 400 + 44

  // 2 · the marks.
  label(ctx, `2  ${text.marks}`, PAD, y)
  y += 48
  framed(ctx, working, working.width, working.height, y, 400, (rect) => {
    for (const mark of marks) drawMark(ctx, mark, rect)
    const counts = clumpCounts(marks)
    for (const c of clumps) drawClump(ctx, c, rect, { count: counts.get(c.id) ?? 0, checked: !!c.checked })
  })
  y += 400 + 44

  // 3 · the count, on yellow.
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const panelTop = y
  const panelH = H - 110 - panelTop
  ctx.fillStyle = C.action
  ctx.fillRect(0, panelTop, W, panelH)
  ctx.fillStyle = C.ink
  ctx.fillRect(0, panelTop, W, 6)

  let py = panelTop + 44
  label(ctx, `3  ${text.countLabel}`, PAD, py)
  py += 48
  ctx.fillStyle = checked ? C.ink : C.muted
  ctx.font = checked ? mono(220, 700) : mono(150, 500)
  ctx.fillText(count, PAD - 8, py)
  py += checked ? 230 : 170

  ctx.fillStyle = C.ink
  ctx.font = body(40, 600)
  for (const line of wrap(ctx, text.sentence, W - 2 * PAD)) {
    ctx.fillText(line, PAD, py)
    py += 52
  }
  py += 16

  // The band scale, small.
  const total = text.bands.reduce((sum, b) => sum + b.weight, 0)
  const gap = 8
  const scaleW = W - 2 * PAD - gap * (text.bands.length - 1)
  let bx = PAD
  for (const band of text.bands) {
    const bw = (band.weight / total) * scaleW
    const on = band.key === bandKey
    ctx.fillStyle = on ? (checked ? C.ink : C.idle) : C.paper
    ctx.fillRect(bx, py, bw, 40)
    ctx.lineWidth = 4
    ctx.strokeStyle = on ? C.ink : C.idle
    ctx.strokeRect(bx, py, bw, 40)
    ctx.font = mono(22, 700)
    ctx.fillStyle = on ? C.ink : C.muted
    ctx.fillText(band.label.toUpperCase(), bx, py + 52)
    bx += bw + gap
  }
  py += 52 + 44

  if (text.judged) {
    ctx.font = mono(34, 700)
    let jx = PAD
    for (const part of text.judged) {
      ctx.fillStyle = part.kind === 'removed' ? MARK_COLOUR.removed : part.kind === 'added' ? MARK_COLOUR.added : C.ink
      ctx.fillText(part.text, jx, py)
      jx += ctx.measureText(part.text).width + 36
    }
  }

  // The footer.
  ctx.fillStyle = C.ink
  ctx.fillRect(0, H - 110, W, 110)
  ctx.fillStyle = C.paper
  ctx.font = body(30, 500)
  ctx.fillText(text.footer, PAD, H - 72)

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
}

/**
 * Hand the card and its text to the system share sheet. Where a browser cannot
 * share files — most laptops — save the card instead and copy the summary,
 * and say so. Resolves 'shared', 'saved' or 'cancelled'.
 */
export async function shareOrSave({ files, text, title }) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text, title })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled'
      // Fall through to saving: a share target that refused should not lose the work.
    }
  }
  for (const file of files) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(file)
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  }
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* No clipboard (an insecure origin, or refused): the card is saved. */
  }
  return 'saved'
}
