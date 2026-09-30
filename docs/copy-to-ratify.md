# Copy that needs a decision

Everything in `src/i18n/en.js` marked `RATIFIED` comes verbatim from the hi-fi
handoff and is settled. This is the rest — strings written during the build
because the handoff has no copy for that state. None of it has had design
attention. All of it must survive translation to Spanish.

| Where | String | Why it exists |
| --- | --- | --- |
| Welcome | The intro line — "Photograph a strip of ovitrap paper. The app marks what it finds. You check the marks — the count is yours." | The hi-fi opens straight onto the two buttons with no explanation at all. This says what the tool does in the operator's terms before they commit to a session, and states who owns the count. |
| Welcome | "What the marks mean" + the four glyph lines | Not in the handoff. Shown only when the device has no session history — a first-time user — in the space the previous-sessions list occupies from then on. Justified by success criterion §10, "a first-time user completes a full session without training material": the mark language is the one thing here that has to be taught, and it is otherwise first met on Refine with several hundred rings already on screen. |
| Welcome | "Resume this session" | The resume card is wireframe `2a` only; it was never drawn in hi-fi. |
| Welcome | "Interrupted · {done} of {total} strips" | Same. The wireframe says "Interrupted yesterday · 4 of ~12 strips"; the `~` on a strip count reads as a machine estimate, which collides with the grey-`~`-means-machine rule, so it is dropped here. |
| Welcome | "Count one strip" | The third door (Sep 2026, brief §4): the V1 path of photo → number, beside sessions. No session, nothing saved unless the person asks. The demo button uses this path. |
| Your fixes | "Marks look wrong? Adjust them" | A quick count arrives on Your fixes without passing Refine (the shortest path is three decisions). This is the way to the sliders; shown only on a quick count. |
| Strip result | "NOT SAVED" / "Count another" / "Start a session with these settings" | The quick-count result. "Count another" drops this strip and measures the next afresh; "Start a session with these settings" makes this strip 1 of a real session, saved now, calibration carried. Not offered on the demo, whose calibration belongs to a bundled photograph. The demo offers "Back to home" instead. |
| Capture | "{code} · {day}" | The hi-fi shows "SESSION A · TUE" — a mock placeholder. Real sessions need a naming scheme, and whether a technician needs a session code at all is unanswered. |
| Refusal | "Too blurry to count" / "Hold the phone still against the table, and take it again." | The handoff says refusal copy varies by failure (too far / too blurry / too dark) but only draws "too far". Structure is fixed; this fills the blur case. |
| Refusal | "Too dark to count" / "Move it into better light, and take it again." | Same, for the dark case. |
| Mark one egg | "That spot is bare paper. Tap directly on an egg." | `measureBlobAt` legitimately refuses a tap that lands on paper, a stain or a fold, and the screen has to say something. Must not read as blaming the person. |
| Mark one egg | "That looks bigger than most eggs here. Pick another?" / "That looks smaller than most eggs here. Pick another?" | Sep 2026: calibration is now measured by the probe on Crop, and this screen is the correction. When a tap disagrees with the probe by more than 2× in area either way it is most likely a clump or a fragment, and the screen says so before the operator commits. Must not read as overruling them — "Looks right — go" stays enabled. |
| Mark one egg | "Keep the marks" | Replaces "Pick another" while no egg has been tapped yet, when the screen was opened from Refine. Without it the only ways out were to change the calibration or to abandon the strip. |
| Refine | "Pink tick = the size of the eggs found here. Sliding past it means eggs that size would be lost." | The ratified caption says "the egg you marked". When the probe measured the calibration nobody marked an egg, so the same sentence is shown with a true subject. Shown only when the calibration came from the probe; the ratified line is shown after a tap. |
| Refine | "Marks look wrong? Mark an egg" | The way to Mark one egg now that it is no longer the entry. A 44px text button under the sliders. |
| Processing | "LIGHT AND DARK SPLIT", "DARK SPECKS KEPT", "MARKS PLACED" | The hi-fi draws only the third buffer badge, "BOXES DRAWN". These are the other three in the same register. |
| Strip result | "~{n} found by the app. You made no changes." | Shown instead of "{n} eggs, checked by you — this strip is {band}" when the operator did nothing on Your fixes (no remove, add, split, zoom or pan). The count stays grey with a leading `~` and no band is named. Before this, tapping straight through read "1,193 eggs, checked by you" with 0 removed and 0 added. |
| Strip result | "DEMO — NOT SAVED" / "NOT SAVED YET" | The handoff draws only "SAVED ON THIS PHONE ✓", which assumes a record was written. A demo writes none by promise, and nothing writes any until persistence exists, so the badge would otherwise be false in both cases. |
| Session summary | The entire screen | Wireframe 2j only; it has never had a hi-fi pass. Strings are the wireframe's own words, which is the best source available but not a ratified one. The wireframe's "Route 3 — Tuesday · 47 min" implies a route naming scheme the app does not have, so it renders as weekday and elapsed minutes. |
| Everywhere (MarkKey) | "found by the app" / "you kept it" / "you removed it" / "you added one" | Field Manual brief §2: one wording for the mark language on every screen. "found by the app" is new; the other three were Welcome's. Replaces Welcome's "the app found something" and Your fixes' "machine, kept" / "✕ removed" / "+ added" (the last two were RATIFIED and are retired by the brief). |
| Your fixes, Strip result (JudgmentTally) | "kept" / "removed" / "added" / "split" | Labels under the tally numerals. Replace Strip result's RATIFIED "{n} machine" / "✕ {n} removed" / "+ {n} added", retired by the brief. |
| Welcome, Strip result (StatusBadge) | "Not checked" | Dashed badge for a strip whose marks nobody checked (`checked: false`). |

## Also unresolved

- **The wordmark — decided (Aug 2026).** Design Brief v2 says the product is
  "Ovicounter AI" everywhere; the hi-fi Welcome header drew only "Ovicounter".
  Resolved in favour of the brief: the header now carries the v1 lockup — the
  bot, then OVICOUNTER at 800 beside AI at 400, the weight contrast v1 got from
  black against thin. It lives in `components/AppWordmark.vue` and deliberately
  not in the i18n bundles, because a product name is not copy.

- **"AI" is off the banned list — decided (Aug 2026).** It was on it in both
  source documents (the handoff's copy rules, and Design Brief v2 §8), which is
  almost certainly why the hi-fi wordmark reads only "Ovicounter" — the design
  was following its own rule. That was a mistake in the documents: every other
  entry on the list is mechanism vocabulary, and the product is named Ovicounter
  AI.

  **Both source documents still say otherwise** and should be corrected, or the
  next person to read them will re-derive the same wrong conclusion.

  The rest of the list stands, so the tool still never describes itself as doing
  something with AI — that now falls out of the rules that carry the weight (the
  machine finds and marks; nothing learns) rather than from forbidding a word.
- **Band names.** none / few / many / heavy are placeholders per settled
  decision §5.6, to be set per program from an explicit answer to "what count
  would change what you do?". The default edges in `src/lib/bands.js`
  (0 / 1–24 / 25–99 / 100+) are a shape to be filled in, not a claim.
- **Two annotations in the hi-fi are notes to the reader, not app copy**, and
  are deliberately not implemented: "A photo that can't be counted is refused
  with one fix — see screen 2R." on Capture, and "magnifier sits above the
  finger" on Your fixes.
- **The running confirmed tally is not built.** Design Brief v2 calls for one on
  the review step twice — §3 lists it as one of the five restructuring changes,
  and §6.3 asks for it to be designed — but the ratified hi-fi draws no tally on
  Your fixes, and its legend carries no numbers (unlike Strip result's, which
  does). Built as drawn. The brief's argument for it is fatigue on a long
  session, which is real and which the hi-fi may simply not have addressed.
- **No stopping point is built** either. §6.3 asks for "that's enough" and what
  diminishing returns looks like on a strip with 200 proposals versus 12. The
  hi-fi has no such affordance, and on a 400-egg strip the question is a live
  one.
