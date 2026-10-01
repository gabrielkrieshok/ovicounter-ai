import { drawMark } from '@/lib/marks'

/* Share (Oct 2026): a strip's marked-up photograph, the original, and a short
 * summary, sent wherever the person chooses — and only then. Nothing leaves the
 * phone until they pick a destination in their own share sheet.
 *
 * The marked image is the working image with every mark drawn exactly as the
 * review screens draw it (lib/marks.js drawMark), and a band beneath it with
 * the count, the sentence the result screen said, and the date — so the
 * picture still says what it is when it is forwarded on without its text.
 */

const INK = '#000000'
const PAPER = '#ffffff'
const MUTED = '#4a4a4a'

/** The marked-up strip with its facts set beneath it, as a JPEG blob. */
export async function markedImage({ canvas, marks, count, lines }) {
  const W = canvas.width
  const photoH = canvas.height
  const pad = Math.round(W * 0.03)
  const countSize = Math.round(W * 0.075)
  const lineSize = Math.round(W * 0.024)
  const bandH = pad * 2 + countSize + lines.length * Math.round(lineSize * 1.45)

  const out = document.createElement('canvas')
  out.width = W
  out.height = photoH + bandH
  const ctx = out.getContext('2d')

  ctx.drawImage(canvas, 0, 0)
  const rect = { left: 0, top: 0, width: W, height: photoH }
  for (const mark of marks) drawMark(ctx, mark, rect)

  ctx.fillStyle = PAPER
  ctx.fillRect(0, photoH, W, bandH)
  ctx.fillStyle = INK
  ctx.fillRect(0, photoH, W, Math.max(3, Math.round(W / 400)))

  let y = photoH + pad
  /* Set explicitly: drawing the marks leaves the context centred (drawMark
     centres its ✕ and +), and a centred count is half off the left edge. */
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = INK
  ctx.font = `700 ${countSize}px "JetBrains Mono", ui-monospace, monospace`
  ctx.fillText(count, pad, y)
  ctx.textAlign = 'right'
  ctx.font = `800 ${Math.round(lineSize * 1.2)}px "Barlow Condensed", system-ui, sans-serif`
  ctx.fillText('OVICOUNTER AI', W - pad, y)
  ctx.textAlign = 'left'
  y += countSize + Math.round(lineSize * 0.4)
  ctx.font = `500 ${lineSize}px Barlow, system-ui, sans-serif`
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? INK : MUTED
    ctx.fillText(line, pad, y)
    y += Math.round(lineSize * 1.45)
  })

  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.9))
}

/** The original photograph, as it was taken or chosen. */
export async function originalPhoto(url) {
  return (await fetch(url)).blob()
}

/**
 * Hand the files and text to the system share sheet. Where a browser cannot
 * share files — most laptops — save the images instead and copy the summary,
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
    /* No clipboard (an insecure origin, or refused): the images are saved. */
  }
  return 'saved'
}
