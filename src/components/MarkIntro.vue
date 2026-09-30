<script setup>
import { t } from '@/i18n'

/* Welcome's picture of the job: a strip of egg paper with the four marks on it,
 * each labelled in the mark key's own words.
 *
 * It tells the whole story on one strip. Most eggs are kept (green). One the
 * app found is still dashed blue — nobody has looked at it yet. A fibre of dirt
 * the app took for an egg has been removed (red ✕). An egg the app missed has
 * been added (pink +). That is the work the person is about to do.
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

/* The four marks at 1/8, 3/8, 5/8 and 7/8 of the width. `up` marks are
   labelled above the strip, the others below. y is within the strip. */
const FEATURED = [
  { kind: 'found', x: 50, y: 40, angle: 28, up: true },
  { kind: 'kept', x: 150, y: 72, angle: -35, up: false },
  { kind: 'removed', x: 250, y: 38, up: true },
  { kind: 'added', x: 350, y: 70, angle: 62, up: false },
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
        Math.hypot(f.x - x, f.y - y) > 30 &&
        !(Math.abs(f.x - x) < 14 && (f.up ? y < f.y : y > f.y)),
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
      <span class="label t-label removed">{{ t('markKey.removed') }}</span>
    </figcaption>

    <svg class="art" :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <!-- The paper -->
      <rect x="1.5" :y="TOP + 1.5" :width="W - 3" :height="STRIP_H - 3" class="paper" />
      <circle v-for="([x, y], i) in specks" :key="`s${i}`" :cx="x" :cy="y + TOP" r="0.9" class="speck" />

      <!-- Leader lines, under the marks, each ending in a small square at the
           edge its label sits on. -->
      <g v-for="f in at" :key="`l${f.kind}`">
        <line :x1="f.x" :y1="f.up ? f.y - R - 3 : f.y + R + 3" :x2="f.x" :y2="f.up ? 3 : H - 3" class="leader" />
        <rect :x="f.x - 2.5" :y="f.up ? 0 : H - 5" width="5" height="5" class="leader-end" />
      </g>

      <!-- Eggs the person kept -->
      <g v-for="(e, i) in eggs.map(egg)" :key="`e${i}`">
        <ellipse :cx="e.x" :cy="e.y" rx="5.5" ry="2.1" :transform="`rotate(${e.angle} ${e.x} ${e.y})`" class="egg" />
        <circle :cx="e.x" :cy="e.y" :r="R" class="halo" />
        <circle :cx="e.x" :cy="e.y" :r="R" class="ring kept" />
      </g>

      <!-- found by the app: an egg under a dashed blue ring -->
      <ellipse :cx="at[0].x" :cy="at[0].y" rx="5.5" ry="2.1" :transform="`rotate(${at[0].angle} ${at[0].x} ${at[0].y})`" class="egg" />
      <circle :cx="at[0].x" :cy="at[0].y" :r="R" class="halo" />
      <circle :cx="at[0].x" :cy="at[0].y" :r="R" class="ring found" />

      <!-- you kept it -->
      <ellipse :cx="at[1].x" :cy="at[1].y" rx="5.5" ry="2.1" :transform="`rotate(${at[1].angle} ${at[1].x} ${at[1].y})`" class="egg" />
      <circle :cx="at[1].x" :cy="at[1].y" :r="R" class="halo" />
      <circle :cx="at[1].x" :cy="at[1].y" :r="R" class="ring kept" />

      <!-- you removed it: a fibre of dirt, not an egg, with only the ✕ left -->
      <path :d="`M ${at[2].x - 6} ${at[2].y + 3} q 4 -7 8 -3 t 5 -4`" class="fibre" />
      <g :transform="`translate(${at[2].x} ${at[2].y})`">
        <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" class="glyph-halo" />
        <path d="M -6 -6 L 6 6 M 6 -6 L -6 6" class="glyph removed" />
      </g>

      <!-- you added one: an egg the app missed -->
      <ellipse :cx="at[3].x" :cy="at[3].y" rx="5.5" ry="2.1" :transform="`rotate(${at[3].angle} ${at[3].x} ${at[3].y})`" class="egg" />
      <g :transform="`translate(${at[3].x} ${at[3].y})`">
        <path d="M 0 -8 L 0 8 M -8 0 L 8 0" class="glyph-halo" />
        <path d="M 0 -8 L 0 8 M -8 0 L 8 0" class="glyph added" />
      </g>
    </svg>

    <figcaption class="labels bottom">
      <span class="label t-label kept">{{ t('markKey.kept') }}</span>
      <span class="label t-label added">{{ t('markKey.added') }}</span>
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

/* Eight columns of 1/8 each, so a label can be placed against its leader
   line: found starts at the left edge over the line at 1/8; removed is
   centred on 5/8; kept is centred on 3/8; added ends at the right edge under
   the line at 7/8. Neighbours in a row never overlap, and each has at least
   3/8 of the width — room for Portuguese "acrescentada" without a split. */
.labels {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  align-items: end;
}
.labels.bottom {
  align-items: start;
}
.label {
  color: var(--ink);
}
.label.found { grid-column: 1 / 4; text-align: left; }
.label.removed { grid-column: 4 / 8; text-align: center; }
.label.kept { grid-column: 2 / 6; text-align: center; }
.label.added { grid-column: 6 / 9; text-align: right; }
</style>
