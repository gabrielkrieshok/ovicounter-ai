/* On-device storage. IndexedDB, no dependency, no server.
 *
 * The record is the product: the photograph, the settings used, and the
 * human-verified egg positions. The count is a projection of it. So the
 * photograph is stored as a blob alongside the marks rather than thrown away
 * after the number is read off — a count nobody can go back and audit is worth
 * much less than one they can.
 *
 * The photograph kept is the WORKING image: cropped, straightened and
 * downscaled to the resolution the pipeline actually saw. Mark positions are
 * normalised against exactly that frame, so it is the only image the marks can
 * be replayed over without a coordinate transform nobody will remember to
 * apply. It is also the smaller file.
 *
 * A demo session writes nothing. Welcome promises that, so every call site
 * checks it before getting here.
 */

const DB_NAME = 'ovicounter'
const DB_VERSION = 1
const SESSIONS = 'sessions'
const STRIPS = 'strips'

let dbPromise = null

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SESSIONS)) {
        db.createObjectStore(SESSIONS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STRIPS)) {
        const strips = db.createObjectStore(STRIPS, { keyPath: 'key' })
        strips.createIndex('sessionId', 'sessionId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function run(storeName, mode, work) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const result = work(tx.objectStore(storeName))
        tx.oncomplete = () => resolve(result?.result ?? result)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

/** True when the device actually has somewhere to put a record. */
export async function isAvailable() {
  if (typeof indexedDB === 'undefined') return false
  try {
    await open()
    return true
  } catch {
    return false
  }
}

export function putSession(session) {
  return run(SESSIONS, 'readwrite', (store) => store.put({ ...session }))
}

export function listSessions() {
  return run(SESSIONS, 'readonly', (store) => store.getAll()).then((rows) =>
    /* Finished sessions, newest first. An unfinished one is not history — it is
       the resume card's business. */
    rows
      .filter((s) => s.endedAt)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
  )
}

/**
 * The session that was interrupted, if there is one.
 *
 * A session with no `endedAt` was never finished: the app was closed, the phone
 * died, the technician was called away. It surfaces on Welcome as a resume
 * card rather than being silently discarded, because the strips already counted
 * into it are real work.
 */
export function findUnfinishedSession() {
  return run(SESSIONS, 'readonly', (store) => store.getAll()).then(
    (rows) =>
      rows
        .filter((s) => !s.endedAt)
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] ?? null,
  )
}

export function putStrip(strip) {
  return run(STRIPS, 'readwrite', (store) => store.put(strip))
}

export function stripsForSession(sessionId) {
  return run(STRIPS, 'readonly', (store) => store.getAll()).then((rows) =>
    rows.filter((r) => r.sessionId === sessionId).sort((a, b) => a.index - b.index),
  )
}

export async function deleteSession(id) {
  const strips = await stripsForSession(id)
  await run(STRIPS, 'readwrite', (store) => {
    for (const strip of strips) store.delete(strip.key)
  })
  await run(SESSIONS, 'readwrite', (store) => store.delete(id))
}

/** The working image as a JPEG blob — what the marks are positioned against. */
export function canvasToBlob(canvas, quality = 0.9) {
  return new Promise((resolve) => {
    if (canvas.convertToBlob) {
      canvas.convertToBlob({ type: 'image/jpeg', quality }).then(resolve, () => resolve(null))
    } else {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
  })
}
