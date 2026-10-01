# OvicounterAI — project instructions

Assisted mosquito-egg counting for ovitrap surveillance. A technician
photographs a strip; the app deliberately candidate eggs; the
technician manually refines them; the record is the photo, the settings, and the
human-verified egg positions.

## Read these first, in order

1. `design_handoff_session_flow/README.md` — the handoff. Screen-by-screen
   layouts, the mark language, and the ratified copy.
2. `design_handoff_session_flow/Ovicounter Hi-Fi.dc.html` — the 8 screens at
   380×788. The reference for **structure, flow and ratified copy**. Open it in
   a browser.
3. `docs/field-manual-brief.md` and `src/styles/tokens.css` — the reference
   for **colour, type, radius and rules** (Field Manual, Sep 30, 2026: pure
   black and white, square corners, heavy rules, safety-yellow primary action,
   condensed caps display face). `tokens.css` is the design contract — every
   colour, radius, rule, spacing value and hit size. Do not introduce values
   that are not in it. The type roles in `src/styles/base.css` sit on top; a
   screen uses the roles and the shared parts, never its own font sizes.
4. The Notion page "Ovicounter AI" → **V2** (project definition) and **Design
   Brief v2** (flow). V2 is the source of truth for *why*; the handoff is the
   source of truth for *structure and flow*; the Field Manual brief for *look*.

## Nomenclature

Screens are named, not coded. Use these names in code, in commits, and in
conversation — they are the handoff's `data-screen-label` values:

**Welcome · Capture · Refusal · Crop · Mark one egg · Processing · Your fixes ·
Strip result · Session summary** (Refine was a screen until Oct 2026; its
sliders are now part of Processing, and Your fixes is titled "Manually refine") — and **Guide** ("How it works",
Sep 30, 2026: not in the handoff; reached from Welcome and the menu, one
section per step under the step list's names) and **About** (Oct 2026, from the
menu: what it does, why it over-marks, what is kept, on this phone, licence).

Two paths through them (Sep 2026, `docs/surpass-v1-brief.md` §4). A **session**:
Capture → Crop → Processing → Your fixes → Strip result → Next strip …
→ Session summary, calibration carried strip to strip, every strip saved. A
**quick count** ("Count one strip", and the demo): Capture → Crop → Processing
→ Your fixes → Strip result, three decisions from Welcome, no session, nothing
saved unless "Start a session with these settings" is pressed — which makes
that strip 1 of a real session. The demo is a quick count on one of three
photographs (`lib/samples.js` DEMOS): the clean bundled strip, a stained field
strip on a table, or a test pattern drawn on the phone with a known number of
ovoids (`lib/test-pattern.js`), which Strip result states beside the count, and whose result ends at Home — nothing else.
**Welcome has one way in** (Oct 2026): "Count a single paper strip" opens onto
where the photo comes from — Use the camera, Choose a photo (the phone's picker,
straight from Welcome), or the three demos. The demo reaches a number in
**five** decisions — count a strip, which demo, Use this photo, Continue past
Measure, Done — and the walker checks five. A session is the quiet link
under it. **The camera is asked for only after someone chooses it**: Capture
opens on the camera/photo choice unless it came from "Use the camera" or the
session's last photo did (`session.source`). Every photo, camera or chosen,
goes through the same gate (`lib/intake.js` `takeIn`). `session.isQuick` is the switch; Refine is one
link away on Your fixes.

## Stack — decided, don't relitigate

- **Vue 3 + Vite + Pinia**, Composition API, `<script setup>`. Hash routing, so
  the build is a plain static site that also runs from a service-worker cache.
- **No component library.** The design has a handful of primitives; they are
  SFCs styled with the custom properties in `tokens.css`. The look is the
  Field Manual brief — do not "improve" it, do not add shadows for depth, and
  corners are square (`--r-*` are 0; `--r-device` is for the `?frame=1` phone
  frame only).
- **The logo** (Oct 2026) is a dashed ring of ten segments round an egg — the
  app's own "found" mark. `components/AppLogo.vue` draws it (ring in `--brand`,
  #0064fc, which is the logo's alone; egg in the text colour) and leads the
  wordmark; `public/favicon.svg` (egg follows the tab's light/dark scheme),
  `icon.png`, `icon-192.png` and `apple-touch-icon.png` are made from the
  original artwork and precached.
- **Fonts** self-hosted in `public/fonts/` (Barlow Condensed 600/700/800,
  Barlow 400/500/600, JetBrains Mono 500/700) and precached with the shell.
  Never fetched from Google at runtime. Archivo and IBM Plex Mono are gone.
- **OpenCV.js 4.13** in `public/opencv.js`, 8.9MB, bundled not CDN.
- **All CV runs in a Web Worker.** The main thread never sees `cv` and never
  holds a Mat. Live sliders and pinch-zoom cannot share a thread on a
  mid-range Android.
- **Viewport:** design and check at 380px inside the phone frame; full-bleed
  below 430px. **At 900px and up the frame is dropped and stage screens go
  two-pane** (decided Sep 2026, `docs/surpass-v1-brief.md` §3 — a deliberate
  deviation from "design at 380px inside the frame"; the audience for now is
  partners and funders on laptops): title, controls, legend and actions in a
  LEFT column never narrower than 380px, the photograph on the right at full
  height (`minmax(var(--device-w), var(--pane-share)) 1fr` — flipped Sep 30,
  2026, Field Manual brief §5). Same components, tokens
  and copy; each screen carries its own `.wide` rules and App.vue provides
  `wideLayout`. The app is a bordered panel on the desk with a gutter
  (`--laptop-gutter`, max `--laptop-max-w`), not edge to edge (Sep 30, 2026). `?frame=1` in the page URL keeps the frame at any width for
  checking against the hi-fi. All three modes are the same code.

Ask before adding any dependency beyond vue, vue-router, pinia, vite and
@vitejs/plugin-vue.

## Non-negotiables

1. **No machine total anywhere the sliders are** — Processing, since Refine's
   sliders moved into it (Oct 2026). A visible total lets the operator tune
   until the number matches what they expected. A tally of *human*
   judgments during review is explicitly fine.
2. **No fake CV.** Processing shows real pipeline buffers, never a CSS filter
   standing in for one. If a buffer isn't ready, show the previous one.
3. **A machine guess and a human judgment never look like the same kind of
   thing.** Machine count grey with a leading `~`; human count black, larger,
   no `~`. Marks: dashed blue = proposed, solid green = kept, red ✕ = removed,
   pink + = added. Shape carries the meaning redundantly with colour. **A
   strip nobody touched on Your fixes has no human count**: `strip.reviewed`
   (any remove, add, clump change, zoom or pan) decides, `finishReview` puts untouched
   proposals back to `proposed`, Strip result shows the machine total in
   machine styling, and the record carries `checked: false`. **And a mark is
   not "kept" until someone looked at it** (Sep 30, 2026): machine marks stay
   dashed blue on Your fixes until the part of the strip they sit in (one of 8)
   has been wholly on screen at zoom ≥ 2 (`strip.looked`, `applyLooked`). Done
   counts every mark not removed; marks in parts never looked at stay
   `proposed` in the record, which carries `looked`. (Strip result said how
   many parts that was until Oct 2026; Gabriel took the line out — the record
   still carries it.)
5. **Nothing implies upload.** "Measuring on this phone", never "loading".
   **Share** on Strip result (Oct 2026, `lib/share.js`) is the one way
   anything leaves the phone, and only to where the person picks in their own
   share sheet: ONE story-shaped card, 1080×1920 — the name and date, the
   photograph as taken, the strip with its marks (drawn by `lib/marks.js`
   `drawMark`, as on screen), and the count on yellow with the sentence, band
   and judgments — previewed beside the Share button before anything is sent,
   plus the sentence as text. Where files cannot be shared (most laptops) it
   saves the card and copies the text, and says so.
6. **Clump-inferred counts are visible as inferred.**
7. **Every tap target ≥44px**; primary 62px, secondary 52px.
8. **Band names and edges are configurable, never hard-coded** — `src/lib/bands.js`.

## Steps and going back

`src/lib/steps.js`, `lib/use-steps.js` (Sep 30, 2026 — a deliberate addition to
the handoff's structure, which showed the flow as separate screens with no
sense of where you are). A strip's steps are always the Guide's five, with
the Guide's numbers: **1 Photograph · 2 Crop · 3 Measure · 4 Manually refine ·
5 Count** (Oct 2026 — Refine's sliders moved into Measure, which ends on its
pictures and the two sliders; step 4 is the hand pass). A path that does not
need one keeps it in place, marked *skipped* (the demo's Photograph). Mark one egg belongs to Measure, Refusal to
Photograph. On the laptop each stage screen's left column is the list
(`StepList` before and after the screen's own header and actions; every step
keeps its own row, and a screen taller than the window scrolls); on the phone a 44px `StepStrip` of six numbered
squares under the app bar opens it as a sheet. **Moving between steps moves**
(App.vue): on the phone the next step slides in from the right (back: from the
left); on the laptop each step-tagged row and header (`[data-step]`) slides
from where its counterpart was to its new place — the finished step rises into
the folded row, the next step's row rises into the open header — while the
open step's contents unfold and the photo fades in (`slideRows` in App.vue).
Every step title carries its number in a yellow square (`StepNumber`); steps
not open sit greyed on `--panel`. **Measure stops on its last picture** (Oct
2026): the run plays its four pictures and waits on the marks, with the
pictures as buttons, the photograph as a fifth to compare, press-and-hold on
the stage to see the photograph under any picture, and a yellow "Continue to …"
bar. **Measure reopens** from the list once there are marks, as Processing's
look mode (`?look=1`): `strip.inspect()` runs the
pipeline again for its pictures only — marks, fixes and undo untouched — and
the person steps through the four. Nothing moves under
`prefers-reduced-motion`. ZoomPanStage measures its layout position
(`offsetLeft/Top`), not its transformed one, so a slide never reads as the stage
having moved.

**Going back only looks.** Later work stays until an earlier step is actually
changed. Anything that finds the marks again — a changed crop, a Refine slider,
Mark one egg, a new photo — asks first when the person has judgments to lose
(`confirmRedo`), and `strip.scan()` then clears the undo history, `reviewed`
and coverage, which described marks that no longer exist. Crop keeps the
applied box on return (`strip.applied`) and puts it back if left unconfirmed.
**Going back from Count is allowed**: every earlier step reopens, and
returning to Count records the same strip again in place
(`session.completeStrip(…, at)`, `strip.recordedIndex`) — never a second one.
The yellow bar always says where it goes in the steps' own direction:
"Continue to …" for a step further on. One confirmation sheet serves the whole app (`lib/confirm.js`).

## The review gestures

`src/components/ZoomPanStage.vue`. A dense strip fits ~400 eggs about three
pixels apart on a 380px phone, so review needs zoom, and zoom needs a gesture
vocabulary that does not collide with culling.

**One finger acts with the chosen tool; two fingers move the strip** (Oct
2026, Gabriel — replaced tap-removes / hold-adds / drag-splits, which people
could not keep apart). `ToolPicker` above the strip: **Remove** (default —
culling is the job, so it stays the cheapest thing on the screen), **Keep**,
**Add** (Split was a fourth until Oct 2026). Remove and Keep *paint*: a brush of fixed on-screen size
(`BRUSH_R` 22px, a fingertip), so it covers less of the strip the further you
zoom in; one stroke is one undo step (`strip.beginStroke` / `paint` /
`endStroke`, a `batch` in the history). Add is "one more egg here", with the
close-up shown from the first touch: on empty paper it places an egg; on a
mark the app found, that mark becomes a clump of two (`strip.makeClump`); on a
clump, the clump's number goes up by one (`setClumpCount`). It replaced Split
(Gabriel, Oct 2026: drawing across pixels was the complicated way to say
"there is one more egg here"), and the pixel-cutting `splitAlong` is gone from
the pipeline, worker and store. Remove on a clump's dot takes one egg off. Pinch
zooms, two-finger drag pans; on a desktop the wheel zooms and Shift-drag or a
middle-click drag pans (Measure too).
The minimap (`Overview`, `@move`) is touchable — touch or drag it to move the
view there.

**Clumps get their own pass** (Oct 2026): "Check the clumps · n of N" on
Manually refine steps through them one at a time, zoomed in (`focusOn`), with
the app's number, what the clump's size suggests, and − / + for the person's.
Changing it replaces that clump's marks with that many, placed by
`cv/place.js` and kept (`strip.setClumpCount`); Next accepts what is shown
(`confirmClump`). One step of undo each. One finger pans while the pass is
open. Most doubtful first — the biggest gap between the watershed's count and
the clump's size, ties to the bigger clump — and a clump whose two counts
differ by 2 or more is tagged with the range, "~3–5", not one number. The record carries each clump's two counts and the person's.

**A fix changes the marks it touches and nothing else** (Gabriel, Oct 2026).
Nothing on Your fixes finds the marks again or adjusts how they are found — an
earlier "Find the marks again from my eggs" did, and it was taken out because
the screen then behaved unpredictably. After 5 fixes (removed + added + clump changes,
`NUDGE_AT`) a yellow panel in the body suggests adjusting Measure instead of
fixing one by one; it links to Measure's look mode, where a slider asks before
throwing fixes away, and "Keep fixing" dismisses it.

`lib/marks.js` owns the 7–26px diameter clamp and hit-testing together, because
drawing and hit-testing have to agree about how big a mark is.

`MarkLayer` sizes its canvas to the STAGE and draws through the transform. Sizing
it to the image would mean a 9600px-wide backing store at 4× zoom.

**Zoom 1 is the whole strip** (contain), and **every screen that shows the
marks opens on all of it** — Processing, Refine, Your fixes, Strip result, at
every width (Gabriel, Sep 30, 2026). Your fixes opened at cover for eleven days
(brief §3) and Refine did in the phone frame (the hi-fi): on a 2.18:1 strip in a
0.8:1 stage cover shows about a third of the width, and the operator could not
tell what was left unseen. On a phone the whole strip is a band and the eggs are
small; that is what zoom is for. Measure zooms too (Oct 2026): the same stage with a `pan` tool — one finger
moves the picture, the view holds from picture to picture, and press-and-hold
still shows the photograph unless the finger moves. Mark one egg keeps cover — it is a single tap
on a single egg, with no zoom.

**Rings thin as marks shrink** (`lib/marks.js` `ringWidth`): 2.5px from an
18px diameter down to 1.25px at the 7px floor, with 2px clearance each side of
the egg. At 2.5px on a 7px ring the hole was 2px and the egg under it invisible
at zoom 1 — a mark has to show what it marks.

## Copy

Banned words: model, algorithm, inference, confidence, machine learning, learn,
teach, train, upload, loading. The machine "finds" and "marks"; the person
"checks", "confirms", "removes", "adds". Mechanism copy stays physical ("light
and dark separated") — **except on Measure, where the pictures and sliders
carry their OpenCV names** (Gabriel, Oct 2026: Black-hat, Threshold,
Components, Watershed; the sliders Threshold and Minimum area), each with a
plain line beside it: the badge on the stage, the note under the slider. The
names are what the operations are, so they say nothing untrue; the plain
words stay for the person in the field.

**"AI" is not banned** (decided Aug 2026). Both source documents list it — the
handoff's copy rules and Design Brief v2 §8 — and that is why the hi-fi wordmark
reads only "Ovicounter". It was a mistake in those documents: every other word
on that list is mechanism vocabulary, and the product is called OvicounterAI
(one word since Oct 2026, Gabriel — in copy, titles, the share card and the
wordmark, which sets AI tight against OVICOUNTER).
Use it as the name freely. The rest of the list still stands, so the tool still
never *describes itself* as doing anything with AI — not because the word is
forbidden but because "the AI found 12 eggs" would break the rules that actually
matter: the machine finds and marks, and nothing here learns.

All copy lives in `src/i18n/en.js`, marked `RATIFIED` (verbatim from the
handoff — do not reword) or `DRAFT` (written here, needs a decision). Draft
strings are listed in `docs/copy-to-ratify.md`. Don't invent copy silently.

Spanish (`src/i18n/es.js`) and European Portuguese (`src/i18n/pt.js`, Sep
2026, for Portugal — a pt-BR phone gets it too) are translated but have not had
field review; each file's header lists what needs it. Any missing key falls back
to English. `node tools/check-i18n.mjs` lists gaps.

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

**Clumps are shown as clumps** (Oct 2026). A dark island larger than
`splitFactor` × an egg is a clump; the watershed splits it, and
`describeClumps` keeps a record of each one: an ellipse to draw, its area, and
two counts — the watershed's and its area divided by the median single egg AT
THIS CUTOFF (`singleMedianArea`; the calibration's area can sit well off it —
Portugal 14 vs 8). Clumps the watershed cannot cut get their area's count,
placed by k-means over their pixels (`cv/place.js`); before this they were
counted in `inferred` and never reached the screen. On screen a clump is one
outline with its count — dashed blue "~n" while it is the app's, solid green
"n" once the person has answered it — and its eggs are dots, not rings
(`lib/marks.js` `drawClump`, `drawMark`). Measured Oct 2026: the two counts
disagree on almost every clump and the watershed is lower on 345 of 351 on
Portugal-2 (1,211 vs 3,336 by area on Portugal-1); on the demo strip, whose
truth is ~364, the watershed total is 368 and area's 409. Neither is truth on
a dense mat, which is why the person gives the number.

**A clump the watershed leaves in one piece is counted by length** (Oct
2026). It is a clump because it is bigger than one egg, so "~1" contradicts
itself — and it was about half of all clumps (24 of 44 on the demo, 143 of
351 on Portugal-2), nearly always eggs lying end to end, whose distance
transform is one ridge with one peak (Gabriel saw they were mostly two).
Such a clump gets round(long-axis length / a single egg's length), at least 2
and at most its area's count, placed by `cv/place.js`; `found` is what the
app put in each clump. The demo total went 368 → 392; Portugal-1 1,211 →
1,263 (length is cautious where area says 3,336). The demo's long-quoted
"364" was never a hand count (surpass-v1-brief: "No figure above is scored
against a hand count").

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

**Files** (Oct 2026, `lib/export.js`, spec in `docs/file-formats.md`): one
versioned envelope (`format: 'ovicounterai/strip' | 'session' | 'settings'`,
`version: 1`) for a strip's record (Strip result), a session's (Session
summary, plus a CSV with one row per strip), and the settings — measured egg,
slider params and band scale — saved and opened from the menu. Opened settings
are kept in localStorage (`ovicounterai.settings`, a convenience: the file is
the record) and every new session and quick count starts from them until
"Stop using them"; never the demos. Bump `FORMAT_VERSION` for any change a
reader would trip on, and say what changed in the spec. The walker checks each
file and that opened settings drive a real session's cutoff.

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
