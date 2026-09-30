# Build brief: Field Manual — the finishing pass

Written Sep 30, 2026 from a design review of `v2` at 390×844 and 1440×900
(`tools/walk-flow.mjs`, all checks passing). Decisions are Gabriel's, made the
same day. Work the items in order, one or two commits each, each one working.

## Status

| Item | Done-when | Measured |
| --- | --- | --- |
| 1 | no Archivo/Plex in `src` `public`; fonts precached and render offline; contrast passes; walk passes at 390 and 1440 | grep empty; all 8 faces in `sw.js` PRECACHE and `document.fonts.load` ok for each with the network off (production build, SW-controlled); `check-contrast` passes; walk ✓ at 390×844 and 1440×900 (photo 61%) |
| 2 | no screen sets its own font, colour or border outside the parts and roles | Parts built: AppButton (primary/secondary/quiet), AppBar (counter), StripHeader, MarkKey, JudgmentTally, BandScale and StatusBadge (restyled; BandBadge folded in). Adopted where an equivalent existed: every button, Your fixes, Strip result, Refine, Welcome. Overview and ZoomRail are built in item 3 with the stage they drive. **Grep not yet clean — 44 `font:` rules and 4 colour literals remain, all in screens item 4 restyles; closed there.** Walk ✓ at 390 and 1440. |

Decisions made along the way, flagged for review:

- **Mark hues as text only at tally size.** Pink (4.49:1) and green (4.16:1)
  miss 4.5:1 on white and cannot change. `check-contrast` holds them to the
  large-text 3:1, and every small label next to a coloured glyph is ink.
- **MarkLayer's + / ✕ are Barlow 600, not 700** — no Barlow 700 file is
  shipped, and a canvas would fake one. Ink centre is within 0.8px of the mark
  centre at every size (13–31px). ✕ is outside the Latin subset and comes from
  the system font, as it did with Archivo.
- **`font-synthesis: none`**: until items 2–4 move every screen onto the roles,
  old 700/800 sans rules render at Barlow 600 rather than a fake bold.
- **No strip total on the app bar.** It reads `STRIP 2`, not the mockup's
  `2/8`: nothing knows how many strips a sitting will be, the same reason the
  resume card dropped its total in Aug.
- **The bot icon is out of the wordmark.** No mockup draws it; it remains the
  favicon and install icon. Say if it should come back.
- **Refine's photo toggle is 44px**, up from the hi-fi's 34 — it was below the
  tap-target minimum.
- `--desk` keeps its old value until item 5 retires it for `--panel`.

Reference images are in `docs/field-manual-refs/`. They are mockups, not
pixel specs: where a screenshot and this brief disagree, this brief wins; where
either disagrees with a non-negotiable in `CLAUDE.md`, `CLAUDE.md` wins. Say so
and propose the smallest honest change.

| File | What it shows |
| --- | --- |
| `field-manual-spec.png` | Palette, type, button shapes |
| `field-manual-phone-fixes.png` | Your fixes at 390×844: overview + detail |
| `field-manual-laptop-fixes.png` | Your fixes at 1440×900: controls left, photo right |
| `system-roles-and-parts.png` | The type roles and the eight shared parts (drawn in the old look — use it for structure only) |
| `strip-result-structure.png` | Strip result structure (old look — structure only) |
| `welcome-laptop-structure.png` | Laptop Welcome as two columns (old look — structure only) |

## What was decided

1. **Look: Field Manual.** Sunlight first. Pure black and white, square
   corners, heavy rules, safety-yellow primary actions, a condensed all-caps
   display face. Simple over clever.
2. **Layout: Direction A, "Instrument".** Keep the current screen structure.
   The strip stays landscape, as cropped (no rotating it upright). Review is
   the whole strip plus zoom, with an overview that shows where you are.
3. **Laptop Welcome: two columns** — the doors on the left, previous sessions
   (with the unfinished one first) on the right.
4. **A layer of roles and parts** on top of tokens: seven type roles, colour
   roles, eight shared components. Screens stop styling themselves ad hoc.

## This deliberately changes the design contract

`tokens.css` and the handoff's colours and type are being replaced on purpose.
Update `CLAUDE.md` in the first commit:

- Stack → Fonts: Barlow Condensed (600, 700, 800), Barlow (400, 500, 600),
  JetBrains Mono (500, 700), self-hosted in `public/fonts/`. Archivo and IBM
  Plex Mono are removed.
- Read-these-first: the hi-fi remains the reference for **structure, flow and
  ratified copy**; this brief and `tokens.css` are the reference for **colour,
  type, radius and rules**. "Recreate pixel-perfectly" no longer applies to
  colour or type.
- Viewport: the laptop two-pane puts the **controls column on the left** and
  the photograph on the right (item 5).
- Keep "do not introduce values that are not in `tokens.css`" — it now points
  at the new file.

## Unchanged — do not touch

The mark language and its four hues (`--blue #1250c8` dashed = found,
`--green #0a8f4d` = kept, `--red #c02d12` ✕ = removed, `--pink #e0158f` + =
added), halos, ring widths and the 7–26px clamp. Every non-negotiable. The
worker boundary, storage, the service worker, the CV pipeline, the gesture
vocabulary in `ZoomPanStage.vue`, the copy rules and every RATIFIED string.
Hit sizes may only go **up**.

## 1. Tokens, fonts and type roles

**Colour** (`tokens.css`; keep the existing names where the role is the same):

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#000000` | text, rules, the app bar |
| `--paper` | `#ffffff` | work surface |
| `--panel` | `#f1f1ee` | sunken panels, idle band zones |
| `--stage-bg` | `#111111` | behind photographs only |
| `--action` (new) | `#ffd23f` | primary action fill, black text; the overview viewport box; strip counter on the app bar |
| `--muted` | `#4a4a4a` | secondary text — must pass 4.5:1 on white and on `--panel` |
| `--disabled` | `#9a9a9a` | disabled and upcoming, never for text you must read |
| `--rule-idle` | `#9a9a9a` | idle outlines (band zones not active) |
| `--cyan` | unchanged | crop box only |
| `--amber` | fold into `--action` | Processing's current step uses `--action` |

Blue, green, red and pink mean a mark and nothing else. **Links move to ink
with a 2px underline** — today they are blue.

**Radius:** every `--r-*` is `0`. `--r-device` stays for the `?frame=1`
phone frame only.

**Rules:** `--bd: 3px` (structural: bars, cards, button outlines, stage
edges), new `--bd-inner: 2px` (dividers inside a group), `--bd-fine: 1.5px`
(badges). No shadows, as before.

**Hit sizes:** primary action becomes a full-width bar, **76px** tall on phone
and laptop (`--hit-primary: 76px`); secondary 52px; min 44px; zoom buttons
52px.

**Type roles** — define them once in `base.css` as classes (or custom-property
sets) and use nothing else:

| Role | Face | Size / line | Notes |
| --- | --- | --- | --- |
| `display` | Barlow Condensed 800 | 40/38 phone, 60/54 laptop | uppercase via CSS; screen titles |
| `title` | Barlow Condensed 700 | 22/24 | uppercase; section heads, button labels |
| `body` | Barlow 500 | 17/24 | instructions; never below 15px anywhere |
| `label` | JetBrains Mono 700 | 11–13, +0.06em | uppercase; strip counter, badges, legends |
| `count-human` | JetBrains Mono 700 | 88 phone / 96 laptop | tabular, ink |
| `count-machine` | JetBrains Mono 500 | 20 | `--muted`, leading `~` |
| `tally` | JetBrains Mono 700 | 28 phone / 44 laptop | coloured by the mark it counts |

**Uppercase is CSS only** (`text-transform`). Strings in `en.js`, `es.js`,
`pt.js` stay sentence case — screen readers, translations and ratified copy
are unaffected.

`MarkLayer.vue` draws its + / ✕ labels with `ctx.font = 700 … Archivo`; move it
to Barlow 700 and confirm the glyphs still centre.

**Done when:** `grep -rn "Archivo\|Plex" src public` returns nothing; the
fonts are in the precached shell and render with the network off; a contrast
check (write `tools/check-contrast.mjs` against `tokens.css`) passes 4.5:1 for
every text/background pair in use; `walk-flow` passes at 390×844 and
1440×900.

## 2. The shared parts

Build these as SFCs in `src/components/` and use them everywhere; delete the
per-screen equivalents. Look at `field-manual-phone-fixes.png`.

1. **AppButton** — `primary` (yellow fill, black text, 3px ink rule on top,
   full-width bar, `title` role), `secondary` (white, 3px ink outline),
   `quiet` (underlined ink text link, ≥44px row).
2. **AppBar** — black; `OVICOUNTER` in Barlow Condensed 800, then the strip
   counter in yellow `label` (`STRIP 2/8`, or nothing on a quick count); menu
   right. The wordmark decision from Aug 2026 stands: the product name may
   read "Ovicounter AI" wherever the full name is wanted.
3. **StripHeader** — `display` title, then the instruction row. On Your fixes
   the instruction row is a 3-cell boxed grid: `TAP = REMOVE · HOLD = ADD ·
   LINE = SPLIT` (DRAFT copy).
4. **MarkKey** — one wording everywhere: "found by the app / you kept it / you
   removed it / you added one" (Welcome already uses the last three; Your fixes
   currently says "machine, kept" — replace it). Always drawn on paper, never
   on the dark stage.
5. **JudgmentTally** — removed / added / split counts, human judgments only.
   Allowed on Your fixes by non-negotiable 1; **never** a machine total, never
   on Refine.
6. **Overview** — the whole strip at contain, with a 3px `--action` box for
   what the stage shows, and parts already looked at close up shaded.
7. **ZoomRail** — − / zoom level / + as joined 52px square buttons. Pinch,
   wheel and Shift-drag still work; this is for people who don't know they do.
8. **BandScale** and **StatusBadge** — restyled only (square, 3px, mono).
   Add a dashed-outline `NOT CHECKED` badge for strips with `checked: false`.

**Done when:** no screen sets its own font size, colour or border outside
these parts and the type roles (check with a grep for `font-size:` and hex
values in `src/views/`).

## 3. Your fixes (the screen that matters most)

**Phone** (`field-manual-phone-fixes.png`), top to bottom: AppBar ·
StripHeader · Overview · the stage · JudgmentTally with Undo as its third cell
· the Done bar.

- **Zoom 1 is still the whole strip, and the screen still opens on it**
  (CLAUDE.md, Sep 30). The Overview appears as soon as the stage is zoomed
  past 1 and shows where you are; at zoom 1 it collapses so the whole strip is
  not shown twice. The mockup shows the zoomed state.
- Size the stage so a 2.2:1 strip at zoom 1 does not sit in a band of dead
  space: at zoom 1 give the leftover height to the stage's own letterbox as
  little as the layout allows. Measure it — report the photo's share of the
  stage at zoom 1 before and after.
- **Coverage.** Divide the strip into 8 equal parts along its length. A part
  is "looked at" once it has been fully inside the viewport at zoom ≥ 2. Shade
  looked-at parts on the Overview (phone) and in an 8-segment bar under the
  photo (laptop): `LOOKED AT CLOSE UP · 5 OF 8 PARTS` (DRAFT). It measures the
  human's effort, never the machine's count. Nothing blocks Done.
- Zoom buttons sit bottom-right of the stage (phone) or under it (laptop).

**Laptop** (`field-manual-laptop-fixes.png`): controls column on the left
(StripHeader with the numbered steps 1 Tap / 2 Hold / 3 Draw, JudgmentTally,
"Marks look wrong? Adjust them", then Undo + Done as a single bar at the
bottom); photograph on the right at contain, ZoomRail and MarkKey in a strip
beneath it.

**Done when:** `walk-flow` passes; at 1440×900 the photograph is still ≥60% of
the viewport width; at 390×844 the untouched pass still reaches a result in 3
decisions and still shows machine styling.

## 4. Every other screen, in this order

Restyle with the parts and roles; do not change flow or copy unless listed.

1. **Strip result** — `count-human` as the hero, sentence below it, BandScale,
   the kept/removed/added tally (`strip-result-structure.png`), thumbnail with
   `SAVED ON THIS PHONE ✓`, then End session (secondary) / Next strip → (the
   primary bar). Untouched strips keep machine styling exactly as today.
2. **Welcome** — phone: as now, restyled. Laptop (≥900px): two columns
   (`welcome-laptop-structure.png`) — left, the ratified intro line at
   `display` size, MarkKey inline, the three doors; right, on `--panel`,
   previous sessions with the unfinished session first as a Resume card.
   `WORKS OFFLINE ✓` moves into the app bar. This also retires the floating
   badge and narrow column seen at 1440 today.
3. **Refine** — sliders restyled square: 8px ink-outlined track, 28px square
   black thumb; the pink calibration tick stays. Still no machine total.
4. **Crop, Capture, Refusal** — the refusal card becomes square, 3px, with the
   Take it again bar in yellow. Blames the photo, one instruction, as before.
5. **Processing** — ink background as now; the current step is marked in
   `--action`.
6. **Session summary, Mark one egg, the menu and modals.**

After each screen: capture at 390×844 and 1440×900 and check against the refs.

## 5. Laptop two-pane, flipped

Controls left, photo right, on every stage screen:
`grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr`.
The panel-on-the-desk treatment (`--laptop-gutter`, `--laptop-max-w`) stays;
the desk colour becomes `--panel`, the panel edge a 3px ink rule, no radius.
`?frame=1` still works.

## 6. Languages

Condensed caps are narrow, but Spanish and Portuguese run long. Walk the flow
with each locale at 390px and fix any title or button that wraps past two
lines or clips — the Your fixes title, the Done bar and the Welcome doors are
the likeliest. Fix by
layout, never by abbreviating ratified copy.

## New DRAFT copy

Add each to `en.js` as DRAFT and list it in `docs/copy-to-ratify.md`:

- `TAP = REMOVE` · `HOLD = ADD` · `LINE = SPLIT` (Your fixes instruction row)
- `1 Tap a mark to remove it` · `2 Hold empty paper to add an egg` · `3 Draw across a clump to split it` (laptop steps)
- `Looked at close up · {n} of 8 parts`
- `found by the app` (MarkKey — replaces "machine, kept")
- `Not checked` (badge)
- `Resume {day}` · `Unfinished · strip {n} next` (Welcome resume card)

## Open questions — ask Gabriel, don't decide silently

1. **Untouched marks on Your fixes.** They draw solid green ("kept") before
   anyone has looked. That is the same false claim item 2 of the Sep 19 brief
   fixed on Strip result. Option: stay dashed blue until the part they're in
   has been looked at close up (coverage makes this possible). Changes
   `finishReview` semantics; do not build it without a yes.
2. **Yellow on the Overview box and on Processing.** Yellow now means "you /
   here / go". If it reads as a button in either place, fall back to cyan for
   the viewport box.

## Verifying

`node tools/walk-flow.mjs` at 390×844 and at 1440×900 after every screen, plus
`node tools/check-i18n.mjs` and the new `tools/check-contrast.mjs`. Record
what was measured against each done-when in a status table at the top of this
file, as in `docs/surpass-v1-brief.md`.
