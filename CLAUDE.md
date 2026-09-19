# Ovicounter AI — project instructions

Assisted mosquito-egg counting for ovitrap surveillance. A technician
photographs a strip; the app deliberately **over-proposes** candidate eggs; the
technician **culls** them; the record is the photo, the settings, and the
human-verified egg positions. **The operator is the authority; the machine
proposes.**

## Read these first, in order

1. `design_handoff_session_flow/README.md` — the handoff. Screen-by-screen
   layouts, the mark language, and the ratified copy.
2. `design_handoff_session_flow/Ovicounter Hi-Fi.dc.html` — the 8 screens at
   380×788. **Recreate pixel-perfectly.** Open it in a browser.
3. `src/styles/tokens.css` — the design contract. Every colour, radius, spacing
   value and hit size. Do not introduce values that are not in it.
4. The Notion page "Ovicounter AI" → **V2** (project definition) and **Design
   Brief v2** (flow). V2 is the source of truth for *why*; the handoff is the
   source of truth for *what the screen looks like*.

## Nomenclature

Screens are named, never coded. Use these names in code, in commits, and in
conversation — they are the handoff's `data-screen-label` values:

**Welcome · Capture · Refusal · Crop · Mark one egg · Processing · Refine ·
Your fixes · Strip result · Session summary**

## Stack — decided, don't relitigate

- **Vue 3 + Vite + Pinia**, Composition API, `<script setup>`. Hash routing, so
  the build is a plain static site that also runs from a service-worker cache.
- **No component library.** The design has a handful of primitives; they are
  SFCs styled with the custom properties in `tokens.css`. The look is the
  handoff — do not "improve" it, do not add shadows for depth, do not round
  corners past spec.
- **Fonts** self-hosted in `public/fonts/` (Archivo 400–800, IBM Plex Mono
  400–700). Never fetched from Google at runtime.
- **OpenCV.js 4.13** in `public/opencv.js`, 8.9MB, bundled not CDN.
- **All CV runs in a Web Worker.** The main thread never sees `cv` and never
  holds a Mat. Live sliders and pinch-zoom cannot share a thread on a
  mid-range Android.
- **Viewport:** design and check at 380px inside the phone frame; full-bleed
  below 430px. **At 900px and up the frame is dropped and stage screens go
  two-pane** (decided Sep 2026, `docs/surpass-v1-brief.md` §3 — a deliberate
  deviation from "design at 380px inside the frame"; the audience for now is
  partners and funders on laptops): photograph left at full height, title,
  controls, legend and actions in a right column never narrower than 380px
  (`1fr minmax(var(--device-w), var(--pane-share))`). Same components, tokens
  and copy; each screen carries its own `.wide` rules and App.vue provides
  `wideLayout`. `?frame=1` in the page URL keeps the frame at any width for
  checking against the hi-fi. All three modes are the same code.

Ask before adding any dependency beyond vue, vue-router, pinia, vite and
@vitejs/plugin-vue.

## Non-negotiables

1. **No machine total anywhere on Refine.** A visible total lets the operator
   tune until the number matches what they expected. A tally of *human*
   judgments during review is explicitly fine.
2. **No fake CV.** Processing shows real pipeline buffers, never a CSS filter
   standing in for one. If a buffer isn't ready, show the previous one.
3. **A machine guess and a human judgment never look like the same kind of
   thing.** Machine count grey with a leading `~`; human count black, larger,
   no `~`. Marks: dashed blue = proposed, solid green = kept, red ✕ = removed,
   pink + = added. Shape carries the meaning redundantly with colour. **A
   strip nobody touched on Your fixes has no human count**: `strip.reviewed`
   (any remove, add, split, zoom or pan) decides, `finishReview` puts untouched
   proposals back to `proposed`, Strip result shows the machine total in
   machine styling, and the record carries `checked: false`.
4. **Nothing learns at runtime**, and no copy implies learning, teaching or
   recounting.
5. **Nothing implies upload.** "Measuring on this phone", never "loading".
6. **Clump-inferred counts are visible as inferred.**
7. **Every tap target ≥44px**; primary 62px, secondary 52px.
8. **Band names and edges are configurable, never hard-coded** — `src/lib/bands.js`.

## The review gestures

`src/components/ZoomPanStage.vue`. A dense strip fits ~400 eggs about three
pixels apart on a 380px phone, so review needs zoom, and zoom needs a gesture
vocabulary that does not collide with culling.

**One finger acts on the strip** — tap removes, drag draws a split, hold adds.
**Two fingers move the strip** — pinch to zoom, drag to pan. This is the
drawing-app convention rather than the map convention, and it is the right way
round here: culling is the job, so the cheap unmodified gesture belongs to it.
Rejecting a proposal must stay the cheapest thing on the screen. On a desktop
there is no second finger, so the wheel zooms and Shift-drag pans.

`lib/marks.js` owns the 7–26px diameter clamp and hit-testing together, because
drawing and hit-testing have to agree about how big a mark is.

`MarkLayer` sizes its canvas to the STAGE and draws through the transform. Sizing
it to the image would mean a 9600px-wide backing store at 4× zoom.

**Zoom 1 is the whole strip** (contain), and **Your fixes opens at cover**
(`initial-fit="cover"`, Sep 2026 brief §3): fitted to the stage's larger
dimension so a wide strip fills the pane instead of a band one third of the
height, with the whole strip one pinch out. On a 2.18:1 strip in a 0.8:1 stage,
cover shows about a third of its width — so "have I checked all of it?" is
answered by zooming out, not by the opening view. Refine uses cover in the
phone frame (hi-fi) and contain on the laptop, where the whole strip fits at a
size every egg is visible.

**Rings thin as marks shrink** (`lib/marks.js` `ringWidth`): 2.5px from an
18px diameter down to 1.25px at the 7px floor, with 2px clearance each side of
the egg. At 2.5px on a 7px ring the hole was 2px and the egg under it invisible
at zoom 1 — a mark has to show what it marks.

## Copy

Banned words: model, algorithm, inference, confidence, machine learning, learn,
teach, train, upload, loading. The machine "finds" and "marks"; the person
"checks", "confirms", "removes", "adds". Mechanism copy stays physical ("light
and dark separated", never "thresholding").

**"AI" is not banned** (decided Aug 2026). Both source documents list it — the
handoff's copy rules and Design Brief v2 §8 — and that is why the hi-fi wordmark
reads only "Ovicounter". It was a mistake in those documents: every other word
on that list is mechanism vocabulary, and the product is called Ovicounter AI.
Use it as the name freely. The rest of the list still stands, so the tool still
never *describes itself* as doing anything with AI — not because the word is
forbidden but because "the AI found 12 eggs" would break the rules that actually
matter: the machine finds and marks, and nothing here learns.

All copy lives in `src/i18n/en.js`, marked `RATIFIED` (verbatim from the
handoff — do not reword) or `DRAFT` (written here, needs a decision). Draft
strings are listed in `docs/copy-to-ratify.md`. Don't invent copy silently.

Spanish (`src/i18n/es.js`) is translated but has not had field review; any
missing key falls back to English. `node tools/check-i18n.mjs` lists gaps.

## The CV pipeline

`src/cv/pipeline.js`. All four defects documented in the previous build's
README are fixed — see the header comment there for what each was.

**How an egg is separated from paper**, because it is the thing most easily got
wrong: an egg is darker than the paper around it AND darker by an amount that
matters. Ask only the first — a plain adaptive threshold — and blank paper
passes, because paper grain is always slightly darker than its neighbourhood
somewhere. The paper is therefore estimated by morphological closing with a
kernel wider than an egg, subtracted, and cut at an absolute contrast.
`lib/image.js` reached the same two-gate conclusion measuring the tapped egg.

**Parameters come from a measured egg** (`src/cv/params.js`,
`seedParamsFromEgg`). Measured across the bundled photos, an egg sits ~193 grey
levels below its paper on the demo strip and ~90 on Guatemala's embossed quilt
paper — no shipped default serves both, which is why calibration exists.

**The egg is measured by the probe first; the tap is the correction** (decided
Sep 2026, `docs/surpass-v1-brief.md` §1; this overrides the ratified one-tap
entry). `src/cv/probe.js` `probeForEgg` walks a grid over the working image
with the same `measureBlobAt` the tap uses, keeps the top quartile of hits by
contrast and takes their medians. It runs on Crop → "Use this photo" for a
session's first strip and the flow goes straight to Processing. Why: one tap is
a sample of one blob. Measured on the demo strip, taps a few millimetres apart
gave 434 and 1,192 marks where the truth is ~364; the probe gives 364 every
time, in ~15ms. "Mark one egg" is still a screen — reached from Refine ("Marks
look wrong? Mark an egg") and automatically when the probe finds fewer than 8
eggs. A tap more than 2× off the probe's median area is flagged as bigger or
smaller than most eggs before it is accepted. The harness imports the same
function, so its number is the app's number.

**The measurement sets size; the cutoff depends on who measured** (`stores/strip.js`
`adoptCalibration`). After a TAP the sweep in `cv/autotune.js` sets the cutoff
when it finds a clean grain/egg step — that pulled the spread across 60 taps to
317–1431, mostly 365–568 — and the tap's contrast is used otherwise. After the
PROBE its own contrast is used as it is: it is already a population median, and
the sweep's "first cutoff above the step" sits on the edge of the grain regime
(50 → 562 marks on the demo) where the probe's contrast lands on the plateau
(97 → 364; 60 → 376, 75 → 358). Measured Sep 2026; the first walk with the
sweep still applied to the probe came back at 562.

**A tap that lands on a CLUMP** inflates the measured area, the size filter
scales with it, and every single egg is then rejected as too small. Nothing in
the pipeline can see this — a clump is a well-formed dark blob. The probe
comparison catches it when there is a probe; the echo count surfaces it when
there is not, and "Pick another" is the remedy.

### The capture gate and the resolution floor

`src/cv/gate.js`. The floor was an open question in V2 §9 and is now measured:
rendering the demo strip at descending resolutions, recall against the same
detector at full resolution holds at 97% down to a **12px** egg and collapses
below it (63% at 10px, 20% at 6px).

**That 12px is not the refusal threshold, and reading it as one was a mistake
made here once already.** The reference is the detector's own output, not
ground truth, so it locates where the answer becomes unstable rather than what
fraction of real eggs survive — and a gate at 12px refuses Portugal, the site
independently measured at 0.97 recall. The gate refuses at **6px**, where the
shape information is genuinely absent. A false refusal blocks the operator
completely, and abandonment is the failure signal this product is designed
against; a merely mediocre photograph still produces marks to cull.

The blur threshold is **uncalibrated** — not one bundled photograph is out of
focus, so there is nothing to set it against. It sits below everything real and
needs a genuinely blurred field photo before it means anything.

### Storage

`src/lib/storage.js`, IndexedDB, no dependency. The photograph kept is the
WORKING image, because mark positions are normalised against exactly that frame.
Sessions are written at START, not at the end — a record only written on a clean
exit is the one that goes missing when the exit is not clean, which is what
makes resume possible. `session.storageReady` gates the "SAVED ON THIS PHONE ✓"
badge; private browsing and a full disk both leave it false, correctly.

Offline is a hand-written service worker generated by an inline plugin in
`vite.config.js` — no Workbox. It precaches the 412KB shell and caches
opencv.js (9.1MB) and the samples (6.8MB) on demand, because an install that
blocks on 16MB is an install that fails on a field connection.

### Performance rules

- **One fixed working resolution (~1200px long edge)** for both the slider
  preview and the final count. `minArea` is an absolute pixel value, so
  previewing at one resolution and locking at another makes the count jump the
  instant the operator stops tuning. **Crop first, then downscale once.**
- The paper estimate is cached and depends only on the photo and the kernel
  width, so dragging the cutoff slider re-runs from the threshold down.
- Debounce slider input ~60–80ms. Measured: 13–38ms per run at 1200px.

## Verifying

`dev-harness.html` + `tools/harness.js` run the real pipeline over the real
photographs. It is not part of the build.

```bash
npm run dev -- --port 5199
node tools/run-harness.mjs                     # every bundled photograph
node tools/run-harness.mjs --only=test-strip --sweep=1
node tools/run-harness.mjs --shot=tools/shots/cv.png
```

`tools/walk-flow.mjs` clicks the demo path end to end — Welcome → Crop → Mark
one egg → Processing → Refine — screenshotting each screen and reporting any
console error. Run it after touching any screen; it catches the failures that
only happen in sequence, which is how the reactive-Proxy-to-worker
`DataCloneError` and the collapsed slider track were both found.

```bash
node tools/walk-flow.mjs                       # walk + screenshots
node tools/walk-flow.mjs --good=99999          # report every calibration tap
```

Do **not** drive headless Chrome with `--virtual-time-budget` for this.
Virtual time advances as fast as the page allows and the DOM is dumped when the
budget is spent, which for CPU-bound work can be a fraction of a second of real
time — every run comes back truncated and looks like a hang.
`tools/run-harness.mjs` drives Chrome over the DevTools Protocol and waits for
the page to actually finish. For static screen captures `--screenshot` is fine;
use a ~940×900 window, because headless Chrome clamps to a minimum window width
and a 380px window silently renders a wider layout viewport that looks like an
overflow bug that isn't there.

## Working style

- Small commits per build step; each one working.
- After building a screen, capture it at 380px and check it against the hi-fi.
- When the design conflicts with CV reality, say so and propose the smallest
  honest change — don't fake it silently.
- Measure before tuning. Two rounds were lost here guessing at a cutoff that a
  ten-second parameter sweep answered directly, and one more was lost taking a
  median over grid probes that the previous build's README had already warned
  was misleading.
