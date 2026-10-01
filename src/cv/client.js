/* Main-thread handle on the CV worker.
 *
 * Promise per request, matched by id. Stage buffers arrive as ImageBitmaps
 * before the result they belong to, so Processing can show each real buffer as
 * it is produced rather than all of them at the end.
 */

export function createCvClient({ onTrace } = {}) {
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })

  let nextId = 1
  const pending = new Map()

  worker.onmessage = (event) => {
    const { id, type } = event.data
    const entry = pending.get(id)
    if (!entry) return

    if (type === 'stage') {
      entry.onStage?.(event.data.stage, event.data.bitmap)
      return
    }

    if (type === 'trace') {
      onTrace?.(event.data.message)
      return
    }

    pending.delete(id)
    if (type === 'error') entry.reject(new Error(event.data.message))
    else entry.resolve(event.data)
  }

  worker.onerror = (event) => {
    const error = new Error(event.message || 'CV worker failed')
    for (const [, entry] of pending) entry.reject(error)
    pending.clear()
  }

  function send(message, transfer = [], onStage) {
    const id = nextId++
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, onStage })
      worker.postMessage({ ...message, id }, transfer)
    })
  }

  return {
    /** Load opencv.js and build the pipeline. ~8.9MB of WASM; do it early. */
    init: () => send({ type: 'init' }),

    /** Judge a frame against the capture gate. See cv/gate.js. */
    assess: (imageData, options) =>
      send({ type: 'assess', imageData, options: { ...options } }, [imageData.data.buffer]),

    /** Find the paper in a photograph. Runs on a downscaled copy of the frame. */
    proposeCrop: (imageData) =>
      send({ type: 'proposeCrop', imageData }, [imageData.data.buffer]),

    /**
     * Hand over the working image. The ImageData buffer is transferred, not
     * copied — the caller must not touch it afterwards.
     */
    setImage: (imageData) =>
      send({ type: 'setImage', imageData }, [imageData.data.buffer]),

    /**
     * Run detection. `onStage(name, bitmap)` fires per real pipeline buffer
     * when `wantStages` is set — Processing wants them, a slider re-run does
     * not.
     *
     * Params are flattened to a plain object first. Callers hand these straight
     * out of a Pinia store, and structured clone cannot copy a reactive Proxy —
     * it throws DataCloneError. The parameters are all flat numbers, so a
     * shallow copy is enough, and this is the boundary where reactivity ends.
     */
    run: (params, { wantStages = false, onStage } = {}) =>
      send({ type: 'run', params: { ...params }, wantStages }, [], onStage),

    /** Choose a cutoff by sweeping for the grain/egg step. See cv/autotune.js. */
    autoTune: (options) => send({ type: 'autoTune', options: { ...options } }),



    dispose: () => send({ type: 'dispose' }),

    terminate: () => worker.terminate(),
  }
}
