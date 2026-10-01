import { version as appVersion } from '../../package.json'

/* Files the person saves and opens (Oct 2026): a strip's result, a session's
 * results, and the settings a session counts with.
 *
 * One envelope for all three, so a file says what it is and which version of
 * the format wrote it:
 *
 *   { format: 'ovicounterai/strip' | 'ovicounterai/session' | 'ovicounterai/settings',
 *     version: 1, app: { name, version }, exportedAt, ...body }
 *
 * Mark positions are normalised 0–1 against the WORKING image — the photograph
 * after crop, turn and straighten, about 1200px on its long edge — whose size
 * each strip carries as `image`. The photograph itself is not in the file: it
 * is megabytes, and the record that matters is the marks and the settings.
 *
 * Nothing here sends anything anywhere. Saving goes to the phone's own
 * downloads; opening reads a file the person picked.
 */

export const FORMAT_VERSION = 1

const envelope = (format) => ({
  format: `ovicounterai/${format}`,
  version: FORMAT_VERSION,
  app: { name: 'OvicounterAI', version: appVersion },
  exportedAt: new Date().toISOString(),
})

const round = (v, places = 5) => (Number.isFinite(v) ? Number(v.toFixed(places)) : v)

/* JSON has no Infinity; an open-ended band is written with `max: null`. */
function bandsOut(bands) {
  return bands.map((b) => ({ ...b, max: Number.isFinite(b.max) ? b.max : null }))
}
function bandsIn(bands) {
  return bands.map((b) => ({ ...b, max: b.max === null || b.max === undefined ? Infinity : b.max }))
}

/** One strip's record (stores/session.js `strips[]`) as plain data. */
function stripBody(record) {
  const marks = record.marks ?? []
  return {
    index: record.index,
    count: record.count,
    checked: record.checked,
    appFound: record.machineTotal,
    band: record.band,
    judgments: {
      removed: marks.filter((m) => m.status === 'removed').length,
      added: marks.filter((m) => m.status === 'added').length,
      clumpsChecked: (record.clumps ?? []).filter((c) => c.checked).length,
    },
    image: record.image ?? null,
    crop: {
      box: record.cropBox ?? null,
      quarterTurns: record.quarterTurns ?? 0,
      straightenAngle: record.straightenAngle ?? 0,
    },
    params: record.params ?? null,
    looked: record.looked ?? null,
    clumps: (record.clumps ?? []).map(({ points, ...c }) => ({
      ...c,
      cx: round(c.cx),
      cy: round(c.cy),
      rx: round(c.rx),
      ry: round(c.ry),
      angle: round(c.angle, 4),
    })),
    marks: marks.map((m) => ({
      x: round(m.x),
      y: round(m.y),
      w: round(m.w),
      h: round(m.h),
      status: m.status,
      source: m.source,
      ...(m.clump !== undefined ? { clump: m.clump } : {}),
      ...(m.placed ? { placed: true } : {}),
    })),
  }
}

export function stripFile(record) {
  return { ...envelope('strip'), strip: stripBody(record) }
}

export function sessionFile(finished, bands) {
  return {
    ...envelope('session'),
    session: {
      id: finished.id,
      startedAt: finished.startedAt,
      endedAt: finished.endedAt ?? null,
      minutes: finished.minutes ?? null,
      refusals: finished.refusals ?? 0,
      calibration: finished.calibration ?? null,
      bands: bandsOut(bands),
      strips: (finished.strips ?? []).map(stripBody),
    },
  }
}

/** One row per strip, for a spreadsheet. */
export function sessionCsv(finished) {
  const head = ['session', 'started', 'strip', 'count', 'checked', 'app_found', 'band', 'removed', 'added', 'clumps_checked']
  const rows = (finished.strips ?? []).map((record) => {
    const s = stripBody(record)
    return [
      finished.id,
      finished.startedAt,
      s.index + 1,
      s.count,
      s.checked,
      s.appFound,
      s.band,
      s.judgments.removed,
      s.judgments.added,
      s.judgments.clumpsChecked,
    ]
  })
  const cell = (v) => {
    const text = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [head, ...rows].map((r) => r.map(cell).join(',')).join('\n') + '\n'
}

/* ---------------------------------------------------------------------------
 * Settings: the measured egg, the slider values, and the band scale. */

export function settingsFile({ calibration, params, bands }) {
  return {
    ...envelope('settings'),
    settings: {
      calibration: calibration ?? null,
      params: params ?? null,
      bands: bandsOut(bands),
    },
  }
}

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/**
 * Read a settings file the person opened. Returns { settings } or { error },
 * where error is 'format' (not a settings file), 'version' (a newer format
 * than this app reads) or 'content' (the right kind of file, but broken).
 */
export function readSettings(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { error: 'format' }
  }
  if (data?.format !== 'ovicounterai/settings') return { error: 'format' }
  if (!isNum(data.version) || data.version > FORMAT_VERSION) return { error: 'version' }
  const s = data.settings ?? {}

  const calibration = s.calibration ?? null
  if (calibration && !(isNum(calibration.areaPx) && calibration.areaPx > 0)) return { error: 'content' }

  const params = s.params ?? null
  if (params && !(isNum(params.contrastFloor) && isNum(params.minArea))) return { error: 'content' }

  let bands = null
  if (s.bands) {
    if (!Array.isArray(s.bands) || !s.bands.length) return { error: 'content' }
    for (const b of s.bands) {
      if (typeof b?.key !== 'string' || !isNum(b.min) || !(b.max === null || isNum(b.max))) return { error: 'content' }
    }
    bands = bandsIn(s.bands)
  }

  return { settings: { calibration, params, bands, exportedAt: data.exportedAt ?? null } }
}

/* ---------------------------------------------------------------------------
 * Saving a file to the phone or laptop. */

export function saveFile(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export function saveJson(data, name) {
  saveFile(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), name)
}

export function saveCsv(text, name) {
  saveFile(new Blob([text], { type: 'text/csv' }), name)
}

/** A file name stamp: 2026-10-01-1432. */
export function stamp(iso = new Date().toISOString()) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}
