# Ovicounter AI

Assisted mosquito-egg counting for ovitrap surveillance.

A technician photographs a strip of ovitrap paper. The app deliberately
**over-proposes** candidate eggs as an overlay, and the technician **culls**
them — removing debris, adding missed eggs. What is left behind is the record:
the photograph, the settings used, and the human-verified egg positions. The
count is a projection of that record.

**The operator is the authority; the machine proposes.** Every design decision
follows from that. A machine guess and a human judgment are never allowed to
look like the same kind of thing.

Everything runs on the device. There is no server, no backend, and nothing is
uploaded — which is why the interface says "measuring on this phone" and never
"loading".

---

## Quick start

Requires **Node 20 or newer** (developed on 25.6, npm 11.9).

```bash
npm install
npm run dev
```

Then open **http://localhost:5199/**.

The port is fixed in `vite.config.js` rather than left to Vite's default,
because the two tools below drive this server over the DevTools Protocol and
have to know where it is. `strictPort` is on, so a port clash fails loudly
instead of quietly moving the app somewhere the tools will not find it.

Vite also prints a **Network** URL. Open that on a phone on the same wifi —
`server.host` is enabled for exactly this. Sunlight legibility and gloved tap
accuracy are the two things a desktop browser cannot tell you.

```bash
npm run build     # production build → dist/
npm run preview   # serve dist/ at http://localhost:4173/
```

The build is a plain static site, so deploying it later is a non-event.

### What is actually in the 16MB build

| | |
| --- | --- |
| `opencv.js` | 9.1MB — the single largest thing in the app, cached once |
| `samples/` | 6.8MB — the demo strip and the field photographs |
| app JS + CSS | 204KB (≈40KB gzipped) |
| `fonts/` | 144KB — Archivo + IBM Plex Mono, self-hosted |

Nothing is fetched from a CDN at runtime, fonts included. The app has to work
with no network at all.

---

## Trying it

Click **"Try it with a demo photo"** on the Welcome screen. That runs a quick
count on `public/samples/test-strip.png`, a bundled strip carrying several
hundred eggs, and saves nothing. Three decisions from Welcome to a number: the
demo button, "Use this photo", "Done — count them".

The demo skips the camera — there is no photograph to take, the strip is
already in the build — and opens on Crop with it in hand. Confirming the crop
calibrates the strip automatically: a probe measures a representative egg
across the whole photograph (`src/cv/probe.js`) and the marks appear. On the
demo strip that lands on ~364 every time.

**"Mark one egg" is the correction, not the entry.** From Refine, "Marks look
wrong? Mark an egg" opens it; tap directly on an egg. The screen refuses a tap
that lands on bare paper and says so, and it tells you when the egg you tapped
is more than twice as big or small as the ones it measured itself — that
usually means a clump. The echo chip, "Found N more the same size", is a real
scan with the parameters your tap implies.

**Two paths.** "Count one strip" is the short one above: photo → crop → marks →
fix if wanted → number, no session, nothing saved unless you press "Start a
session with these settings" on the result. "Start a new session" is the loop:
calibration measured once and carried strip to strip, every strip saved, a
summary at the end.

On a laptop (900px and wider) the phone frame goes away and the strip screens
split into two panes, photograph left. Add `?frame=1` to the URL to keep the
380px frame for checking a screen against the hi-fi.

### Reviewing the marks

On **Your fixes**, the gestures split by how many fingers are on the glass:

| | |
| --- | --- |
| **one finger** | acts on the strip — tap a mark to remove it, tap again to put it back, press and hold empty paper to add an egg, drag across a clump to split it |
| **two fingers** | move the strip — pinch to zoom, drag to pan |

Culling gets the cheap unmodified gesture because culling is the job. On a
laptop, use the **wheel** to zoom and **Shift-drag** to pan.

Your fixes opens zoomed so the strip fills the pane. Zoom out fully and you
see the whole strip; that is what "zoom 1" means whatever shape the photograph
is.

### What works today

All ten screens, and the whole session loop:

Welcome → Capture → *(gate: pass, or Refusal → Capture)* → Crop →
*(Mark one egg, only if the probe finds no egg)* → Processing → Refine →
Your fixes → Strip result → *next strip* → Session summary. A quick count goes
Crop → Processing → Your fixes → Strip result.

Real computer vision throughout. The split cuts the actual binary mask along the
drawn stroke and recounts that neighbourhood rather than estimating; the gate
measures the frame rather than guessing at it; and the second strip skips Mark
one egg, because calibration is established once per session and carried
forward. That is the loop getting lighter, which is the product. A strip
nobody touched on Your fixes is never reported as "checked by you": the result
shows the machine total in machine styling and the record says `checked: false`.

Records are kept on the device in IndexedDB — the working photograph, the
settings used, and every mark — and an interrupted session is offered back on
Welcome as a resume card. A demo session writes nothing, as Welcome promises.

The app is offline from the second visit: a generated service worker precaches
the 412KB shell and caches the 9.1MB runtime and the sample photographs the
first time they are fetched.

Spanish is complete and follows the device language. Three things in it want a
Spanish-speaking technician's eye before it goes to the field — see the header
of `src/i18n/es.js`, and `node tools/check-i18n.mjs` to verify parity.

---

## Verifying changes

Two tools, both driving a real headless browser. Start `npm run dev` first —
both talk to it on port 5199.

### The flow walker

```bash
node tools/walk-flow.mjs
```

Walks the demo (a quick count), a two-strip session fed through the gallery
picker, the Mark-one-egg correction path, an untouched pass and the camera
refusal, screenshots every screen into `tools/shots/`, and reports any console
error or uncaught exception. `--width=1440 --height=900` walks the laptop
layout and measures the photograph's share of the viewport; `--width=390
--height=844` is a phone. Exit code 1 if any check fails. **Run this after touching
any screen.** It catches the failures that only happen in sequence and that
looking at one screen at a time will not: it is how a reactive-Proxy-to-worker
`DataCloneError` and a slider whose track had collapsed to zero height were both
found.

```bash
node tools/walk-flow.mjs --good=99999   # report every calibration tap it tries
```

### The CV harness

```bash
node tools/run-harness.mjs                              # every bundled photograph
node tools/run-harness.mjs --only=test-strip --sweep=1  # sweep the cutoff
node tools/run-harness.mjs --floor=1                    # sweep the resolution floor
node tools/run-harness.mjs --gate=1                     # what the gate sees, per photo
node tools/run-harness.mjs --shot=tools/shots/cv.png    # capture the result
```

### Translations

```bash
node tools/check-i18n.mjs
```

Catches the two failures nothing else does: a missing key degrades silently to
English, so a half-translated screen looks fine to anyone reading it in English;
and a placeholder lost in translation drops the count out of the sentence
without throwing.

Runs the real pipeline over the real photographs and reports what it found, how
long it took, and whether it survives a slider's worth of repeated runs without
leaking the WASM heap. `dev-harness.html` is the page it drives; neither is part
of the build.

> **Do not reach for `--virtual-time-budget`** to drive headless Chrome here.
> It advances *virtual* time as fast as the page allows and dumps the DOM when
> that budget is spent, which for CPU-bound work can be a fraction of a second
> of real time. Every run comes back truncated and looks exactly like a hang.
> Both tools use the DevTools Protocol and wait for the page to actually
> finish. For static screen captures `--screenshot` is fine — use a ~940×900
> window, because headless Chrome clamps to a minimum window width and a 380px
> window silently renders a wider layout viewport that looks like a horizontal
> overflow bug that isn't there.

### Checking a screen against the design

The handoff is the source of truth for what a screen looks like. Open
`design_handoff_session_flow/Ovicounter Hi-Fi.dc.html` in a browser — the eight
screens are laid out left to right in flow order at exactly 380×788 — and
compare it against the matching shot in `tools/shots/`.

On a desktop the app draws itself inside a phone frame at that exact viewport.
Below 430px wide the frame disappears and the screens go full-bleed. Both are
the same code; the frame is only chrome.

---

## Layout

```text
src/
  views/        one file per named screen
  components/   AppButton · BandBadge · ImageStage · MarkLayer
  stores/       session (the sitting) · strip (the strip in hand)
  cv/           pipeline · worker · client · params · autotune
  lib/          image (crop, rotate, measure) · bands · samples
  i18n/         en.js (all copy) · es.js (empty, falls back to English)
  styles/       tokens.css — the design contract
public/
  opencv.js     OpenCV 4.13, bundled not CDN
  fonts/        Archivo + IBM Plex Mono, self-hosted
  samples/      the demo strip and the field photographs
tools/          walk-flow · run-harness · harness  (dev only, not in the build)
docs/           copy-to-ratify.md — strings still needing a decision
design_handoff_session_flow/
                the design bundle: hi-fi screens, wireframes, tokens, photos
```

`CLAUDE.md` carries the build spec — the decided stack, the non-negotiables,
the copy rules, and what is known about the CV pipeline and its open problems.
Read it before changing anything in `src/cv/`.

---

## The test photographs

`public/samples/` ships with the build and is deliberately short.

| File | What it tests |
| --- | --- |
| `test-strip.png` | **The demo.** Several hundred eggs, evenly lit, already cropped. The only bundled photo whose eggs are comfortably above the resolution floor as-is. |
| `guatemala.jpg` | Best case for resolution — but faint eggs on embossed quilt paper, whose pattern is a false-positive source. |
| `jamaica.jpg` | Mid-difficulty. Small round eggs on pale paper. |
| `portugal-1…5.jpg` | The strips the pipeline was measured at 0.97 egg recall on. Heavily stained. |
| `whole-strip-on-table.jpg` | Background included — exercises the crop. |
| `el-salvador-refusal.jpg` | **Must be refused.** Eggs are 1–3px specks, below the resolution floor. When this returns nothing, that is correct behaviour, not a bug. |

A 52MB debugging corpus of 24 photographs across six sites lives in
the project's Dropbox folder (`Ovicounter-AI/Test Images/`, outside this repo) and is deliberately not bundled —
shipping it would triple the download for no field benefit.

### The resolution floor is real

Measured in `docs/gate-study-RESULTS.md`, and it constrains what the app can
honestly claim: Portugal works at a **15px** egg bounding box; El Salvador fails
at **4px**, where the default minimum area is larger than an entire egg and the
detector cannot propose one at all. No amount of slider tuning fixes that — the
shape information is not in the pixels. The exact threshold between those two
points has never been swept.

The harness runs on **uncropped** photographs, so every field sample there reads
below the floor. That is the pre-crop case, not the app's: Crop runs first, the
strip then fills the working image, and the eggs are correspondingly larger.

---

## License

Apache 2.0 — see `LICENSE`. (The v1 classical app on the `main` branch remains GPL.)
