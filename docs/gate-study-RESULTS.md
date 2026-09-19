# Gate 1 — Embedding separability on real ovitrap imagery

**Status: provisional. Directionally answered, not closed.** The headline
comparison is limited by 11 debris examples. Treat every AUROC below as
±0.05–0.08.

**Question:** do DINOv2 patch embeddings separate mosquito eggs from debris by
enough margin over hand-engineered classical features to justify a ~20MB model
in the app?

**Short answer:** yes on margin, no on absolute threshold — but the experiment
also found that *the scoring method the app planned to use was the real
bottleneck*, and fixing it matters more than the embeddings-vs-classical
question. Details below.

---

## 1. Recommendation

1. **Do not drop the learned tier.** Under honest cross-strip validation
   DINOv2 beats the classical feature set by **+0.13 to +0.15 AUROC**, and it
   is demonstrably reading the egg itself, not its surroundings (§5).

2. **Replace exemplar-similarity scoring with a trained classifier — this is
   the highest-value finding.** Ship a pre-trained head instead of calibrating
   from user-tapped exemplars. It beat exemplar-similarity on *every* feature
   set tried, and it removes the "tap 10 eggs" step from the user flow. Better
   accuracy and less user work. The head is ~100 bytes for classical features,
   ~1.5KB on top of the DINOv2 backbone.

3. **Do not ship yet.** Best configuration is 0.86–0.94, short of the 0.97
   bar. More labelled debris is the binding constraint, not more eggs.

4. **Re-derive the 0.97 threshold.** It was specified for the
   exemplar-similarity design. If the app ships a trained head, the bar should
   come from what the counting workflow actually needs.

5. **Set a minimum capture resolution.** El Salvador eggs are 1–3 px; no
   method recovers shape from that (§6).

---

## 2. Data

| Site | Files | Physical strips | Median egg bbox |
|---|---|---|---|
| Portugal | 5 | **3** | 15 px |
| El Salvador | 3 | 3 | 4 px |

**Portugal's 5 files are only 3 independent strips.** `113526`/`113530` are two
views of one waterline; `113537`/`113539` are two views of another; `135323`
(Dec 2) is separate. Splits must group by physical strip — otherwise exemplars
and scored patches are *the same physical eggs* and results are inflated.
Encoded in `gate/config.py`.

**The two sites are not comparable in scale.** Portugal eggs are ~15 px and
clearly resolved. El Salvador eggs are 1–3 px — single dark specks with no
recoverable shape. A cross-site transfer test between them would fail on
resolution, teaching nothing about embeddings. El Salvador was therefore run
as a resolution-floor probe, not as the transfer partner.

---

## 3. Method

**Proposal stage.** `gate/pipeline.py` is a step-for-step port of the app's
`_app-poc/prototype/cv-pipeline.js`, run with the app's shipped `DEFAULTS`
unmodified. Measured **0.97 egg recall** on Portugal. 9,802 proposals total.

*El Salvador exception:* the app's `minArea: 20` exceeds the total area of an
entire El Salvador egg (1–9 px), so the shipped detector cannot return one at
all. Params were scale-derived for that site only.

**Labelling.** 547 proposals sampled, stratified by local contrast (how much
darker a blob is than the paper immediately around it) and balanced across
strips. Contrast is a hand-computed geometric quantity with no learned
component, so it cannot bias the embeddings-vs-classical comparison. Each item
carries a `sample_weight` for reweighting to the true proposal population.

**109 labelled** (of 547): 51 egg, 29 cluster, 16 debris, 13 unsure.
Portugal usable after dropping `unsure`: **78 rows — 40 single eggs, 27
clusters, 11 debris.**

**Positive-class definition.** Portugal eggs arrive in dense touching chains,
so results are reported both for `singles` (single eggs only) and
`egg_material` (singles + clusters). Both are given throughout; they broadly
agree.

**Two scoring protocols were compared** — this turned out to be the crux:

- *Exemplar-similarity* (the original spec): score = cosine similarity to the
  mean of K exemplar embeddings; classical control = negative Euclidean
  distance to the exemplars' standardised-feature mean. 100 bootstrap draws.
  Exemplars always excluded from the scored set.
- *Trained classifier*: L2-regularised logistic regression, class-balanced,
  evaluated **leave-one-strip-out** with pooled out-of-fold predictions. No
  model is ever tested on a strip it trained on.

---

## 4. Results

### 4.1 Trained classifier, leave-one-strip-out (Portugal)

The primary table. Feature sets ordered by shipping cost.

| Features | dim | singles (40/11) | egg material (67/11) |
|---|---|---|---|
| Position only *(confound check)* | 2 | 0.620 | 0.634 |
| 8 classical | 8 | 0.707 | 0.745 |
| 8 classical + local contrast | 9 | 0.700 | 0.750 |
| **DINOv2-cls @2× margin** | 384 | **0.859** | **0.874** |
| DINOv2-mean @2× margin | 384 | 0.855 | 0.881 |
| DINOv2-cls @5× margin | 384 | 0.884 | 0.931 |
| DINOv2-mean @5× margin | 384 | 0.889 | 0.940 |

**Embedding advantage over classical: +0.13 to +0.15 at 2× margin**, where
there is minimal surrounding context to exploit. Larger at 5×, but see §5.

### 4.2 Exemplar-similarity protocol (original spec)

| Site / positives | best embedding | classical | gap |
|---|---|---|---|
| Portugal / singles | 0.909 (CI 0.83–0.97) | 0.738 | +0.17 |
| Portugal / egg material | 0.914 (CI 0.82–0.94) | 0.717 | +0.20 |
| El Salvador / singles | 0.933 (CI 0.80–1.00) | 0.900 | +0.03 |
| El Salvador / egg material | 0.925 (CI 0.68–0.98) | 0.850 | +0.08 |

Best conditions here were all at 5× margin — *not* trustworthy on their own,
see §5. El Salvador rows rest on 5 debris and are not usable for decisions.

### 4.3 Patch margin

Under exemplar-similarity, AUROC rose monotonically with margin
(1.25× → 0.740, 2× → 0.775, 3× → 0.793, 4× → 0.796, 5× → 0.817 mean across
conditions), which prompted the leakage test in §5. The readme's sweep stops
at 3×; it was extended to 5×.

---

## 5. Is the model reading the egg, or its surroundings?

Portugal eggs cluster along the waterline while debris scatters. A model
scoring *location* rather than *object* would look identical in the main sweep
and fail in deployment — the whole job of a verification tier is rejecting
debris sitting among the eggs.

**Test:** blank the centre of each patch (the egg itself) with the patch's
border colour and rescore. `scripts/04_context_test.py`.

| Portugal / singles | full | egg blanked | egg's contribution |
|---|---|---|---|
| DINOv2-cls @2× | 0.859 | 0.414 | **+0.445** |
| DINOv2-cls @5× | 0.884 | 0.723 | +0.161 |
| DINOv2-mean @2× | 0.855 | 0.439 | +0.416 |
| DINOv2-mean @5× | 0.889 | 0.598 | +0.291 |

**At 2× margin, removing the egg drops the model below chance.** The signal is
the egg. At 5× a substantial part of the score does come from context — so
prefer the 2× configuration, whose numbers are trustworthy, over the higher
raw scores at 5×.

Position-only scores 0.62 under leave-one-strip-out, confirming the spatial
confound is small once validation is done across strips: the egg line sits
somewhere different on every strip, so location does not transfer.

### Two methodological warnings for anyone reusing this work

**(a) Exemplar-similarity badly under-uses a high-dimensional embedding.**
Distance-to-centroid treats all 384 dimensions as equally important and
drowns the discriminative direction in noise. The *same* embeddings and
patches scored 0.72 under exemplar-similarity and 0.86 under a trained
classifier. On the 8 classical features the two protocols agree closely
(0.71–0.75 either way), because those features are already distilled. **A
weak scorer penalises the rich representation and not the cheap one** — it
will make a learned tier look worthless when it isn't.

**(b) Validate across strips, not within.** Position-only scored 0.758 when
the scorer could see the strip it calibrated on, versus 0.620 leave-one-strip-
out. Within-strip evaluation manufactures a spatial confound that grouped
validation removes automatically.

Both effects initially produced the opposite conclusion — that DINOv2 was
ignoring the egg and tying with classical features. Neither survived correct
methodology.

---

## 6. El Salvador: resolution floor

Eggs are 1–3 px. The app's shipped detector cannot propose them at all
(`minArea: 20` exceeds a whole egg's area). With scale-adjusted params the
site yields only 331 proposals, of which 18 are labelled (11 egg, 2 cluster,
5 debris) — too few for a decision.

The actionable output is a capture spec: **eggs must span enough pixels for
shape to exist.** Portugal (~15 px) works; El Salvador as currently captured
does not. Nailing down the exact minimum needs a resolution sweep that has not
been run.

---

## 7. Limitations

- **11 Portugal debris examples.** The binding constraint on every number
  here. Eggs are plentiful (67); debris is not.
- **3 independent Portugal strips**, one site, one paper type, two sessions.
  Cross-strip generalisation is measured but thin.
- **Cross-*site* transfer was never run**, by design — the resolution gap
  between sites makes it uninterpretable.
- **Debris is not location-matched to eggs.** In two of three strips, labelled
  debris sits 1.4–1.6× farther from the egg cluster than eggs do. Leave-one-
  strip-out largely neutralises this, but a location-matched debris set would
  settle it directly. ~2,209 unlabelled Portugal proposals sit within 120 px
  of a known egg and are available for this.
- **`unsure` labels (13, all Portugal) were dropped**, not analysed.
- **No per-condition histogram figure was generated** (a stated deliverable).
  Numbers only, in `out/results.json`.

## 8. Next steps, in value order

1. **~60–80 location-matched debris labels.** Fixes the binding constraint and
   the one unresolved confound in a single sitting. Pre-commit to a decision
   rule before looking.
2. **Prototype the trained-head design.** Independent of which features win,
   and it improves both the accuracy and the user flow.
3. **Resolution sweep** — downsample Portugal strips progressively to find the
   px-per-egg floor. Turns §6 into a hard number.
4. **Re-derive the accuracy bar** from the counting workflow's actual needs.

---

## Repository

```
gate/config.py       site + strip manifest, detector params, sampling config
gate/pipeline.py     port of cv-pipeline.js; patch extraction; 8 classical features
gate/embed.py        DINOv2-small, frozen, CLS + mean-patch tokens
scripts/01_propose.py          proposal stage + overlays
scripts/02_make_triage.py      single-item labelling tool
scripts/02b_make_grid.py       grid labelling tool (much faster)
scripts/03_analyze.py          exemplar-similarity sweep + bootstrap AUROC
scripts/04_context_test.py     centre-mask leakage test
scripts/05_trained_classifier.py  leave-one-strip-out trained classifier
scripts/sweep_params.py        detector recall calibration
labels.json          109 labels
out/results.json     full condition sweep
```

Environment: Python 3.12 venv at `.venv`, CPU only.
Reproduce: `01 → 02b → (label) → 03 → 04 → 05`.
