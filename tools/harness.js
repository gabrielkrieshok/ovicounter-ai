/* Dev-only harness. Runs the real pipeline over the real photographs and
   reports what it found, how long it took, and whether it survives a slider's
   worth of repeated runs without leaking the WASM heap.
   Not reachable from the app and not part of the build. */

import { downscaledImageData, renderWorkingImage } from '@/lib/image.js'
import { createCvClient } from '@/cv/client.js'
import { seedParamsFromEgg } from '@/cv/params.js'
/* The operator's tap, without a finger. The probe used to live here; it is now
   the app's own first source of calibration and lives in src/cv/probe.js, so
   what this harness reports is what the app produces. */
import { probeForEgg } from '@/cv/probe.js'
import { DEMO_PHOTO, FIELD_SAMPLES, REFUSAL_SAMPLE } from '@/lib/samples.js'

const IMAGES = [
  { id: 'test-strip (demo)', src: DEMO_PHOTO },
  ...FIELD_SAMPLES.filter((s) => ['guatemala', 'jamaica', 'portugal-1', 'portugal-2', 'whole-strip'].includes(s.id)),
  { id: 'el-salvador (must refuse)', src: REFUSAL_SAMPLE },
]

const cards = document.getElementById('cards')
const dump = document.getElementById('dump')
const cv = createCvClient({ onTrace: (message) => note(`  worker: ${message}`) })

/* `?only=portugal` runs one image, `?stress=0` skips the leak check. Each
   image writes its row as it finishes, so a run that is cut short still
   reports everything it got through. */
const query = new URLSearchParams(location.search)
const ONLY = query.get('only')
const STRESS_RUNS = query.has('stress') ? Number(query.get('stress')) : 120

/* Progress goes straight into the page. A headless run that stalls should say
   which step it stalled on, not just stop. */
const log = []
function note(message) {
  log.push(`${String(Math.round(performance.now())).padStart(6)}ms  ${message}`)
  dump.textContent = log.join('\n')
}

function drawOverlay(canvas, working, detections) {
  const DISPLAY_W = 356
  const scale = DISPLAY_W / working.width
  canvas.width = DISPLAY_W
  canvas.height = Math.round(working.height * scale)

  const ctx = canvas.getContext('2d')
  ctx.drawImage(working.canvas, 0, 0, canvas.width, canvas.height)

  // Mark language: dashed blue ring = machine-proposed, not yet human-answered.
  // Diameter clamped 7–26px, white halo, exactly as the token rules require.
  ctx.lineWidth = 1.5
  ctx.setLineDash([3, 2])
  for (const d of detections) {
    const cx = d.x * canvas.width
    const cy = d.y * canvas.height
    const r = Math.min(13, Math.max(3.5, (Math.max(d.w, d.h) * canvas.width) / 2 + 2))

    ctx.strokeStyle = 'rgba(255,255,255,.55)'
    ctx.beginPath()
    ctx.arc(cx, cy, r + 1, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = d.fromClump ? '#e0158f' : '#1250c8'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([])
}

async function runOne(image) {
  const card = document.createElement('div')
  card.className = 'card'
  card.innerHTML = `<h2>${image.id}</h2>
    <canvas class="overlay"></canvas>
    <p class="label">what the threshold kept — the real buffer, not a filter</p>
    <canvas class="specks"></canvas>
    <table></table>`
  cards.appendChild(card)

  note(`${image.id}: loading`)
  const working = await renderWorkingImage(image.src, { l: 0, t: 0, r: 1, b: 1 }, 0)
  const ctx = working.canvas.getContext('2d', { willReadFrequently: true })
  const imageData = ctx.getImageData(0, 0, working.width, working.height)

  note(`${image.id}: working ${working.width}×${working.height}, handing to worker`)
  await cv.setImage(imageData)

  note(`${image.id}: measuring an egg`)
  const egg = probeForEgg(working.canvas)
  if (!egg) {
    /* No measurable egg anywhere on the strip. On El Salvador this is the
       correct answer, not a failure: at 1–3px per egg the shape information is
       not in the pixels and no cutoff recovers it. */
    note(`${image.id}: no measurable egg — nothing to calibrate from`)
    return {
      image: image.id,
      working: `${working.width}×${working.height}`,
      eggFound: false,
    }
  }

  const seed = seedParamsFromEgg(egg)
  note(
    `${image.id}: egg ${Math.round(egg.areaPx)}px², contrast ${Math.round(egg.contrast)} ` +
      `(${egg.samples} probes) → cutoff ${seed.contrastFloor}`,
  )

  const stageBitmaps = {}
  const second = await cv.run(seed, {
    wantStages: true,
    onStage: (stage, bitmap) => {
      stageBitmaps[stage] = bitmap
    },
  })
  note(`${image.id}: found ${second.stats.total}`)

  drawOverlay(card.querySelector('.overlay'), working, second.detections)
  if (stageBitmaps.darkSpecks) {
    const speckCanvas = card.querySelector('.specks')
    speckCanvas.width = 356
    speckCanvas.height = Math.round((356 / working.width) * working.height)
    speckCanvas
      .getContext('2d')
      .drawImage(stageBitmaps.darkSpecks, 0, 0, speckCanvas.width, speckCanvas.height)
  }

  /* Defect 4 was a per-frame contour leak. A live slider re-runs the pipeline
     every 60–80ms, so a hundred-odd runs is roughly ten seconds of dragging.
     If anything still leaks, WASM heap growth across the loop is where it
     surfaces — elapsed time alone would not show it. */
  let stress = null
  if (STRESS_RUNS > 0) {
    const heapBefore = performance.memory?.usedJSHeapSize ?? 0
    const stressStart = performance.now()
    for (let i = 0; i < STRESS_RUNS; i++) {
      await cv.run({ ...seed, thresholdC: 6 + (i % 9) })
    }
    const elapsed = performance.now() - stressStart
    stress = {
      runs: STRESS_RUNS,
      perRunMs: Math.round(elapsed / STRESS_RUNS),
      heapGrowthMB:
        Math.round(
          (((performance.memory?.usedJSHeapSize ?? 0) - heapBefore) / 1048576) * 10,
        ) / 10,
    }
  }

  const row = {
    image: image.id,
    working: `${working.width}×${working.height}`,
    eggContrast: Math.round(egg.contrast),
    cutoff: seed.contrastFloor,
    medianEggArea: seed.medianEggArea,
    eggLongEdgePx: Math.round(egg.longEdgePx),
    /* The resolution floor from docs/gate-study-RESULTS.md: Portugal works at a 15px
       egg bounding box, El Salvador fails at 4px, and shape is simply not
       recoverable somewhere in between. The exact threshold has never been
       swept, so 8px is a bracket, not a measurement — it is the criterion the
       capture gate will refuse on, surfaced here so the harness says plainly
       which photographs are countable at all. */
    belowFloor: egg.longEdgePx < 8,
    total: second.stats.total,
    singles: second.stats.singles,
    fromClumps: second.stats.fromClumps,
    clumps: second.stats.clumps,
    inferred: second.stats.inferred,
    agreement: second.stats.agreement,
    singleMedianArea: second.stats.singleMedianArea,
    totalByArea: second.stats.totalByArea,
    ms: second.ms,
    ...(stress ?? {}),
  }

  card.querySelector('table').innerHTML = Object.entries(row)
    .map(([k, v]) => `<tr><td>${k}</td><td>${v ?? '—'}</td></tr>`)
    .join('')

  return row
}

/**
 * Sweep the "light / dark split" cutoff and report what each setting yields.
 *
 * This is the diagnostic version of the search-based auto-set from §3.1: scan
 * the parameter space and look for a plateau where the total count is
 * insensitive to small perturbations, on the logic that wildly count-sensitive
 * regions of parameter space are artifacts rather than eggs. Reading the table
 * is how the defaults get chosen; guessing at them is how the last two rounds
 * produced a buffer full of paper grain.
 */
async function sweep(image) {
  note(`sweeping ${image.id}`)
  const working = await renderWorkingImage(image.src, { l: 0, t: 0, r: 1, b: 1 }, 0)
  const ctx = working.canvas.getContext('2d', { willReadFrequently: true })
  await cv.setImage(ctx.getImageData(0, 0, working.width, working.height))

  const rows = []
  for (const kernel of [21, 31, 51]) {
    for (const floor of [10, 15, 20, 25, 30, 35, 40, 50, 60, 75]) {
      const r = await cv.run({
        contrastFloor: floor,
        backgroundKernel: kernel,
        // Wide open, so the sweep reports what the CUTOFF does rather than what
        // the shape and size filters do.
        minArea: 8,
        maxArea: 100000,
        splitFactor: 1e9, // never split; count raw islands
      })
      const areas = r.detections.map((d) => d.area).sort((a, b) => a - b)
      rows.push({
        kernel,
        floor,
        islands: r.detections.length,
        medianArea: areas.length ? areas[Math.floor(areas.length / 2)] : 0,
        p90Area: areas.length ? areas[Math.floor(areas.length * 0.9)] : 0,
        ms: r.ms,
      })
    }
  }

  const header = 'kernel  floor  islands  medianArea  p90Area   ms'
  const table = rows
    .map(
      (r) =>
        `${String(r.kernel).padStart(6)}${String(r.floor).padStart(7)}` +
        `${String(r.islands).padStart(9)}${String(r.medianArea).padStart(12)}` +
        `${String(r.p90Area).padStart(9)}${String(r.ms).padStart(5)}`,
    )
    .join('\n')
  note(`\n${header}\n${table}`)
}

/**
 * Sweep the resolution floor.
 *
 * V2 §9 lists this as an open question: the workable range is bracketed — fails
 * at ~3px per egg, works at ~15px — but the threshold between has never been
 * measured, and the capture gate needs a number rather than a bracket.
 *
 * Method: take one photograph whose eggs are unambiguously well resolved, render
 * it at descending working resolutions, and at each one measure the egg and run
 * the real pipeline. The count at full resolution is the reference. Recall is
 * the fraction of it recovered — not against hand-labelled ground truth, which
 * does not exist for this strip, but against the same detector on the same
 * photograph with more pixels to work with. That measures exactly what the gate
 * needs to know: at what egg size does downscaling start destroying eggs.
 */
async function floorSweep(image) {
  note(`sweeping the resolution floor on ${image.id}`)
  const SIZES = [1200, 1000, 850, 700, 600, 500, 420, 350, 300, 250, 200, 160]
  const rows = []
  let reference = null

  for (const longEdge of SIZES) {
    const working = await renderWorkingImage(
      image.src,
      { l: 0, t: 0, r: 1, b: 1 },
      0,
      0,
      longEdge,
    )
    const ctx = working.canvas.getContext('2d', { willReadFrequently: true })
    await cv.setImage(ctx.getImageData(0, 0, working.width, working.height))

    const egg = probeForEgg(working.canvas)
    if (!egg) {
      rows.push({ longEdge, eggPx: 0, found: 0, recall: 0, note: 'no measurable egg' })
      continue
    }

    const seed = seedParamsFromEgg(egg)
    const swept = await cv.autoTune({ backgroundKernel: seed.backgroundKernel })
    const params = swept.clean
      ? { ...seed, contrastFloor: swept.params.contrastFloor }
      : seed

    const { stats } = await cv.run(params)
    if (reference === null) reference = stats.total

    rows.push({
      longEdge,
      eggPx: Math.round(egg.longEdgePx * 10) / 10,
      found: stats.total,
      recall: reference ? Math.round((stats.total / reference) * 100) : 0,
    })
  }

  const header = 'longEdge  eggPx  found  recall%'
  const table = rows
    .map(
      (r) =>
        `${String(r.longEdge).padStart(8)}${String(r.eggPx).padStart(7)}` +
        `${String(r.found).padStart(7)}${String(r.recall).padStart(9)}` +
        (r.note ? `  ${r.note}` : ''),
    )
    .join('\n')
  note(`\n${header}\n${table}`)
}

async function main() {
  note('loading opencv.js in the worker')
  await cv.init()
  note('opencv ready')

  /* What the gate sees on every bundled photograph. El Salvador must be
     refused; the demo strip must pass; the rest say where the thresholds have
     to sit to separate them. */
  if (query.has('gate')) {
    const rows = []
    for (const image of IMAGES) {
      const frame = await downscaledImageData(image.src, 900)
      const working = await renderWorkingImage(image.src, { l: 0, t: 0, r: 1, b: 1 }, 0)
      /* The gate judges a viewfinder frame but has to reason about the WORKING
         image the pipeline will see, so it is told the ratio between them. */
      const scale = Math.max(frame.width, frame.height) / Math.max(working.width, working.height)
      const verdict = await cv.assess(frame, { scale })
      rows.push({ image: image.id, ...verdict.metrics, pass: verdict.pass, reason: verdict.reason ?? '—' })
    }
    const header = 'image                       bright  sharp  eggPx  eggs  pass  reason'
    note(
      `\n${header}\n` +
        rows
          .map(
            (r) =>
              `${r.image.padEnd(26)}${String(r.brightness).padStart(7)}` +
              `${String(r.sharpness).padStart(7)}${String(r.eggPx).padStart(7)}` +
              `${String(r.eggs).padStart(6)}${String(r.pass).padStart(7)}  ${r.reason}`,
          )
          .join('\n'),
    )
    document.title = 'harness done'
    return
  }

  if (query.has('floor')) {
    await floorSweep(IMAGES.find((i) => i.id.includes(ONLY ?? 'test-strip')))
    document.title = 'harness done'
    return
  }

  if (query.has('sweep')) {
    const image = IMAGES.find((i) => i.id.includes(ONLY ?? 'test-strip'))
    await sweep(image)
    document.title = 'harness done'
    return
  }

  const list = ONLY ? IMAGES.filter((i) => i.id.includes(ONLY)) : IMAGES
  const rows = []
  for (const image of list) {
    try {
      rows.push(await runOne(image))
    } catch (error) {
      note(`${image.id}: FAILED ${error.message}`)
      rows.push({ image: image.id, error: error.message })
    }
  }
  // Rows land under the progress log, so a run cut short still shows both.
  note(`\n${JSON.stringify(rows, null, 2)}`)
  document.title = 'harness done'
}

main().catch((error) => {
  note(`FAILED: ${error.message}\n${error.stack ?? ''}`)
  document.title = 'harness failed'
})
