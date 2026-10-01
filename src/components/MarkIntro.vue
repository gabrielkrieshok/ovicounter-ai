<script setup>
import { t } from '@/i18n'

/* Welcome's picture of the job: a strip of egg paper with the four marks on it,
 * each labelled in the mark key's own words.
 *
 * It tells the whole story on one strip. Most eggs are kept (green). One the
 * app found is still dashed blue — nobody has looked at it yet. A fibre of dirt
 * the app took for an egg has been removed (red ✕). An egg the app missed has
 * been added (pink +). And a clump of touching eggs sits in one dashed
 * outline with the number the person gave it (Oct 2026). That is the work the person is about to do.
 *
 * Drawn, not photographed. A crop of the demo photo would be 6.8MB that is
 * only cached on demand, and a drawing cannot be mistaken for the app's output
 * — this is an illustration of the mark language, not a count. The marks use
 * the same geometry as MarkLayer: a 2.5px ring over a white halo, dashed for
 * found, and the ✕ and + with the ring gone. The words are MarkKey's, so they
 * are translated already. They alternate above and below the strip so each
 * has half the width to itself, which keeps Spanish and Portuguese to two lines
 * without ever splitting a word. */

const W = 400
const TOP = 34 // room above the strip for the upper leader lines
const STRIP_H = 110
const H = TOP + STRIP_H + 34

/* The five marks at 1/10, 3/10, 5/10, 7/10 and 9/10 of the width. `up`
   marks are labelled above the strip, the others below. y is within the
   strip. */
const FEATURED = [
  { kind: 'found', x: 40, y: 40, angle: 28, up: true },
  { kind: 'kept', x: 120, y: 72, angle: -35, up: false },
  { kind: 'clump', x: 200, y: 60, up: true, clear: 36 },
  { kind: 'removed', x: 280, y: 70, up: false },
  { kind: 'added', x: 360, y: 40, angle: 62, up: true },
]
const of = (kind) => at.find((f) => f.kind === kind)

/* The clump: four eggs lying across each other, in one outline — answered,
   as the person leaves it: "4", solid green (Gabriel, Oct 2026: concrete, not
   the app's range). */
const CLUMP_EGGS = [
  [-7, 2, 65], [-2, -2, 40], [3, 2, 80], [8, -1, 55],
]

/* The rest of the eggs: a fixed scatter from a seeded generator, so the
   picture is the same on every device and every load. Kept clear of the
   featured marks and of the lane each leader line runs down. */
function scatter() {
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const eggs = []
  let guard = 0
  while (eggs.length < 24 && guard++ < 4000) {
    const x = 14 + rand() * (W - 28)
    const y = 14 + rand() * (STRIP_H - 28)
    const clear = FEATURED.every(
      (f) =>
        Math.hypot(f.x - x, f.y - y) > (f.clear ?? 30) &&
        !(Math.abs(f.x - x) < 17 && (f.up ? y < f.y : y > f.y)) &&
        // the clump's tag, up and to its right
        !(f.kind === 'clump' && x > f.x + 4 && x < f.x + 44 && y > f.y - 34 && y < f.y),
    )
    const spaced = eggs.every((e) => Math.hypot(e.x - x, e.y - y) > 26)
    if (clear && spaced) eggs.push({ x, y, angle: Math.round(rand() * 180) })
  }
  return eggs
}
const eggs = scatter()

/* A few specks of paper grain, which is what makes it read as paper. */
const specks = [
  [34, 88], [96, 20], [128, 96], [188, 32], [214, 84], [296, 22], [318, 92], [378, 30],
]

const R = 10 // ring radius, in viewBox units

/* Feature positions in the whole picture's coordinates. */
const at = FEATURED.map((f) => ({ ...f, y: f.y + TOP }))
const egg = (e) => ({ ...e, y: e.y + TOP })
</script>

<template>
  <figure class="intro-figure">
    <figcaption class="labels top">
      <span class="label t-label found">{{ t('markKey.found') }}</span>
      <span class="label t-label clump">{{ t('markKey.clump') }}</span>
      <span class="label t-label added">{{ t('markKey.added') }}</span>
    </figcaption>

    <svg class="art" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <!-- The paper -->
      <rect x="1.5" :y="TOP + 1.5" :width="W - 3" :height="STRIP_H - 3" class="paper" />
      <circle v-for="([x, y], i) in specks" :key="`s${i}`" :cx="x" :cy="y + TOP" r="0.9" class="speck" />

      <!-- Leader lines, under the marks, each ending in a small square at the
           edge its label sits on. -->
      <g v-for="f in at" :key="`l${f.kind}`">
        <line :x1="f.x" :y1="f.up ? f.y - (f.kind === 'clump' ? 13 : R + 3) : f.y + R + 3" :x2="f.x" :y2="f.up ? 3 : H - 3" class="leader" />
        <rect :x="f.x - 2.5" :y="f.up ? 0 : H - 5" width="5" height="5" class="leader-end" />
      </g>

      <!-- Eggs the person kept -->
      <g v-for="(e, i) in eggs.map(egg)" :key="`e${i}`">
        <ellipse :cx="e.x" :cy="e.y" rx="5.5" ry="2.1" :transform="`rotate(${e.angle} ${e.x} ${e.y})`" class="egg" />
        <circle :cx="e.x" :cy="e.y" :r="R" class="halo" />
        <circle :cx="e.x" :cy="e.y" :r="R" class="ring kept" />
      </g>

      <!-- found by the app: an egg under a dashed blue ring -->
      <ellipse :cx="of('found').x" :cy="of('found').y" rx="5.5" ry="2.1" :transform="`rotate(${of('found').angle} ${of('found').x} ${of('found').y})`" class="egg" />
      <circle :cx="of('found').x" :cy="of('found').y" :r="R" class="halo" />
      <circle :cx="of('found').x" :cy="of('found').y" :r="R" class="ring found" />

      <!-- you kept it -->
      <ellipse :cx="of('kept').x" :cy="of('kept').y" rx="5.5" ry="2.1" :transform="`rotate(${of('kept').angle} ${of('kept').x} ${of('kept').y})`" class="egg" />
      <circle :cx="of('kept').x" :cy="of('kept').y" :r="R" class="halo" />
      <circle :cx="of('kept').x" :cy="of('kept').y" :r="R" class="ring kept" />

      <!-- a clump: touching eggs in one outline, a dot each, and the number
           the person gave it -->
      <g :transform="`translate(${of('clump').x} ${of('clump').y})`">
        <ellipse v-for="([x, y, a], i) in CLUMP_EGGS" :key="`c${i}`" :cx="x" :cy="y" rx="5.5" ry="2.3" :transform="`rotate(${a} ${x} ${y})`" class="egg" />
        <circle v-for="([x, y], i) in CLUMP_EGGS" :key="`d${i}`" :cx="x" :cy="y" r="1.7" class="dot" />
        <ellipse cx="0" cy="0" rx="17" ry="10" transform="rotate(-6)" class="halo" />
        <ellipse cx="0" cy="0" rx="17" ry="10" transform="rotate(-6)" class="ring kept clump-ring" />
        <rect x="13" y="-21" width="15" height="13" class="tag" />
        <text x="20.5" y="-11.5" class="tag-text">4</text>
      </g>

      <!-- you removed it: a fibre of dirt, not an egg, with only the ✕ left -->
      <path :d="`M ${of('removed').x - 6} ${of('removed').y + 3} q 4 -7 8 -3 t 5 -4`" class="fibre" />
      <g :transform="`translate(${of('removed').x} ${of('removed').y})`">
        <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" class="glyph-halo" />
        <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" class="glyph removed" />
      </g>

      <!-- you added one: an egg the app missed -->
      <ellipse :cx="of('added').x" :cy="of('added').y" rx="5.5" ry="2.1" :transform="`rotate(${of('added').angle} ${of('added').x} ${of('added').y})`" class="egg" />
      <g :transform="`translate(${of('added').x} ${of('added').y})`">
        <path d="M 0 -8 L 0 8 M -8 0 L 8 0" class="glyph-halo" />
        <path d="M 0 -8 L 0 8 M -8 0 L 8 0" class="glyph added" />
      </g>
    </svg>

    <figcaption class="labels bottom">
      <span class="label t-label kept">{{ t('markKey.kept') }}</span>
      <span class="label t-label removed">{{ t('markKey.removed') }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.intro-figure {
  margin: 0;
}
.art {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.paper {
  fill: var(--panel);
  stroke: var(--ink);
  stroke-width: 3;
}
.speck {
  fill: var(--muted);
}
.egg {
  fill: var(--ink);
}
.fibre {
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
}

.leader {
  stroke: var(--ink);
  stroke-width: 1.5;
}
.leader-end {
  fill: var(--ink);
}

.halo {
  fill: none;
  stroke: var(--paper);
  stroke-opacity: 0.55;
  stroke-width: 4;
}
.ring {
  fill: none;
  stroke-width: 2.5;
}
.ring.kept { stroke: var(--green); }
.ring.found {
  stroke: var(--blue);
  stroke-dasharray: 4 3;
}
.clump-ring {
  stroke-width: 2;
}
.dot {
  fill: var(--green);
  stroke: var(--paper);
  stroke-width: 0.8;
}
.tag {
  fill: var(--paper);
  stroke: var(--green);
  stroke-width: 1.2;
}
.tag-text {
  font: 700 9px var(--font-mono);
  fill: var(--ink);
  text-anchor: middle;
}

.glyph-halo {
  fill: none;
  stroke: var(--paper);
  stroke-opacity: 0.8;
  stroke-width: 5.5;
  stroke-linecap: square;
}
.glyph {
  fill: none;
  stroke-width: 2.8;
  stroke-linecap: square;
}
.glyph.removed { stroke: var(--red); }
.glyph.added { stroke: var(--pink); }

/* Ten columns of 1/10 each, so a label can be placed against its leader
   line: above, found starts at the left edge over 1/10, the clump is centred
   on 5/10 and added ends at the right edge over 9/10; below, kept is centred
   on 3/10 and removed on 7/10. Neighbours in a row never overlap, and each
   has at least 3/10 of the width. */
.labels {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  column-gap: var(--sp-12);
  align-items: end;
}
.labels.bottom {
  align-items: start;
}
.label {
  color: var(--ink);
}
.label.found { grid-column: 1 / 4; text-align: left; }
.label.clump { grid-column: 4 / 8; text-align: center; }
.label.added { grid-column: 8 / 11; text-align: right; }
.label.kept { grid-column: 2 / 6; text-align: center; }
.label.removed { grid-column: 6 / 10; text-align: center; }
</style>
