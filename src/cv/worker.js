/* The CV worker.
 *
 * Everything OpenCV touches happens here. The main thread never sees `cv`,
 * never holds a Mat, and never blocks: sliders re-run the pipeline while the
 * operator is still dragging, and the strip screens pan and zoom at the same
 * time. On a mid-range Android those two cannot share a thread.
 *
 * An ES module worker, which forces one wrinkle worth explaining: opencv.js is
 * a UMD bundle and cannot simply be imported. See loadOpenCV below.
 */

import { createPipeline, proposeCrop } from './pipeline.js'
import { autoTune } from './autotune.js'
import { assessFrame } from './gate.js'

let cv = null
let pipeline = null

/**
 * Bring in opencv.js.
 *
 * Two constraints collide here. Vite serves workers as native ES modules in
 * dev whatever `worker.format` says, so `importScripts` — the obvious way to
 * load a UMD bundle — is unavailable and the worker would behave differently in
 * dev than in the build. And opencv.js cannot be `import`ed either: its UMD
 * wrapper assigns `root.cv = factory()` off the top-level `this`, which is
 * `undefined` inside an ES module, so the assignment throws.
 *
 * Fetching the source and running it through indirect eval satisfies both. It
 * evaluates in global sloppy scope, which is exactly the environment the
 * wrapper expects: `this` is the worker's global object, so `root.cv` lands on
 * `self.cv`, and its unqualified `Module = {}` assignment is legal.
 *
 * What lands in `self.cv` is the emscripten Module if the WASM runtime already
 * finished initialising, or a Promise for it if not — which one depends on
 * cache warmth, not on the build, so both are handled.
 */
async function loadOpenCV(trace = () => {}) {
  const url = `${import.meta.env.BASE_URL}opencv.js`
  trace(`fetching ${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`opencv.js: HTTP ${response.status}`)
  const source = await response.text()
  trace(`fetched ${source.length} chars, evaluating`)

  // eslint-disable-next-line no-eval
  ;(0, eval)(source)

  const loaded = self.cv
  trace(`evaluated; self.cv is ${typeof loaded}${loaded && typeof loaded.then === 'function' ? ' (promise)' : ''}`)
  if (!loaded) throw new Error('opencv.js did not define cv')

  const mod = typeof loaded.then === 'function' ? await loaded : loaded
  trace(`runtime settled; Mat is ${typeof mod?.Mat}`)
  if (!mod.Mat) throw new Error('opencv.js loaded but exposes no Mat')
  return mod
}

/** Copy a Mat out of the WASM heap as an ImageData the main thread can draw. */
function matToImageData(mat) {
  const rgba = new cv.Mat()
  try {
    if (mat.channels() === 1) cv.cvtColor(mat, rgba, cv.COLOR_GRAY2RGBA)
    else if (mat.channels() === 3) cv.cvtColor(mat, rgba, cv.COLOR_RGB2RGBA)
    else rgba.setTo(mat)
    // The Mat's data is a view into the WASM heap and is invalidated the moment
    // the Mat is deleted, so this copy is required, not defensive.
    return new ImageData(new Uint8ClampedArray(rgba.data), rgba.cols, rgba.rows)
  } finally {
    rgba.delete()
  }
}

self.onmessage = async (event) => {
  const { id, type } = event.data

  try {
    switch (type) {
      case 'init': {
        if (!cv) {
          cv = await loadOpenCV((message) => self.postMessage({ id, type: 'trace', message }))
          pipeline = createPipeline(cv)
        }
        self.postMessage({ id, type: 'ready' })
        break
      }

      /* Runs on its own frame — the gate decides whether a photograph is worth
         cropping at all, so it cannot use the working image either. */
      case 'assess': {
        const verdict = assessFrame(cv, event.data.imageData, event.data.options)
        self.postMessage({ id, type: 'assessed', ...verdict })
        break
      }

      /* Runs on its own image, before setImage — the crop is what defines the
         working image, so it cannot use one. */
      case 'proposeCrop': {
        const proposal = proposeCrop(cv, event.data.imageData)
        self.postMessage({ id, type: 'cropProposed', ...proposal })
        break
      }

      case 'setImage': {
        const { width, height } = pipeline.setImage(event.data.imageData)
        self.postMessage({ id, type: 'imageSet', width, height })
        break
      }

      case 'run': {
        const started = performance.now()
        const wantStages = !!event.data.wantStages

        /* Stage buffers are copied out synchronously while the Mats are still
           alive, then turned into bitmaps after the run finishes — the pipeline
           disposes everything it allocated the moment it returns. */
        const captured = []
        const onStage = wantStages
          ? (stage, mat) => captured.push({ stage, imageData: matToImageData(mat) })
          : undefined

        const { detections, stats, params, clumps } = pipeline.run(event.data.params, { onStage })

        for (const { stage, imageData } of captured) {
          const bitmap = await createImageBitmap(imageData)
          self.postMessage({ id, type: 'stage', stage, bitmap }, [bitmap])
        }

        self.postMessage({
          id,
          type: 'result',
          detections,
          stats,
          params,
          clumps,
          ms: Math.round(performance.now() - started),
        })
        break
      }

      /* The whole sweep runs here rather than as fifteen round-trips from the
         main thread — each pass is a few milliseconds, so the messaging would
         cost more than the work. */
      case 'autoTune': {
        const started = performance.now()
        const result = autoTune((params) => pipeline.run(params), event.data.options)
        self.postMessage({
          id,
          type: 'autoTuned',
          ...result,
          ms: Math.round(performance.now() - started),
        })
        break
      }

      case 'split': {
        const result = pipeline.splitAlong(event.data.points, event.data.params)
        self.postMessage({ id, type: 'split', ...result })
        break
      }

      case 'dispose': {
        pipeline?.dispose()
        self.postMessage({ id, type: 'disposed' })
        break
      }

      default:
        throw new Error(`unknown message: ${type}`)
    }
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error?.message ?? String(error) })
  }
}
