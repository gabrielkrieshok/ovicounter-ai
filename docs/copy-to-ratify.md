# Copy that needs a decision

Everything in `src/i18n/en.js` marked `RATIFIED` comes verbatim from the hi-fi
handoff and is settled. This is the rest — strings written during the build
because the handoff has no copy for that state. None of it has had design
attention. All of it must survive translation to Spanish.

| Where | String | Why it exists |
| --- | --- | --- |
| Welcome | The intro line — "Photograph a strip of ovitrap paper. The app marks what it finds. You check the marks — the count is yours." | The hi-fi opens straight onto the two buttons with no explanation at all. This says what the tool does in the operator's terms before they commit to a session, and states who owns the count. |
| Welcome | The mark picture (components/MarkIntro.vue) | Sep 30: replaces "What the marks mean" and its four glyph lines. A drawn strip with the four marks on it, labelled in MarkKey's words ("found by the app / you kept it / you removed it / you added one") — no new strings. Shown on every visit, phone and laptop. |
| Welcome | "Resume {day}" / "Unfinished · strip {n} next" | Field Manual brief §4: the resume card, first in the history (laptop) or above the doors (phone). Replaces "Resume this session" / "Interrupted · {done} counted so far". The wireframe's "of ~12" stays out: nothing knows a sitting's total. |
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
| Your fixes (phone) | "Tap = remove" · "Hold = add" · "Line = split" | Field Manual brief §3: the boxed instruction row under the title. Replaces the RATIFIED "Tap a mark to remove it · press and hold empty paper to add an egg" and the "draw a line across a clump to split it" hint. |
| Your fixes (laptop) | "1 Tap a mark to remove it" · "2 Hold empty paper to add an egg" · "3 Draw across a clump to split it" | The numbered steps in the laptop's controls column. |
| Your fixes | "Looked at close up · {n} of {total} parts" | Coverage: parts of the strip wholly on screen at zoom ≥ 2. The person's effort, never the machine's count. |
| Your fixes | "Zoom out" / "Zoom in" | Accessible names for the ZoomRail buttons; not visible. |
| Strip result | "Not looked at close up: {n} of {total} parts" | Open question 1 (Sep 30): Done counts every mark not removed, including machine marks in parts nobody looked at close up. They stay blue on the thumbnail and `proposed` in the record, and this line says how many parts that was. |
| Welcome | "{n} not checked" | Dashed badge on a previous session with strips nobody checked. Session records now carry `unchecked`; older ones show nothing. |
| Everywhere (steps) | "Photograph" · "Crop" · "Measure" · "Refine" · "Check the marks" · "Count", and "Step {n} of {total}" | Sep 30: the step list (laptop) and step strip (phone). Short names for the steps; each screen keeps its ratified title. |
| Crop, Refine, Mark one egg | "Find the marks again?" / "This finds the marks on this strip again from the start. The marks you removed, added or split will be lost." / "Keep my fixes" / "Find them again" | Asked before anything finds the marks again on a strip the person has worked on. Names what is lost instead of counting it ("your 1 fixes"). |
| Capture | "Take a new photo?" / "A new photo starts this strip again. The marks you removed, added or split on it will be lost." / "Keep this strip" / "Take a new photo" | The same, for a new photo taken after going back to Photograph. |
| Guide | The whole screen: "How it works", the intro, one paragraph per step, "Got it" | Sep 30: an in-app guide, reached from Welcome ("How it works" link) and the menu. Under the step list's own names, so the guide and the app agree on what a step is called. Written to the copy rules; translated to es/pt. |
| Welcome | "A clean strip" / "Dense and evenly lit — the easy case." · "A field strip, zoomed out" / "Stained and creased, with the table around it to crop away." · "A test pattern" / "Ovoids drawn on this phone. The result says how many." | Oct 1: the three demos the yellow demo button opens onto. |
| Welcome | "One photo to a number. Nothing is saved unless you ask." · "Strip after strip, settings carried forward, every strip saved on this phone." | One line under Count one strip and Start a new session, so the two doors read as different things. |
| Strip result | "Test pattern: {n} drawn" | The test-pattern demo knows how many ovoids it drew; shown under the count. |
| Steps | "skipped" / "optional" | Oct 1: every strip shows the Guide's six steps; a step this path does not need is marked (the demo's Photograph, a quick count's Refine). |
| Processing (look mode) | "How the marks were found" / "Tap a step to see that picture." / "Back to {step}" | Oct 1: Measure reopened from the step list shows the same four pictures, chosen by the person; nothing is measured again for the count. |
| Welcome | "Count a single paper strip" · "Use the camera" / "Photograph the strip now. The app will ask to use the camera." · "Choose a photo" / "A photo of a strip already on this phone." · "Or try a demo photo" · "Counting several strips? Start a session" | Oct 1: one way in, then the photo's source. Retires the RATIFIED "Start a new session" and "Try it with a demo photo" on Welcome, the draft door notes and the demo note, and "WORKS OFFLINE ✓". "Choose a photo", never "upload". |
| About | The whole screen: "What it does", "Why it marks too much", "What is kept", "On this phone", "Open source", "Version {version}" | Oct 1: from the menu. Names no partner or funder — add them if they should be named. |
| Strip result | "Share" / "Saved the marked and original photos, and copied the summary." | Oct 1: shares the marked-up image, the original and the result sentence through the system share sheet; on a laptop, saves and copies instead. |
| Menu | "Everything runs on this phone. Nothing is sent anywhere unless you share it." | Replaces "… Nothing is sent anywhere.", which stopped being true without the qualifier once Share existed. |

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
