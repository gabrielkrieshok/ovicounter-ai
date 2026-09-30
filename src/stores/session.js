import { defineStore } from 'pinia'
import { DEFAULT_BANDS, bandFor } from '@/lib/bands'
import * as storage from '@/lib/storage'

/* The session is the top-level object (design brief §3).
 *
 * One sitting, one phone, one lighting condition, N strips. Everything that is
 * expensive — the calibration, the seeded parameters — is paid once here and
 * carried forward, so strip 15 costs less than strip 1. There is no cap on
 * strips; any bound should come from the collection rhythm or a measured device
 * limit, not from a number invented here.
 *
 * The record is the primary artifact: photo, settings, and human-verified
 * marks. The count is a projection of the marks, and the band is a projection
 * of the count. Neither is stored as a source of truth.
 */

export const useSessionStore = defineStore('session', {
  state: () => ({
    id: null,
    startedAt: null,

    /* A demo session runs the whole flow on a bundled strip and saves nothing.
       Welcome promises exactly that, so every write path checks this flag. */
    isDemo: false,

    /* Quick count (Sep 2026, docs/surpass-v1-brief.md §4): photo → crop →
       marks → fix if wanted → number, with no session and nothing saved unless
       the person asks. The demo uses it. It is a session in every mechanical
       sense — the strip store and the screens do not care — that never writes
       and never appears in history, and can be PROMOTED to a real session from
       the result ("Start a session with these settings"). */
    isQuick: false,

    /* { x, y, wPx, hPx, areaPx, rPx, params } — the tapped egg, measured, plus
       the pipeline parameters seeded from it. Set once per session. */
    calibration: null,

    /* Completed strip records. */
    strips: [],

    /* Photos the gate refused. Counted for the session summary, never recorded
       as strips — a refused photo does not advance the strip counter and does
       not land in the record. */
    refusals: 0,

    bands: DEFAULT_BANDS,

    /* Finished sessions read back from this device. Stays empty until
       persistence lands; Welcome renders whatever is here and nothing else. */
    previous: [],

    /* The session just ended, held so the summary has something to show after
       the active session has been cleared. */
    lastFinished: null,

    /* Whether finished strips actually reach the device's storage. Set by
       `openStorage()` once IndexedDB has answered, and it gates the "SAVED ON
       THIS PHONE ✓" badge — a badge claiming a record was saved when none was
       written is the kind of lie this whole design exists to avoid. Private
       browsing and a full disk both leave it false, correctly. */
    storageReady: false,

    /* An interrupted session found on this device, offered on Welcome. */
    resumable: null,
  }),

  getters: {
    isActive: (s) => s.id !== null,
    /* Strip numbers are 1-based and shown to the operator ("Strip 1"). */
    stripNumber: (s) => s.strips.length + 1,
    needsCalibration: (s) => s.calibration === null,
    counts: (s) => s.strips.map((r) => r.count),
    /* A demo saves nothing by promise, a quick count saves nothing by design,
       and a real session saves only when the device can. */
    recordsPersist: (s) => !s.isDemo && !s.isQuick && s.storageReady,
    bandsSoFar: (s) => s.strips.map((r) => bandFor(r.count, s.bands).letter),
  },

  actions: {
    /**
     * Ask the device whether it can keep records, and read back what it already
     * has. Called from Welcome; everything downstream reads `storageReady`
     * rather than assuming an answer.
     */
    async openStorage() {
      this.storageReady = await storage.isAvailable()
      if (!this.storageReady) return
      this.previous = await storage.listSessions()
      this.resumable = await storage.findUnfinishedSession()
    },

    async start({ demo = false, quick = false } = {}) {
      this.id = `s${Date.now().toString(36)}`
      this.startedAt = new Date().toISOString()
      this.isDemo = demo
      this.isQuick = quick
      this.calibration = null
      this.strips = []
      this.refusals = 0
      this.resumable = null

      /* Written at the START, not at the end. A session that is interrupted has
         to be findable, and a record only written on a clean exit is exactly
         the record that goes missing when the exit is not clean. */
      if (this.recordsPersist) {
        await storage.putSession(this.snapshot())
      }
    },

    /**
     * A quick count's next strip. Each quick count stands alone: the previous
     * strip is dropped (it was never saved, as promised) and the calibration is
     * cleared so the probe measures the new photograph afresh.
     */
    countAnother() {
      this.strips = []
      this.calibration = null
    },

    /**
     * "Start a session with these settings": the quick count becomes strip 1 of
     * a real session, with its calibration carried forward and its record —
     * the one thing the person has just asked to keep — written now.
     */
    async promote(workingCanvas) {
      this.isQuick = false
      if (!this.recordsPersist) return false
      await storage.putSession(this.snapshot())
      const record = this.strips[this.strips.length - 1]
      if (record) {
        const photo = workingCanvas ? await storage.canvasToBlob(workingCanvas) : null
        await storage.putStrip({
          key: `${this.id}:${record.index}`,
          sessionId: this.id,
          index: record.index,
          photo,
          ...record,
        })
      }
      return true
    },

    /** Pick up a session that was interrupted rather than finished. */
    async resume(sessionId) {
      const strips = await storage.stripsForSession(sessionId)
      const record = this.resumable
      if (!record) return false

      this.id = record.id
      this.startedAt = record.startedAt
      this.isDemo = false
      this.isQuick = false
      this.refusals = record.refusals ?? 0
      this.calibration = record.calibration ?? null
      this.strips = strips.map((s) => ({ ...s }))
      this.resumable = null
      return true
    },

    /** What gets written to the device. Marks and photos live on the strips. */
    snapshot() {
      return {
        id: this.id,
        startedAt: this.startedAt,
        endedAt: null,
        counts: this.counts,
        /* Strips finished without anyone checking the marks (`checked: false`),
           so Welcome can say so beside the session. Older records lack it. */
        unchecked: this.strips.filter((r) => r.checked === false).length,
        refusals: this.refusals,
        /* Carried so a resumed session does not ask the operator to mark an egg
           a second time — the whole point of calibrating once per sitting. */
        calibration: this.calibration ? { ...this.calibration } : null,
      }
    },

    setCalibration(calibration) {
      this.calibration = calibration
      if (this.recordsPersist && this.id) {
        storage.putSession(this.snapshot()).catch(() => {
          /* The session record is rewritten on every strip; losing this one
             write costs a re-calibration on resume, not the session. */
        })
      }
    },

    recordRefusal() {
      this.refusals += 1
    },

    /**
     * Record a finished strip. `record` carries the photo, the crop box and
     * rotation, the gate verdict, the pipeline settings used, and the marks —
     * the count is derived, not passed in, so the two can never disagree.
     */
    async completeStrip(record, workingCanvas) {
      const index = this.strips.length
      this.strips.push({ ...record, index })

      if (!this.recordsPersist) return false

      /* The photograph is part of the record, not an illustration of it. */
      const photo = workingCanvas ? await storage.canvasToBlob(workingCanvas) : null
      await storage.putStrip({
        key: `${this.id}:${index}`,
        sessionId: this.id,
        index,
        photo,
        ...record,
      })
      /* Rewrite the session so its counts stay in step with its strips even if
         the sitting is never formally ended. */
      await storage.putSession(this.snapshot())
      return true
    },

    end() {
      const endedAt = new Date().toISOString()
      const finished = {
        id: this.id,
        startedAt: this.startedAt,
        endedAt,
        minutes: Math.max(
          1,
          Math.round((Date.parse(endedAt) - Date.parse(this.startedAt)) / 60000),
        ),
        counts: this.counts,
        refusals: this.refusals,
        wasDemo: this.isDemo,
      }
      this.lastFinished = finished
      // A demo saves nothing, and a quick count is not a session at all — it
      // ends without a summary and never enters the history.
      if (!this.isDemo && !this.isQuick) {
        this.previous.unshift(finished)
        if (this.storageReady) {
          storage
            .putSession({ ...this.snapshot(), endedAt, minutes: finished.minutes })
            .catch(() => {
              /* The strips are already written; only the closing timestamp is
                 at risk, and an unclosed session reappears as resumable rather
                 than vanishing. */
            })
        }
      }
      this.id = null
      this.startedAt = null
      this.isDemo = false
      this.isQuick = false
      this.calibration = null
      this.strips = []
      this.refusals = 0
      return finished
    },
  },
})
