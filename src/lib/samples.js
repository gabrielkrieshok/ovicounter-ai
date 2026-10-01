/* Photographs bundled with the build.
 *
 * These ship in the download, so the list is short on purpose. The 52MB
 * debugging corpus lives in `paper-tests/` and is opened through the file
 * picker instead — shipping it would triple the app's size for no field
 * benefit.
 */

/* The demo photo. Welcome promises "the whole flow on a bundled strip", so this
   has to be a strip that the pipeline can genuinely count: eggs well clear of
   the resolution floor, even lighting, no background to crop away. It is dense
   — several hundred eggs — which is the honest case, not the flattering one. */
export const DEMO_PHOTO = '/samples/test-strip.png'

/* The three demos (Sep 30, 2026). `clean` is the strip above — the one the
   yellow button starts. `field` is a whole strip lying on a table: stained,
   creased, with the table around it to crop away. `pattern` is drawn on this
   phone with a known number of ovoids (lib/test-pattern.js). */
export const DEMOS = ['clean', 'field', 'pattern']
export const FIELD_DEMO_PHOTO = '/samples/whole-strip-on-table.jpg'

/** The photograph for a demo: { url, drawn } — `drawn` only for the pattern. */
export async function demoPhoto(kind) {
  if (kind === 'field') return { url: FIELD_DEMO_PHOTO, drawn: null }
  if (kind === 'pattern') {
    const { drawTestPattern } = await import('@/lib/test-pattern')
    return drawTestPattern()
  }
  return { url: DEMO_PHOTO, drawn: null }
}

/* Field photographs, for testing the pipeline against real variation. Not
   reachable from the flow; used by the dev harness. */
export const FIELD_SAMPLES = [
  { id: 'guatemala', src: '/samples/guatemala.jpg', note: 'Best case — eggs clearly resolved on quilt-textured paper; the embossing is a false-positive source.' },
  { id: 'jamaica', src: '/samples/jamaica.jpg', note: 'Mid-difficulty — small round eggs on pale paper.' },
  { id: 'portugal-1', src: '/samples/portugal-1.jpg', note: '~15px eggs. 0.97 recall measured here.' },
  { id: 'portugal-2', src: '/samples/portugal-2.jpg' },
  { id: 'portugal-3', src: '/samples/portugal-3.jpg' },
  { id: 'portugal-4', src: '/samples/portugal-4.jpg' },
  { id: 'portugal-5', src: '/samples/portugal-5.jpg' },
  { id: 'whole-strip', src: '/samples/whole-strip-on-table.jpg', note: 'Whole strip on a table, background included — exercises the crop.' },
]

/* The canonical refusal case. Eggs are 1–3px specks: below the resolution
   floor, where no amount of tuning recovers shape that is not in the pixels.
   The gate must refuse this photo, and that is correct behaviour, not a bug. */
export const REFUSAL_SAMPLE = '/samples/el-salvador-refusal.jpg'
