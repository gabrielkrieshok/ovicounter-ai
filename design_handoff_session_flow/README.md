# Handoff: Ovicounter AI — Session Flow v2

## Overview
Ovicounter AI is a field app for counting *Aedes* mosquito egg on ovitrap paper strips. A technician photographs a strip; the app deliberately over-proposes candidate eggs; the technician culls (removes debris, adds missed eggs); the output is a human-verified count presented on a band scale (none/few/many/heavy). This handoff covers the full **session flow v2**: Welcome → Get the photo → Processing → Refinement → Count, in a loop over N strips (5–30 per session).

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy. The task is to **recreate these designs in the target codebase's existing environment** (per the repo's stack and patterns), or, if none exists, in the most appropriate framework for an offline-first Android-viewport web/mobile app.

## Fidelity
- `Ovicounter Hi-Fi.dc.html` — **high-fidelity**. 8 screens at exactly 380×788 CSS px, using final colors, type, spacing, and hit sizes from `tokens.css`. Recreate pixel-perfectly.
- `Ovicounter Wireframes.dc.html` — **low-fidelity**. The exploration history (turns 1–3). Turn 3 (top section) is the ratified flow the hi-fi implements; turns 1–2 are alternatives, kept for context only.

## Design Tokens — the contract
`tokens.css` (bundled) is authoritative. **No color, radius, spacing, or hit size not in it.** Key rules:
- Colors: ink `#14100c`, paper `#fffdf9`, panel `#f3efe6`, desk `#ded8cd` (harness only), muted `#6b6155`, ink-soft `#3d362d`, blue `#1250c8`, green `#0a8f4d`, red `#c02d12`, pink `#e0158f`, cyan `#19d5ff` (bounding/crop boxes), amber `#ffd23f`, stage `#2a241d`, scrim `rgba(20,16,12,.62)`.
- Borders: 2px ink almost everywhere; 1.5px badges/fine overlays; 3px crop box.
- Hit sizes: primary 62px, secondary 52px, min 44px, small (crop handles, undo) 34px.
- Radius: badge 6, small 8, panel 9, primary 10, toggle 14, device 22.
- Type: **Archivo** throughout; **IBM Plex Mono** (tabular numerals) for counts, codes, badges, band letters.
- Shadows only as legibility halos over photography (`--halo-light`/`--halo-dark`), never depth.
- Detection markers: 2.5px rings with white halo, diameter clamped 7–26px.
- Motion: 0.5s stage cross-fades, 0.12s progress, 420ms hold on completion. Strictly functional.
- Everything designed and checked at 380px viewport; high contrast for sunlight.

## Mark language (one system, all screens)
- **Dashed blue ring** = machine-proposed, not yet human-answered. Blue never appears after review is done.
- **Solid green ring** = kept (machine mark, human-accepted).
- **Red ✕ glyph** = removed by the human (the ring is gone; only the ✕ remains, faint).
- **Pink + glyph** = hand-added egg.
- Shape carries the meaning redundantly with color (sunlight/colorblind-safe). Always white halo over paper.

## Screens (in flow order; see hi-fi file for exact layouts)

### 1. Welcome (`data-screen-label="Welcome"`)
Paper background. Header: wordmark + "WORKS OFFLINE ✓" mono badge (rule-idle border). Actions: "Start a new session" (62px, ink-filled, r10), "Try it with a demo photo" (52px, 2px ink outline, r9). "Previous sessions" list: most recent card with band-letter badges (N/F/M/H; filled ink = many/heavy, outline = none/few), older cards muted (rule-idle border). Footer note: demo runs the whole flow on a bundled strip, nothing saved. No tab bar — the flow is linear.

### 2. Capture (`Capture`)
Full-bleed viewfinder on stage background. Dashed cyan guide box, caption "Fill the box with the strip" on scrim chip. Bottom bar (gradient scrim): gallery thumbnail (52px, opens phone photos — gallery picks pass the same gate), 62px shutter ring, label "from phone photos". Panel below: "Checked as it comes in" — sharp ✓ / close ✓ / eggs visible ✓ chips. Gate failure → Refusal.

### 2R. Refusal (`Refusal`) — branch, the highest-stakes surface
Refused photo full-bleed under 62% ink scrim. White card (2px ink, r10): title "Too far away to count"; body "The eggs in this photo are too small to see. Move closer so the strip fills the frame, and take it again."; evidence pair — YOUR PHOTO vs CLOSE ENOUGH thumbnails (84px, 2px ink, r9); single 62px ink-filled "Take it again" → camera. Rules: blames the photo, never the person; exactly one instruction; one way forward; strip counter does not advance; nothing lands in the record. Reason/instruction copy varies by failure (too far / too blurry / too dark) but the structure is fixed.

### 3. Crop & straighten (`Crop`)
Stage background. 3px cyan crop box, proposed automatically, rotated with the strip; 18px white corner handles with 2px ink borders (34px hit). Toolbar chips (44px): ⟲ rotate / straighten / ⟳. Caption: "Box proposed automatically — drag the corners if it missed." Footer: "Use this photo" (62px, paper-filled with ink border, on dark stage). Confirming starts the pipeline during the transition.

### 4. Mark one egg (`Mark one egg`) — once per session
Title "Tap one egg you can see clearly"; sub "Its size and darkness tune the search on every strip today." Zoomed photo stage (2px ink rules top/bottom). Tap → 32px dashed blue ring at tap point + echo chip "Found 12 more the same size" (live count). Footer: "Pick another" (52px outline) / "Looks right — go" (62px ink-filled). Later strips skip this screen entirely. Layout must not hard-block a future variant that reads a physical reference card in the frame instead of a tap.

### 5. Processing (`Processing`) — visible pipeline, ~0.5s per step
Ink background. Header "Measuring on this phone…" + progress bar (paper on ink-soft track, 0.12s updates driven by real progress). Main stage: the strip photo showing the CURRENT pipeline buffer (real buffers only, never a stand-in filter): light/dark separation (grayscale+contrast) → dark specks kept → cyan bounding boxes → dashed blue marks. Step rail at bottom: 4 thumbnails, current step amber-bordered with amber mono label. Corner badge names the current buffer (e.g. "BOXES DRAWN"). Lands directly on Refine.

### 6. Refine (`Refine`) — sliders, no totals
**Hard rule: no machine total is visible anywhere on this screen.** Header panel: "Refine the marks" + 34px "photo 👁" toggle (original photo vs current buffer). Photo with dashed blue marks; marks lost since slider movement began render at 35% opacity, with corner caption "faint rings = lost since you started moving" (ghost feedback). Sliders (8px track `#e6dfd2`, 24px ink thumb): "Light / dark split", "Speck size" — the speck-size track carries a **pink tick at the calibration egg's size**; caption "Pink tick = the egg you marked. Sliding past it means your own egg would be lost." Every slider change re-runs the pipeline live (marks update immediately). Footer: "Back to start" (52px outline, resets to session defaults) / "Marks look right →" (52px filled).

### 7. Your fixes (`Your fixes`)
Header: "Check the marks" — "Tap a mark to remove it · press and hold empty paper to add an egg". Full-bleed strip with green kept rings, red ✕ removed, pink + added. Add gesture: press-and-hold shows a 76px magnifier ABOVE the finger (never under it) with fine adjustment before commit. Split gesture: draw a stroke across a clump (caption chip). Legend row + 44px "↩ undo". Footer: "Done — count them" (62px ink-filled) — the human signing off. Every ✕ and + is recorded as a human judgment.

### 8. The count (`Strip result`)
Header: "Strip 1 — done" + the machine's provisional total struck through in grey mono (`~21`, muted color, line-through) — the only place it survives. Band scale: 4 zones (flex .6/1/1.4/1 = none/few/many/heavy), active zone ink-filled, others panel with rule-idle border; the **black human count (44px Plex Mono) stands on a 2px pointer inside its zone**. Sentence: "18 eggs, checked by you — this strip is FEW." Kept/removed/added legend in mark-language glyphs. Verified strip thumbnail with marks + "SAVED ON THIS PHONE ✓" badge. Footer: "End session" (52px outline) / "Next strip →" (62px filled, loops to Capture; calibration carried forward).

## Interactions & flow
- Loop: Capture → (gate: pass | Refusal → Capture) → Crop → [strip 1 only: Mark one egg] → Processing → Refine → Your fixes → Count → Next strip ×N → session summary (lofi only, wireframe `2j`: strips counted, band histogram, retakes, "record saved on this phone", back to Welcome).
- Computation runs during transitions; every screen the user lands on contains a user action.
- 420ms hold on the count before "Next strip" becomes the affordance moment.
- Session resume: an interrupted session surfaces on Welcome as a resume card (see wireframe `2a`).
- Band names/edges (none/few/many/heavy) are **placeholders — implement as configurable per program, not hard-coded**.

## State
- Session: id, started_at, calibration {tap point, egg size, darkness}, strips[].
- Strip: photo, crop box + rotation, gate verdict (+ refusal reason if any), pipeline settings used, marks[] (each: position, source machine|hand, status kept|removed|added, clump-inferred flag), final count, band.
- The count is a projection of the marks; the record (photo + settings + verified marks) is the primary artifact. All storage on-device; fully offline.

## Copy rules (enforced, EN with future ES parity)
Banned words: AI, model, algorithm, inference, confidence, machine learning, learn, teach, train, upload, loading. The machine "finds" and "marks"; the person "checks/confirms/removes/adds". Mechanism copy stays physical ("light and dark separated"). "Measuring on this phone," never "loading." Refusals name the photo as the problem and give exactly one instruction. All copy in the hi-fi file is ratified — use it verbatim.

## Assets
- `photos/` — four real field photographs (Guatemala best case, Jamaica midrange, El Salvador worst case, whole strip on table), used in the mocks as stand-ins for live camera frames. El Salvador is the canonical refusal-triggering photo for testing.
- Fonts: Archivo (400–800) and IBM Plex Mono (400–700), Google Fonts.

## Files
- `Ovicounter Hi-Fi.dc.html` — the 8 hi-fi screens (open in a browser; screens laid out left-to-right in flow order).
- `Ovicounter Wireframes.dc.html` — exploration turns 1–3; turn 3 = ratified structure, incl. session summary and branch screens.
- `tokens.css` — the design-token contract.
- `photos/` — field photographs.
