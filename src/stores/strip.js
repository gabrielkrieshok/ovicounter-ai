import { markRaw } from 'vue'
import { defineStore } from 'pinia'

import { useCv } from '@/cv/use-cv'
import { DEFAULT_PARAMS, seedParamsFromEgg } from '@/cv/params'
import { probeForEgg } from '@/cv/probe'
import { downscaledImageData, measureBlobAt, renderWorkingImage } from '@/lib/image'
import { useSessionStore } from './session'

/* The strip currently in hand.
 *
 * One strip's working state, from the moment a photo exists until the operator
 * signs off on the count. Reset at the top of every inner loop; what survives
 * is the record handed to the session store.
 *
 * The marks are the artifact. The count is derived from them and is never
 * stored here as its own number — a count that can disagree with the marks it
 * came from is a count nobody can audit.
 */

let nextMarkId = 1

/* Coverage on Your fixes: how many parts the strip is divided into along its
   length, and how far in the stage must be for a part to count as looked at. */
export const COVERAGE_PARTS = 8
export const COVERAGE_ZOOM = 2

/** Which of the COVERAGE_PARTS a mark sits in, along the strip's length. */
const partOf = (mark) => Math.min(COVERAGE_PARTS - 1, Math.floor(mark.x * COVERAGE_PARTS))

export const useStripStore = defineStore('strip', {
  state: () => ({
    /* The photograph as taken: a bundled sample path, or an object URL for a
       camera frame or gallery pick. */
    sourceUrl: null,

    /* Crop box normalised 0–1 of the STRAIGHTENED source, plus the coarse and
       fine rotations that produce it. */
    cropBox: { l: 0, t: 0, r: 1, b: 1 },
    quarterTurns: 0,
    straightenAngle: 0,
    cropProposed: false,

    /* The cropped, rotated, downscaled frame everything downstream works on.
       Held raw: it is a canvas, and nothing renders off its contents. */
    working: null,

    /* { pass: boolean, reason: 'tooFar' | 'tooBlurry' | 'tooDark' | null } */
    gate: null,

    /* The pipeline settings actually used, recorded alongside the marks so the
       number carries its provenance. */
    params: { ...DEFAULT_PARAMS },

    /* What the calibration probe measured on THIS strip (cv/probe.js), or null
       if it found too few eggs to describe. Kept so a tap on Mark one egg can be
       checked against it. */
    probe: null,

    /* Where the parameters in hand came from: 'probe' (measured across the
       strip, no tap), 'tap' (the operator marked an egg), or null before either.
       Refine reads it to caption the pink tick truthfully. */
    calibrationSource: null,

    /* Each: { id, x, y, w, h, source: 'machine' | 'hand', status: 'proposed' |
       'kept' | 'removed' | 'added', fromClump }. Positions normalised 0–1. */
    marks: [],

    stats: null,
    scanning: false,

    /* Set once the strip has been written into the session. Returning to the
       result screen must not record it twice — the record is the artifact, so a
       duplicate is not a cosmetic problem. */
    recorded: false,

    /* Whether the operator did anything at all on Your fixes — removed, added,
       split, or so much as zoomed or panned to look. Tapping straight through
       used to produce "1,193 eggs, checked by you" with nothing removed and
       nothing added, which is a machine count wearing a human's clothes. This
       is what lets the result say which it was, and it goes into the record. */
    reviewed: false,

    /* One entry per human judgment, newest last. Undo has to be exact rather
       than approximate — these are the operator's decisions, and the record is
       the product. Each entry carries what is needed to put the marks back
       exactly as they were, not a description of what changed. */
    history: [],

    /* Coverage (Field Manual brief §3): the strip in COVERAGE_PARTS equal parts
       along its length, and whether each has been fully on screen at zoom ≥
       COVERAGE_ZOOM. It measures the person's effort — where they looked close
       up — and never the machine's count. Nothing is blocked on it. */
    looked: Array(COVERAGE_PARTS).fill(false),

    /* The crop the marks were found on — set when the crop is applied — so a
       return to Crop can tell "looked again" from "changed it". */
    applied: null,

    /* The furthest step reached (lib/steps.js key), which the step list lets
       the person return to; and whether Refine was part of this strip's path
       on a quick count, which normally skips it. */
    furthest: null,
    visitedRefine: false,
  }),

  getters: {
    /* The machine's provisional total. Survives onto the strip result struck
       through in grey, and appears nowhere else — never while a parameter is
       adjustable. */
    machineTotal: (s) => (s.stats ? s.stats.total : 0),

    /* The count the person signs off on Done: every mark they did not remove.
       Machine marks in parts they never looked at close up are in it — Done
       accepts them — but they stay `proposed` in the record, and Strip result
       says how many parts that was (`partsNotLooked`). */
    humanCount: (s) => s.marks.filter((m) => m.status !== 'removed').length,

    /* The person's own judgments on this strip — what finding the marks
       again would throw away, and so what a confirmation counts. */
    judgments: (s) => s.history.length,

    /* Whether the crop on screen differs from the one the marks were found on. */
    cropChanged: (s) =>
      !!s.applied &&
      (s.applied.quarterTurns !== s.quarterTurns ||
        s.applied.straightenAngle !== s.straightenAngle ||
        ['l', 't', 'r', 'b'].some((k) => Math.abs(s.applied.cropBox[k] - s.cropBox[k]) > 1e-6)),

    /* Parts of the strip never wholly on screen at zoom ≥ 2. */
    partsNotLooked: (s) => s.looked.filter((done) => !done).length,

    removedCount: (s) => s.marks.filter((m) => m.status === 'removed').length,
    addedCount: (s) => s.marks.filter((m) => m.status === 'added').length,
    /* Splits still standing — each is one entry in the undo history, and undoing
       a split pops it, so this never counts a split the person took back. */
    splitCount: (s) => s.history.filter((h) => h.type === 'split').length,
  },

  actions: {
    beginFromPhoto(sourceUrl) {
      this.$reset()
      this.sourceUrl = sourceUrl
    },

    /** Find the paper in the photograph. A proposal — the operator can drag it. */
    async proposeCrop() {
      const { cv, ready } = useCv()
      await ready
      const frame = await downscaledImageData(this.sourceUrl, 600)
      const proposal = await cv.proposeCrop(frame)
      this.cropBox = proposal.box
      this.straightenAngle = proposal.angle
      this.cropProposed = proposal.found
      return proposal
    },

    /**
     * Bake the crop and hand the result to the worker.
     *
     * Everything downstream runs at this one fixed resolution, including the
     * live slider preview, because `minArea` is an absolute pixel count.
     * Previewing at one resolution and locking at another would make the count
     * jump the moment the operator stopped tuning it.
     */
    async applyCrop() {
      const { cv, ready } = useCv()
      await ready

      const image = await renderWorkingImage(
        this.sourceUrl,
        this.cropBox,
        this.quarterTurns,
        this.straightenAngle,
      )
      this.working = markRaw(image)
      this.applied = {
        cropBox: { ...this.cropBox },
        quarterTurns: this.quarterTurns,
        straightenAngle: this.straightenAngle,
      }

      const ctx = image.canvas.getContext('2d', { willReadFrequently: true })
      // Transferred to the worker, so it must be a fresh read each time.
      await cv.setImage(ctx.getImageData(0, 0, image.width, image.height))
      return image
    },

    /** Measure the egg under the operator's finger. Null if it was not on one. */
    measureEggAt(nx, ny) {
      if (!this.working) return null
      return measureBlobAt(this.working.canvas, nx, ny)
    },

    /**
     * Measure a representative egg across the whole strip, with no tap.
     *
     * This is now the FIRST source of calibration, and the tap is the
     * correction. Measured on the demo strip, one tap gave 434 on one run and
     * 1,192 on the next where the probe lands on 364 every time; a sample of
     * one blob cannot describe a strip. Null when the probe finds too few eggs
     * to describe — on a photograph below the resolution floor, or on nearly
     * blank paper — and then Mark one egg is asked for.
     */
    probeForEgg() {
      if (!this.working) return null
      this.probe = probeForEgg(this.working.canvas)
      return this.probe
    },

    /**
     * Adopt a measured egg as the session's calibration, and seed from it.
     *
     * `measurement` is the probe's median egg (cv/probe.js) or the operator's
     * tapped one; `source` records which. Either way it sets the SIZE
     * parameters — it is a direct measurement of an egg on this paper at this
     * camera distance, and nothing else here can measure that.
     *
     * The CUTOFF depends on the source.
     *
     * From a TAP, it comes from the sweep when the sweep finds a clean
     * grain/egg step, and from the tap otherwise. This split is measured, not
     * assumed: two taps a few millimetres apart on the demo strip produced
     * echo counts of 128 and 4313 where the truth is around 364, because the
     * tap reads contrast from ONE blob and a strip offers plenty of
     * unrepresentative ones. The sweep reads the whole strip and lands on 50
     * regardless of where the finger went. On a field photograph, where grain
     * and eggs overlap in contrast and the sweep finds no clean step, the tap
     * is the only signal there is and it is used.
     *
     * From the PROBE, the measured contrast is used as it is. The probe's
     * contrast is already a population median over the clearest eggs on the
     * strip, which is the very thing the sweep was compensating for. And the
     * sweep deliberately takes the FIRST cutoff above the step, the edge of
     * the grain regime: measured on the demo strip that is 50 and 562 marks,
     * where the probe's own contrast gives 97 and 364 — on the plateau where
     * the count is insensitive to the cutoff (60 → 376, 75 → 358, 97 → 364).
     * Two hundred extra proposals on a 364-egg strip is two hundred taps for
     * the operator, for no eggs.
     *
     * This does not rescue a tap that lands on a CLUMP: that inflates the
     * measured area, the size filter scales with it, and every single egg is
     * then rejected as too small. The probe comparison on Mark one egg catches
     * it when there is a probe; the echo count surfaces it when there is not,
     * and "Pick another" is the remedy.
     */
    async adoptCalibration(measurement, source = 'tap') {
      const { cv, ready } = useCv()
      await ready

      const session = useSessionStore()
      session.setCalibration({ ...measurement, source })
      this.calibrationSource = source

      const seeded = { ...DEFAULT_PARAMS, ...seedParamsFromEgg(measurement) }
      if (source === 'probe') {
        this.params = seeded
        return this.params
      }

      const swept = await cv.autoTune({ backgroundKernel: seeded.backgroundKernel })
      this.params = swept.clean
        ? { ...seeded, contrastFloor: swept.params.contrastFloor }
        : seeded
      return this.params
    },

    /** Carry the session's calibration onto a later strip. */
    useSessionCalibration() {
      const session = useSessionStore()
      if (!session.calibration) return false
      this.params = { ...DEFAULT_PARAMS, ...seedParamsFromEgg(session.calibration) }
      this.calibrationSource = session.calibration.source ?? 'tap'
      return true
    },

    /**
     * Run the pipeline. `onStage` receives each real intermediate buffer as it
     * is produced, for the screens that show the work.
     */
    async scan({ params, wantStages = false, onStage } = {}) {
      const { cv, ready } = useCv()
      await ready
      this.scanning = true
      try {
        const settings = params ?? this.params
        const result = await cv.run(settings, { wantStages, onStage })
        this.params = result.params
        this.stats = result.stats
        this.marks = result.detections.map((d) => ({
          id: nextMarkId++,
          x: d.x,
          y: d.y,
          w: d.w,
          h: d.h,
          area: d.area,
          fromClump: d.fromClump,
          source: 'machine',
          status: 'proposed',
        }))
        /* New marks: whatever the person did to the old ones described marks
           that no longer exist. Undo must not reach back to them, nor a strip
           count as reviewed or looked at because the previous marks were.
           Asking before throwing away judgments is the caller's job
           (lib/confirm.js) — Crop, Refine and Mark one egg all do. */
        this.history = []
        this.reviewed = false
        this.looked = Array(COVERAGE_PARTS).fill(false)
        return result
      } finally {
        this.scanning = false
      }
    },

    /**
     * Arriving on Your fixes, the proposals are shown as kept — green — because
     * that is what they will be if the operator does nothing but look. Whether
     * they actually looked is tracked separately in `reviewed`.
     */
    /* A machine mark turns from dashed blue ("found by the app") to solid green
       ("you kept it") only when the part of the strip it sits in has been
       looked at close up (Gabriel, Sep 30, 2026 — Field Manual brief, open
       question 1). Before this, every mark turned green the moment Your fixes
       opened: a claim of "kept" about marks nobody had looked at, the same
       false claim the Sep 19 brief removed from Strip result. Called on arrival,
       because Refine regenerates the marks and the parts already looked at
       still count. */
    applyLooked() {
      for (const mark of this.marks) {
        if (mark.status === 'proposed' && this.looked[partOf(mark)]) mark.status = 'kept'
      }
    },

    /** Any act of review — including just zooming in to look. */
    /** Put the crop back to the one the marks were found on — leaving Crop
     *  without confirming a change must not leave a box the marks don't match. */
    restoreAppliedCrop() {
      if (!this.applied) return
      this.cropBox = { ...this.applied.cropBox }
      this.quarterTurns = this.applied.quarterTurns
      this.straightenAngle = this.applied.straightenAngle
    },

    /** Remember the furthest step reached (by index in `order`). */
    reach(key, order) {
      const at = order.indexOf(key)
      if (at < 0) return
      if (key === 'refine') this.visitedRefine = true
      if (this.furthest === null || order.indexOf(this.furthest) < at) this.furthest = key
    },

    noteReview() {
      this.reviewed = true
    },

    /** Mark the parts wholly inside `viewport` (normalised, along x) as looked
     *  at, if the stage is zoomed in far enough to see eggs rather than rings. */
    noteLooked(viewport, zoom) {
      if (zoom < COVERAGE_ZOOM) return
      for (let i = 0; i < COVERAGE_PARTS; i++) {
        if (this.looked[i]) continue
        const from = i / COVERAGE_PARTS
        const to = (i + 1) / COVERAGE_PARTS
        const eps = 1e-6
        if (viewport.x0 <= from + eps && viewport.x1 >= to - eps) this.looked[i] = true
      }
      this.applyLooked()
    },

    /**
     * The operator pressed Done. If they never touched the strip, the machine's
     * proposals go back to being proposals: a mark nobody looked at is not a
     * human judgment, and the record must not say it was. The result then shows
     * the machine total, styled as one, and no human count.
     */
    finishReview() {
      if (this.reviewed) return true
      for (const mark of this.marks) {
        if (mark.source === 'machine' && mark.status === 'kept') mark.status = 'proposed'
      }
      return false
    },

    /** Tap a mark: found or kept becomes removed, and tapping again puts it
     *  back as kept — the person has looked at it now. */
    toggleMark(id) {
      const mark = this.marks.find((m) => m.id === id)
      if (!mark) return

      this.reviewed = true
      const was = mark.status
      if (was === 'added') {
        // A hand-added egg has no machine proposal underneath to fall back to,
        // so removing it removes it outright.
        this.marks = this.marks.filter((m) => m.id !== id)
        this.history.push({ type: 'unadd', mark: { ...mark } })
        return
      }

      mark.status = was === 'removed' ? 'kept' : 'removed'
      this.history.push({ type: 'status', id, was })
    },

    /** Place an egg the scan missed. */
    addMark(point) {
      this.reviewed = true
      const size = Math.sqrt(this.params.medianEggArea / Math.PI) * 2
      const mark = {
        id: nextMarkId++,
        x: point.x,
        y: point.y,
        /* Sized from the calibration egg, because a hand-placed mark has no
           blob of its own to measure and should still look like the others. */
        w: size / (this.working?.width ?? 1200),
        h: size / (this.working?.height ?? 600),
        area: this.params.medianEggArea,
        fromClump: false,
        source: 'hand',
        status: 'added',
      }
      this.marks.push(mark)
      this.history.push({ type: 'add', id: mark.id })
      return mark
    },

    /**
     * Split a clump along a drawn stroke.
     *
     * The cut happens in the pixels (see cv/pipeline.js `splitAlong`), and the
     * marks in the affected neighbourhood are replaced by what the recount
     * found. Marks outside it are untouched, so this never quietly discards
     * judgments made elsewhere on the strip.
     */
    async splitAlong(points) {
      const { cv, ready } = useCv()
      await ready

      const { detections, region } = await cv.split(points, this.params)
      /* Drawing the stroke was an act of review even when it cut nothing. */
      this.reviewed = true
      if (!region || !detections.length) return 0

      const inside = (m) =>
        m.x >= region.l && m.x <= region.r && m.y >= region.t && m.y <= region.b

      const replaced = this.marks.filter(inside)
      const kept = this.marks.filter((m) => !inside(m))

      const fresh = detections.map((d) => ({
        id: nextMarkId++,
        x: d.x,
        y: d.y,
        w: d.w,
        h: d.h,
        area: d.area,
        fromClump: d.fromClump,
        source: 'machine',
        /* The operator asked for this cut, so what it produced is already
           answered — it arrives kept rather than waiting to be confirmed. */
        status: 'kept',
        fromSplit: true,
      }))

      this.marks = [...kept, ...fresh]
      this.history.push({
        type: 'split',
        removed: replaced.map((m) => ({ ...m })),
        addedIds: fresh.map((m) => m.id),
      })
      return fresh.length
    },

    undo() {
      const last = this.history.pop()
      if (!last) return false

      switch (last.type) {
        case 'status': {
          const mark = this.marks.find((m) => m.id === last.id)
          if (mark) mark.status = last.was
          break
        }
        case 'add':
          this.marks = this.marks.filter((m) => m.id !== last.id)
          break
        case 'unadd':
          this.marks.push(last.mark)
          break
        case 'split': {
          const addedIds = new Set(last.addedIds)
          this.marks = [
            ...this.marks.filter((m) => !addedIds.has(m.id)),
            ...last.removed,
          ]
          break
        }
      }
      return true
    },
  },
})
