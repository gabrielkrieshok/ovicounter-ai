# Build brief: make V2 clearly better than V1

Written Sep 19, 2026 from a side-by-side run of `main` (V1) and `v2` in a
headless browser at 1440px and 390px. Decisions below are Gabriel's, made the
same day. Work the items in order; each is one or two sessions.

## What the comparison found

| | V1 (`main`) | V2 (`v2`) |
| --- | --- | --- |
| Demo strip (`test-strip.png`), no tuning | **363** | harness auto-seed **364**; app with one tap **434** and **1,192** on two runs |
| Portugal-1, no tuning | 2,605 or 175 depending on preset | background-subtracted pipeline; harness 1,211 (below floor uncropped) |
| Laptop | image, sliders and count on one screen | 380px phone frame; rings hide the eggs at zoom 1 |
| Phone | wordmark wraps, toolbar clips | designed for it; works |
| Steps to a number | 2 | 6 screens |
| Editing marks, saving, offline, sessions | none | all present |

No figure above is scored against a hand count. 363 and 364 agreeing is two
pipelines agreeing, nothing more.

**Conclusion:** V2's pipeline and feature set already beat V1. It loses at the
front door: the one-tap calibration adds error V1 does not have, the laptop
view is a phone in a void, and the path to a first number is long.

## 1. Calibrate automatically; the tap becomes the correction

`tools/harness.js` `probeForEgg()` already does this: probe a grid with
`measureBlobAt`, keep the top quartile by contrast, take medians, feed
`seedParamsFromEgg`. It lands on 364 on the demo strip with no tap.

- Move `probeForEgg` into `src/cv/` so the app and the harness share one
  function.
- After Crop on a session's first strip, run it, then `adoptCalibration` and the
  autotune sweep exactly as the tap path does now. Go straight to Processing.
- "Mark one egg" stays as a screen, reached from Refine ("Marks look wrong?
  Mark an egg") and used automatically when the probe returns null (< 8 hits).
- When a tap IS used, compare it with the probe: if the tapped area is more than
  about 2x off the probe's median, say so before accepting ("That looks bigger /
  smaller than most eggs here. Pick another?"). Copy goes to
  `docs/copy-to-ratify.md`.
- This overrides the ratified one-tap entry. Update the "CV pipeline" section of
  `CLAUDE.md` to say so, and why (434 vs 1,192 on the same strip).

Done when: `walk-flow` reaches Refine on the demo with zero taps at both 1440px
and 390px, and the machine count is between 330 and 400 both times.

## 2. Stop claiming a check that did not happen

`stores/strip.js` `acceptRemainingMarks()` turns every untouched proposal into
`kept`, and Strip result then reads "{n} eggs, checked by you". Tapping straight
through produces "1,193 eggs, checked by you" with 0 removed and 0 added. That
breaks non-negotiable 3.

- Track whether the operator did anything on Your fixes (any remove, add, split,
  or zoom/pan).
- If nothing: the result keeps the machine styling (grey, leading `~`) and the
  sentence says the marks were not checked. Draft copy to ratify: "~{n} found by
  the app. You made no changes."
- If something: current behaviour.
- The record stores which it was. This is the provenance the flywheel needs.

Done when: tapping through the demo untouched never shows a black human count.

## 3. A real laptop layout

Audience for the next two months is partners and funders on laptops.

- Above roughly 900px wide, drop the phone frame. Two panes: the stage takes the
  left ~65% at full height; title, controls, legend and actions sit in a right
  column. Same components, same tokens, same copy. Below that width nothing
  changes.
- Marks must not hide what they mark at zoom 1: thinner rings and a centre gap,
  or dots until zoomed in. Keep the mark language (dashed blue, solid green,
  red ✕, pink +).
- Your fixes opens fitted to the stage's larger dimension so a wide strip fills
  the pane instead of a band one third of the height.
- This deviates from "design at 380px inside the frame". Note it in `CLAUDE.md`
  as deliberate. The frame can stay behind a `?frame=1` query for checking
  screens against the hi-fi.
- Small bug seen at 1440px: on Welcome the menu button is clipped at the right
  edge of the header.

Done when: at 1440x900 the photograph occupies at least 60% of the viewport
width on Refine and Your fixes, and individual eggs are visible under their
marks without zooming.

## 4. Quick count

V1's appeal is photo to number in two steps. Add a short path beside sessions.

- Welcome gets a third door, "Count one strip". The demo button uses it.
- Path: pick or take photo, Crop, marks appear (items 1 makes this possible),
  fix if wanted, result. No session, nothing saved unless the person asks.
- Processing auto-advances; it does not need a decision.
- Result offers "Count another" and "Start a session with these settings".

Done when: from Welcome, the demo reaches a result in three decisions or fewer.

## Later, after the demo is out

- Scoreboard: hand-marked photos (easy and hard sites), one script that scores
  V1's presets and V2 on count error and marks-to-fix. Until this exists, do not
  claim accuracy anywhere.
- Running tally and a stopping point on Your fixes (Design Brief v2 §3, §6.3).
- Blur threshold calibration (needs a genuinely blurred field photo).
- Portuguese.

## Leave alone

Tokens, fonts, copy rules, the worker boundary, the no-machine-total rule on
Refine, storage, the service worker.
