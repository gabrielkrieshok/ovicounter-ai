/* Walk both paths through the app in a real browser and screenshot each screen.
 *
 *   node tools/walk-flow.mjs [--port=5199] [--out=tools/shots] [--width=900 --height=900] [--frame=0|1]
 *
 * Below 1000px wide the phone frame is kept (`?frame=1`) so screens can be
 * checked against the hi-fi; at 1440 the laptop layout is walked and the
 * photograph's share of the viewport is measured on Measure and Manually refine.
 *
 * What it walks, the way a technician would, reporting any console error:
 *
 *   1. THE DEMO — a quick count on the bundled strip. Crop → Processing → Your
 *      fixes (Measure's sliders are one link away and are visited), gestures,
 *      Done, result.
 *      Then Home — a demo's result offers nothing else. Must reach a result with zero
 *      calibration taps and a machine total in 330–400, and must write nothing.
 *   2. A SESSION — "Start a new session", the demo strip fed through the gallery
 *      picker, two strips, calibration carried forward, summary. Must write
 *      one session and two strips.
 *   3. THE CORRECTION PATH — Measure → Mark one egg, one tap, back to Measure.
 *   4. THE UNTOUCHED PASS — demo straight through with no gesture: five
 *      decisions (count a strip, which demo, Use this photo, Continue past
 *      Measure, Done), and the result must show a machine count, not a human
 *      one.
 *   5. THE CAPTURE PATH — the fake camera's test pattern, which the gate must
 *      refuse.
 *
 * Screens that only ever get looked at in isolation hide the failures that
 * only happen in sequence — a stale canvas handed between two of them, a
 * worker still busy when the next screen asks it for something.
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEBUG_PORT = 9334
const DEMO_FILE = resolve('public/samples/test-strip.png')

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)
const port = args.port ?? '5199'
const outDir = args.out ?? 'tools/shots'
const width = Number(args.width ?? 900)
const height = Number(args.height ?? 900)
const framed = args.frame !== undefined ? args.frame !== '0' : width < 1000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-device-scale-factor=1',
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--remote-allow-origins=*',
  '--user-data-dir=/tmp/ovicounter-walk-profile',
  'about:blank',
])
chrome.stderr.on('data', () => {})

async function waitForDevTools() {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(`http://localhost:${DEBUG_PORT}/json/version`)).ok) return
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('DevTools never came up')
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.onopen = () => resolve(ws)
    ws.onerror = () => reject(new Error('websocket failed'))
  })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  await waitForDevTools()

  const target = `http://localhost:${port}/${framed ? '?frame=1' : ''}`
  console.log(`${width}×${height}, ${framed ? 'phone frame' : 'no frame'}`)
  const page = await fetch(
    `http://localhost:${DEBUG_PORT}/json/new?${encodeURIComponent(target)}`,
    { method: 'PUT' },
  ).then((r) => r.json())

  const ws = await connect(page.webSocketDebuggerUrl)
  let nextId = 0
  const pending = new Map()
  const problems = []
  const failures = []

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      problems.push(`EXCEPTION: ${d.exception?.description ?? d.text}`)
      return
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      problems.push(`CONSOLE: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`)
      return
    }
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(msg.error.message))
    else entry.resolve(msg.result)
  }

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  await send('Runtime.enable')
  await send('Page.enable')
  await send('DOM.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 500,
  })

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'eval failed')
    return result.value
  }

  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(`${outDir}/${name}.png`, Buffer.from(data, 'base64'))
    console.log(`  → ${outDir}/${name}.png`)
  }

  /* A check that prints its verdict and is remembered for the exit code. */
  const check = (label, ok) => {
    console.log(`  ${label} ${ok ? '✓' : '✗'}`)
    if (!ok) failures.push(label)
    return ok
  }

  /* Clicking by visible text keeps this readable, and means the walk breaks
     loudly if a ratified label ever changes. */
  const clickText = (text) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim().includes(${JSON.stringify(text)}));
      if (!el) return 'NOT FOUND: ' + ${JSON.stringify(text)};
      el.click();
      return 'ok';
    })()`)

  const route = () => evaluate('location.hash')

  /* Files the app saves (lib/export.js) are caught in the page instead of
     downloaded: the blob handed to an <a download> is kept and read back. */
  const captureSaves = () =>
    evaluate(`(() => {
      if (window.__saved) return 'already';
      window.__saved = [];
      const make = URL.createObjectURL;
      URL.createObjectURL = (blob) => { window.__saved.push(blob); return make(blob); };
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { if (!this.download) click.call(this); };
      return 'ok';
    })()`)
  const lastSaved = () => evaluate(`window.__saved.length ? window.__saved.at(-1).text() : Promise.resolve('')`)

  /* "Try it with a demo photo" opens a choice of three demos (Oct 2026); the
     walk always takes the clean strip, which the counts below are measured on. */
  const startDemo = async () => {
    const opened = await clickText('Count a single paper strip')
    await sleep(300)
    return `${opened} → ${await clickText('A clean strip')}`
  }

  /* Measure stops on its last picture and waits for "Continue to …" (Oct
     2026). Waiting for a route beyond it presses that bar when it appears —
     one decision, counted by the untouched pass below. */
  let continues = 0
  const waitForRoute = async (hashes, ms = 15000) => {
    const wanted = [].concat(hashes)
    const until = Date.now() + ms
    while (Date.now() < until) {
      const h = await route()
      if (wanted.includes(h)) return h
      if (h.startsWith('#/processing') && !wanted.some((w) => w.startsWith('#/processing'))) {
        const pressed = await evaluate(`(() => { const b = document.querySelector('.processing .footer button'); if (!b) return false; b.click(); return true })()`)
        if (pressed) continues++
      }
      await sleep(250)
    }
    return null
  }

  /* The gallery picker, fed the demo strip. This is the only way a headless
     run can put a real photograph through a real session. */
  const pickDemoFile = async () => {
    const { root } = await send('DOM.getDocument')
    const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input.file' })
    if (!nodeId) return 'no file input'
    await send('DOM.setFileInputFiles', { nodeId, files: [DEMO_FILE] })
    return 'ok'
  }

  /* How much of the viewport the photograph takes. On Refine the ImageStage
     canvas IS the photograph's box; on Your fixes the ZoomPanStage canvas is
     the stage, and a wide strip at contain fit spans its full width. */
  const photoShare = async (selector) => {
    const m = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), pct: Math.round(100 * r.width / innerWidth),
               wide: !!document.querySelector('.device.wide') };
    })()`)
    if (!m) return console.log('  photo: not found')
    const line = `photo ${m.w}×${m.h} = ${m.pct}% of ${width}px${m.wide ? ' (laptop layout)' : ' (framed)'}`
    if (m.wide) check(`${line} ≥60%`, m.pct >= 60)
    else console.log(`  ${line}`)
  }

  const dbCounts = () => evaluate(`(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('ovicounter', 1);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      r.onupgradeneeded = () => {};
    });
    const all = (name) => new Promise((res, rej) => {
      const q = db.transaction(name, 'readonly').objectStore(name).getAll();
      q.onsuccess = () => res(q.result.length); q.onerror = () => rej(q.error);
    });
    return { sessions: await all('sessions'), strips: await all('strips') };
  })()`)

  const readResult = () => evaluate(`(() => ({
    machine: document.querySelector('.machine')?.textContent.trim(),
    machineStyled: !!document.querySelector('.scale.machine'),
    count: document.querySelector('.count')?.textContent.trim(),
    band: document.querySelector('.label.active')?.textContent.trim(),
    sentence: document.querySelector('.sentence')?.textContent.replace(/\\s+/g, ' ').trim(),
    legend: [...document.querySelectorAll('.legend .item')]
      .map(e => e.textContent.trim()).join(' · '),
    buttons: [...document.querySelectorAll('.footer button')].map(b => b.textContent.trim()).join(' / '),
    saved: document.querySelector('.saved')?.textContent.trim(),
  }))()`)

  /* Crop → Processing → the marks. The probe (src/cv/probe.js) calibrates the
     strip with no tap, so this must not land on Mark one egg; if it does, the
     probe returned null on the one strip it is guaranteed to read, and the
     walk taps instead so the rest can still be checked. Returns the tap count. */
  const useThisPhoto = async (expectAfter) => {
    console.log(`  click "Use this photo" → ${await clickText('Use this photo')}`)
    const landed = await waitForRoute(['#/processing', '#/calibrate', ...expectAfter], 12000)
    if (landed === '#/calibrate') {
      console.log('Mark one egg (#/calibrate) — PROBE FAILED, tapping instead')
      failures.push('probe returned null on the demo strip')
      await sleep(1500)
      await shot('flow-3-calibrate-empty')
      const taps = await tapForCalibration()
      await shot('flow-4-calibrate-marked')
      console.log(`  click "Looks right" → ${await clickText('Looks right')}`)
      await waitForRoute(expectAfter, 12000)
      return taps
    }
    console.log(`Processing (${landed}) — calibrated by the probe, zero taps`)
    const after = await waitForRoute(expectAfter, 12000)
    console.log(`  → ${after ?? 'NEVER ARRIVED at ' + expectAfter.join('/')}`)
    return 0
  }

  async function tapForCalibration() {
    /* Tap an egg, and judge the tap the way the screen asks the operator to.
     * A tap can miss (bare paper, refused outright) or land on a CLUMP, which
     * is worse because it succeeds: every size-dependent parameter scales off
     * it and the scan quietly rejects every single egg as too small. The echo
     * — "Found N more the same size" — is what catches it, so this walks
     * candidate taps and keeps the best echo, as "Pick another" would.
     * `--good=99999` makes every candidate report, which is how the spread
     * across taps was measured (434 vs 1,192 on the same strip). */
    const tap = await evaluate(`(async () => {
      const GOOD_ECHO = ${Number(args.good ?? 250)};
      const stage = document.querySelector('.stage-wrap');
      if (!stage) return { note: 'no stage' };
      const r = stage.getBoundingClientRect();
      const frame = () => new Promise(res =>
        requestAnimationFrame(() => requestAnimationFrame(res)));
      const echo = () => {
        const el = document.querySelector('.echo-count');
        return el ? parseInt(el.textContent, 10) : null;
      };
      const attempts = [];
      let best = null;
      for (let gy = 0.15; gy <= 0.9; gy += 0.1) {
        for (let gx = 0.15; gx <= 0.9; gx += 0.1) {
          const x = r.left + r.width * gx, y = r.top + r.height * gy;
          for (const type of ['pointerdown','pointerup']) {
            stage.dispatchEvent(new PointerEvent(type, {
              clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
            }));
          }
          await frame(); await frame();
          for (let w = 0; w < 40 && echo() === null; w++) await frame();
          const n = echo();
          if (n !== null) {
            attempts.push(gx.toFixed(2) + ',' + gy.toFixed(2) + ' → ' + n);
            if (!best || n > best.n) best = { n, gx, gy };
            if (n >= GOOD_ECHO) return { attempts, best, note: 'good echo, kept' };
          }
        }
      }
      if (best) {
        const x = r.left + r.width * best.gx, y = r.top + r.height * best.gy;
        for (const type of ['pointerdown','pointerup']) {
          stage.dispatchEvent(new PointerEvent(type, {
            clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
          }));
        }
        await frame(); await frame();
      }
      return { attempts, best, note: 'settled on best' };
    })()`)
    console.log(`  taps: ${(tap.attempts ?? []).join('  |  ')}`)
    console.log(`  ${tap.note}${tap.best ? ` — kept echo ${tap.best.n}` : ''}`)
    await sleep(2000)
    return (tap.attempts ?? []).length || 1
  }

  /* Exercise the gestures rather than just photographing the screen. Each one
     reports what the operator can see change: the undo button's state. */
  const exerciseGestures = async () => {
    /* The nudge toward Measure after a run of fixes, pictured, then undone. */
    await evaluate(`(async () => {
      const stage = document.querySelector('.stage-wrap .stage');
      const r = stage.getBoundingClientRect();
      const send = (type, x) => stage.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: r.top + r.height * 0.5, bubbles: true, pointerId: 1, isPrimary: true }));
      send('pointerdown', r.left + r.width * 0.3);
      for (let i = 1; i <= 6; i++) send('pointermove', r.left + r.width * (0.3 + i * 0.05));
      send('pointerup', r.left + r.width * 0.6);
      await new Promise(res => setTimeout(res, 300));
    })()`)
    await shot('flow-7b-fixes-nudge')
    await evaluate(`(async () => {
      const undo = document.querySelector('.undo');
      let g = 0; while (!undo.disabled && g++ < 50) { undo.click(); await new Promise(res => setTimeout(res, 30)); }
    })()`)
    const gestures = await evaluate(`(async () => {
      const stage = document.querySelector('.stage-wrap .stage');
      const r = stage.getBoundingClientRect();
      const frame = () => new Promise(res =>
        requestAnimationFrame(() => requestAnimationFrame(res)));
      const settle = async (n = 8) => { for (let i = 0; i < n; i++) await frame(); };
      const log = [];
      const send = (type, x, y, id = 1, extra = {}) =>
        stage.dispatchEvent(new PointerEvent(type, {
          clientX: x, clientY: y, bubbles: true, pointerId: id, isPrimary: id === 1, ...extra,
        }));
      const undoEnabled = () => !document.querySelector('.undo').disabled;

      const pick = async (key) => { document.querySelector('.tool.' + key).click(); await settle(2); };
      const clear = async () => { let g = 0; while (undoEnabled() && g++ < 50) { document.querySelector('.undo').click(); await settle(2); } };
      const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.5;
      const sweep = async (x0, y, len) => {
        send('pointerdown', x0, y);
        for (let i = 1; i <= 10; i++) { send('pointermove', x0 + (i * len) / 10, y); await frame(); }
        send('pointerup', x0 + len, y);
        await settle();
      };

      // 1. The tools: four, Remove chosen.
      const tools = [...document.querySelectorAll('.tool')].map(b => b.getAttribute('aria-checked') === 'true' ? '[' + b.innerText.trim() + ']' : b.innerText.trim());
      log.push('tools ' + tools.join(' · ').replace(/\\n/g, ' '));

      // 2. Remove: paint across the middle — one stroke, one undo. A wide
      //    sweep removes enough marks for the nudge toward Measure.
      await sweep(r.left + r.width * 0.1, cy, r.width * 0.8);
      log.push('remove sweep → undo ' + (undoEnabled() ? 'enabled' : 'still disabled (no mark under it)') +
        ', nudge ' + (document.querySelector('.nudge') ? 'shown' : 'not shown') +
        ' (' + document.querySelector('.nudge p')?.textContent.trim().split('.')[0] + ')');
      document.querySelector('.undo').click(); await settle(2);
      log.push('one undo → ' + (undoEnabled() ? 'STILL ENABLED (stroke was not one step)' : 'history empty'));

      // 3. Keep: the same sweep marks them kept.
      await pick('keep');
      await sweep(r.left + r.width * 0.3, cy, r.width * 0.4);
      log.push('keep sweep → undo ' + (undoEnabled() ? 'enabled' : 'disabled'));
      await clear();

      // 4. Add: the close-up shows on touch, the egg lands on release.
      await pick('add');
      const hx = r.left + r.width * 0.3, hy = r.top + r.height * 0.5;
      send('pointerdown', hx, hy);
      await settle(2);
      const loupe = !!document.querySelector('.loupe');
      send('pointerup', hx, hy);
      await settle();
      log.push('add → loupe ' + (loupe ? 'shown' : 'MISSING') + ', undo ' + (undoEnabled() ? 'enabled' : 'disabled') +
        '');
      await pick('remove');

      // 4. Pinch to zoom with two fingers.
      const m = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
      send('pointerdown', m.x - 40, m.y, 1);
      send('pointerdown', m.x + 40, m.y, 2);
      await frame();
      send('pointermove', m.x - 120, m.y, 1);
      send('pointermove', m.x + 120, m.y, 2);
      await settle(4);
      send('pointerup', m.x - 120, m.y, 1);
      send('pointerup', m.x + 120, m.y, 2);
      await settle();
      log.push('pinch → dispatched');

      // 6. Middle-click drag pans, and paints nothing.
      await clear();
      const box = () => document.querySelector('.band .viewport, .minimap .viewport, .viewport')?.getAttribute('style') ?? '';
      const was = box();
      send('pointerdown', cx, cy, 1, { button: 1, buttons: 4, pointerType: 'mouse' });
      for (let i = 1; i <= 6; i++) { send('pointermove', cx + i * 15, cy, 1, { buttons: 4, pointerType: 'mouse' }); await frame(); }
      send('pointerup', cx + 90, cy, 1, { button: 1, pointerType: 'mouse' });
      await settle();
      log.push('middle drag → ' + (undoEnabled() ? 'PAINTED' : 'painted nothing') + ', view ' + (box() !== was ? 'moved' : 'unchanged'));
      return log;
    })()`)
    for (const line of gestures) console.log(`  ${line}`)
    await shot('flow-8-fixes-zoomed')

    /* +1 on a clump with Add (Oct 2026; it replaced Split): bring a clump on
       screen through the clump pass, leave the pass, choose Add — which can
       move the stage, its hint being longer — and only then find where the
       clump is and touch it. A clump at the strip's edge cannot be centred,
       so its position is read, not assumed. */
    const more = await evaluate(`(async () => {
      const stage = document.querySelector('.stage-wrap .stage');
      const frame = () => new Promise(res =>
        requestAnimationFrame(() => requestAnimationFrame(res)));
      const settle = async (n = 8) => { for (let i = 0; i < n; i++) await frame(); };
      const send = (type, x, y) =>
        stage.dispatchEvent(new PointerEvent(type, {
          clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
        }));
      const strip = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('strip');
      const undo = document.querySelector('.undo');
      let guard = 0;
      while (!undo.disabled && guard++ < 50) { undo.click(); await frame(); }
      const tallyClumps = () => {
        const cell = [...document.querySelectorAll('.tally .cell')].find(c => /clumps/i.test(c.textContent));
        return cell ? Number(cell.querySelector('.n').textContent) : NaN;
      };
      const before = tallyClumps();
      document.querySelector('.clumps-open').click(); await settle(12);
      const target = document.querySelector('.clump-head .t-label') && strip.clumps.find(c => !c.checked && Math.abs(c.byArea - (c.found ?? c.watershed)) === Math.max(...strip.clumps.map(k => Math.abs(k.byArea - (k.found ?? k.watershed)))));
      document.querySelector('.clump-exit').click(); await settle();
      document.querySelector('.tool.add').click(); await settle(4);
      const rr = stage.__vueParentComponent.exposed.rect.value;
      const b = stage.getBoundingClientRect();
      const x = b.left + rr.left + target.cx * rr.width, y = b.top + rr.top + target.cy * rr.height;
      send('pointerdown', x, y); await settle(2); send('pointerup', x, y); await settle();
      const after = tallyClumps();
      document.querySelector('.undo').click(); await settle();
      const undone = tallyClumps();
      document.querySelector('.tool.remove').click();
      return { before, after, undone, tools: document.querySelectorAll('.tool').length };
    })()`)
    console.log(`  +1 on a clump: clumps checked ${more.before} → ${more.after}, undo → ${more.undone}`)
    check('Add on a clump counts as checking it (+1)', more.after === more.before + 1 && more.undone === more.before)
    check(`no Split tool (${more.tools - 1} tools and Undo)`, more.tools === 4)
    await shot('flow-9-fixes-more')

    /* +1 on a single egg's mark: it becomes a clump of two. The mark is found
       through the dev build's store and the stage's exposed rect, and then
       touched like any other. */
    const single = await evaluate(`(async () => {
      const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      const settle = async (n = 8) => { for (let i = 0; i < n; i++) await frame(); };
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
      const strip = pinia._s.get('strip');
      const el = document.querySelector('.stage-wrap .stage');
      const onScreen = (m) => {
        const rect = el.__vueParentComponent.exposed.rect.value;
        const box = el.getBoundingClientRect();
        const x = rect.left + m.x * rect.width, y = rect.top + m.y * rect.height;
        return x > 30 && x < box.width - 30 && y > 30 && y < box.height - 30 ? { x: box.left + x, y: box.top + y } : null;
      };
      document.querySelector('.tool.add').click(); await settle(4);
      const mark = strip.marks.find(m => m.clump === undefined && m.source === 'machine' && m.status !== 'removed' && onScreen(m));
      if (!mark) return { error: 'no single mark on screen' };
      const at = onScreen(mark);
      const clumps = strip.clumps.length, marks = strip.marks.length;
      const send = (type) => el.dispatchEvent(new PointerEvent(type, { clientX: at.x, clientY: at.y, bubbles: true, pointerId: 1, isPrimary: true }));
      send('pointerdown'); await settle(2); send('pointerup'); await settle();
      const made = strip.clumps[strip.clumps.length - 1];
      const inIt = strip.marks.filter(m => m.clump === made?.id).length;
      const result = { clumps: strip.clumps.length - clumps, marks: strip.marks.length - marks, inIt, checked: made?.checked };
      document.querySelector('.undo').click(); await settle();
      result.undone = strip.clumps.length === clumps && strip.marks.length === marks && strip.marks.some(m => m.id === mark.id);
      document.querySelector('.tool.remove').click();
      return result;
    })()`)
    console.log(`  +1 on a single mark: ${single.error ?? `clumps +${single.clumps}, marks +${single.marks}, ${single.inIt} in it, checked ${single.checked}; undo restores ${single.undone}`}`)
    check('Add on a single mark makes a clump of two, and undo restores it', !single.error && single.clumps === 1 && single.marks === 1 && single.inIt === 2 && single.undone)

    /* The clump pass: open it, give one clump a number, accept the next. */
    const clumps = await evaluate(`(async () => {
      const settle = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); };
      const open = document.querySelector('.clumps-open');
      if (!open) return { error: 'no "Check the clumps" button' };
      const before = open.textContent.trim();
      open.click(); await settle();
      const head = () => document.querySelector('.clump-head .t-label')?.textContent.trim();
      const count = () => document.querySelector('.clump-count')?.textContent.trim();
      const first = { head: head(), count: count() };
      const plus = [...document.querySelectorAll('.stepper .step')].pop();
      plus.click(); await settle(); plus.click(); await settle();
      const set = count();
      return { before, first, set };
    })()`)
    console.log(`  clumps: ${clumps.error ?? `${clumps.before} → ${clumps.first.head}, app ${clumps.first.count} → set ${clumps.set}`}`)
    check('the clump pass opens on a clump with the app\'s number', !clumps.error && /^~\d+$/.test(clumps.first.count))
    check('+ twice gives the person\'s number, without ~', !clumps.error && /^\d+$/.test(clumps.set) && Number(clumps.set) === Number(clumps.first.count.slice(1)) + 2)
    await shot('flow-9b-fixes-clump')
    const clumpsAfter = await evaluate(`(async () => {
      const settle = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); };
      document.querySelector('.clump-next').click(); await settle();
      const head = document.querySelector('.clump-head .t-label')?.textContent.trim();
      document.querySelector('.clump-exit').click(); await settle();
      const open = document.querySelector('.clumps-open')?.textContent.trim();
      document.querySelector('.undo').click(); await settle();
      const undone = document.querySelector('.clumps-open')?.textContent.trim();
      return { head, open, undone };
    })()`)
    console.log(`  next → ${clumpsAfter.head}; back to tools → ${clumpsAfter.open}; undo → ${clumpsAfter.undone}`)
  }

  /* ------------------------------------------------------------------ */
  await sleep(1200)
  console.log('Welcome')
  await shot('flow-1-welcome')
  const before = await dbCounts()

  console.log('\n--- 1. the demo: a quick count ---')
  console.log(`  click "Try it with a demo photo" → ${await startDemo()}`)
  await sleep(3500) // the crop proposal needs OpenCV to finish loading
  console.log(`Crop (${await route()})`)
  await shot('flow-2-crop')
  const taps = await useThisPhoto(['#/fixes'])
  await shot('flow-5-processing')
  console.log(`Your fixes (${await route()})`)
  check('lands on Manually refine', (await route()) === '#/fixes')
  await shot('flow-7-fixes')
  await photoShare('.fixes .stage')

  console.log(`  click "Adjust them" → ${await clickText('Adjust them')}`)
  await sleep(2500)
  console.log(`Measure, looking back (${await route()})`)
  await shot('flow-6-refine')
  await photoShare('.processing .stage-wrap canvas.photo')
  /* Zoom on Measure: the + button zooms, the view holds across pictures, and
     a one-finger drag pans without flashing the photograph. */
  const measureZoom = await evaluate(`(async () => {
    const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const settle = async (n = 6) => { for (let i = 0; i < n; i++) await frame(); };
    const plus = [...document.querySelectorAll('.processing .stage-rail button')].pop();
    plus.click(); plus.click(); await settle();
    const canvas = document.querySelector('.processing canvas.photo');
    const badge = () => document.querySelector('.processing .buffer-badge')?.textContent.trim();
    const steps = [...document.querySelectorAll('.processing .rail-step')];
    const marksBefore = badge();
    steps[1].click(); await settle();
    const other = badge();
    steps[steps.length - 1].click(); await settle();
    const stage = document.querySelector('.processing .stage-wrap .stage');
    const r = stage.getBoundingClientRect();
    const send = (type, x, y) => stage.dispatchEvent(new PointerEvent(type, {
      clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true }));
    const before = badge();
    send('pointerdown', r.left + r.width / 2, r.top + r.height / 2);
    let flashed = false;
    for (let i = 1; i <= 8; i++) {
      send('pointermove', r.left + r.width / 2 - i * 10, r.top + r.height / 2);
      await frame();
      if (badge() !== before) flashed = true;
    }
    send('pointerup', r.left + r.width / 2 - 80, r.top + r.height / 2);
    await settle();
    return { pictures: marksBefore + ' → ' + other, flashed };
  })()`)
  console.log(`  zoom in, change picture: ${measureZoom.pictures}`)
  check('a drag on Measure pans without showing the photograph', !measureZoom.flashed)
  await shot('flow-6b-measure-zoomed')
  console.log(`  click "Continue to …" → ${await clickText('Continue to')}`)
  await sleep(1200)
  console.log(`Your fixes again (${await route()})`)
  await exerciseGestures()

  console.log(`  click "Done — count them" → ${await clickText('Done')}`)
  await sleep(1200)
  console.log(`Strip result (${await route()})`)
  await shot('flow-10-result')
  const numbers = await readResult()
  console.log(`  machine ${numbers.machine} → human ${numbers.count} (${numbers.band})`)
  console.log(`  ${numbers.sentence}`)
  console.log(`  ${numbers.legend}`)
  console.log(`  actions: ${numbers.buttons}`)
  check('reviewed strip shows a human count', !numbers.machineStyled)
  const machineTotal = parseInt(String(numbers.machine ?? '').replace(/[^0-9]/g, ''), 10)
  check(`calibration: ${taps} taps`, taps === 0)
  // 392 since Oct 2026, when clumps the watershed left in one piece began to be
  // counted by length (it was 364; neither is a hand count).
  check(`machine total ${machineTotal} in 340–430`, machineTotal >= 340 && machineTotal <= 430)

  /* The strip as a file. */
  await captureSaves()
  console.log(`  click "Save as a file (JSON)" → ${await clickText('Save as a file (JSON)')}`)
  await sleep(300)
  const stripJson = JSON.parse((await lastSaved()) || '{}')
  console.log(`  strip file: ${stripJson.format} v${stripJson.version}, count ${stripJson.strip?.count}, ${stripJson.strip?.marks?.length} marks, ${stripJson.strip?.clumps?.length} clumps`)
  check('the strip saves as an OvicounterAI strip file with its marks', stripJson.format === 'ovicounterai/strip' && stripJson.strip?.marks?.length > 300 && String(stripJson.strip?.count) === String(numbers.count))

  /* Settings: save them from the menu, open them back, refuse a stranger. */
  await evaluate(`document.querySelector('[aria-label="Menu"]').click()`)
  await sleep(300)
  console.log(`  menu → "Save settings" → ${await clickText('Save settings')}`)
  await sleep(300)
  await shot('flow-10b-menu-settings')
  const settingsText = await lastSaved()
  const settingsJson = JSON.parse(settingsText || '{}')
  console.log(`  settings file: ${settingsJson.format}, egg area ${settingsJson.settings?.calibration?.areaPx}, cutoff ${settingsJson.settings?.params?.contrastFloor}, ${settingsJson.settings?.bands?.length} bands (top max ${settingsJson.settings?.bands?.at(-1)?.max})`)
  check('settings save with the measured egg, the sliders and the bands', settingsJson.format === 'ovicounterai/settings' && settingsJson.settings?.calibration?.areaPx > 0 && Number.isFinite(settingsJson.settings?.params?.contrastFloor) && settingsJson.settings?.bands?.length === 4)
  const opened = await evaluate(`(async () => {
    const input = document.querySelector('.sheet input[type=file]');
    const open = async (text, name) => {
      const dt = new DataTransfer();
      dt.items.add(new File([text], name, { type: 'application/json' }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 200));
      return { note: document.querySelector('.settings-note')?.textContent.trim(), inUse: document.querySelector('.settings-in-use')?.textContent.trim() };
    };
    const bad = await open('{"format":"something-else"}', 'other.json');
    const good = await open(${JSON.stringify(settingsText)}, 'walk-settings.json');
    const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
    const settings = pinia._s.get('session').settings;
    const topBand = settings?.bands?.at(-1)?.max;
    [...document.querySelectorAll('.sheet button')].find(b => /Stop using/.test(b.textContent))?.click();
    await new Promise(r => setTimeout(r, 100));
    const after = pinia._s.get('session').settings;
    return { bad: bad.note, good: good.note, inUse: good.inUse, topBand: String(topBand), cleared: after === null };
  })()`)
  console.log(`  open a stranger → "${opened.bad}"`)
  console.log(`  open them back → "${opened.good}" / "${opened.inUse}" (top band max ${opened.topBand})`)
  check('a file that is not settings is refused', /not OvicounterAI settings/.test(opened.bad ?? ''))
  check('settings open back, open-ended band intact, and stop cleanly', /walk-settings\.json/.test(opened.inUse ?? '') && opened.topBand === 'Infinity' && opened.cleared)
  await clickText('Close')
  await sleep(300)

  check(`a demo's result offers only Home (${numbers.buttons})`, numbers.buttons === 'Home')
  console.log(`  click "Home" → ${await clickText('Home')}`)
  await sleep(800)
  check(`back on Welcome (${await route()})`, (await route()) === '#/')
  const afterDemo = await dbCounts()
  check(
    `demo wrote ${afterDemo.sessions - before.sessions} sessions / ${afterDemo.strips - before.strips} strips — promise held`,
    afterDemo.sessions === before.sessions && afterDemo.strips === before.strips,
  )

  console.log('\n--- 2. a session: two strips through the gallery picker ---')
  /* Opened settings are used: a file with a different cutoff, then a real
     session — its first strip must count with that cutoff, not the probe's. */
  const tuned = { ...settingsJson, settings: { ...settingsJson.settings, params: { ...settingsJson.settings.params, contrastFloor: 120 } } }
  await evaluate(`document.querySelector('[aria-label="Menu"]').click()`)
  await sleep(300)
  await evaluate(`(async () => {
    const input = document.querySelector('.sheet input[type=file]');
    const dt = new DataTransfer();
    dt.items.add(new File([${JSON.stringify(JSON.stringify(tuned))}], 'tuned.json', { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 200));
  })()`)
  await clickText('Close')
  await sleep(300)
  console.log(`  click "Start a session" → ${await clickText('Start a session')}`)
  await sleep(1500)
  console.log(`Capture (${await route()})`)
  console.log(`  pick demo strip from gallery → ${await pickDemoFile()}`)
  console.log(`  → ${await waitForRoute(['#/crop', '#/refusal'], 15000)}`)
  await sleep(3000)
  await useThisPhoto(['#/fixes'])
  await sleep(600)
  check('session goes from Measure to Manually refine', (await route()) === '#/fixes')
  const usedCutoff = await evaluate(`document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('strip').params.contrastFloor`)
  check(`strip 1 counted with the opened settings' cutoff (${usedCutoff})`, usedCutoff === 120)
  await evaluate(`document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('session').useSettings(null)`)
  await clickText('Done')
  await sleep(1500)
  const s1 = await readResult()
  console.log(`  strip 1: ${s1.sentence} · ${s1.buttons} · badge "${s1.saved}"`)
  await shot('flow-11-session-result')

  console.log(`  click "Next strip" → ${await clickText('Next strip')}`)
  await sleep(1500)
  console.log(`  pick demo strip from gallery → ${await pickDemoFile()}`)
  console.log(`  → ${await waitForRoute(['#/crop', '#/refusal'], 15000)}`)
  await sleep(3000)
  console.log(`  click "Use this photo" → ${await clickText('Use this photo')}`)
  const strip2 = await waitForRoute(['#/calibrate', '#/processing'], 15000)
  check(
    `strip 2 after crop (${strip2}) — calibration carried forward, Mark one egg skipped`,
    strip2 === '#/processing',
  )
  await waitForRoute(['#/fixes'], 15000)
  await sleep(800)
  await clickText('Done')
  await sleep(1500)
  console.log(`  click "End session" → ${await clickText('End session')}`)
  await sleep(900)
  console.log(`Session summary (${await route()})`)
  await shot('flow-12-summary')
  const receipt = await evaluate(`(() => ({
    figures: [...document.querySelectorAll('.figure')]
      .map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join(' · '),
    bands: [...document.querySelectorAll('.row')]
      .map(e => e.textContent.replace(/\\s+/g, ' ').trim()).join(' · '),
    saved: document.querySelector('.saved')?.textContent.replace(/\\s+/g, ' ').trim(),
  }))()`)
  console.log(`  ${receipt.figures}`)
  console.log(`  ${receipt.bands}`)
  console.log(`  ${receipt.saved}`)
  /* The session as files: a spreadsheet and everything. */
  await captureSaves()
  console.log(`  click "Save as a spreadsheet (CSV)" → ${await clickText('Save as a spreadsheet (CSV)')}`)
  await sleep(300)
  const csv = (await lastSaved()).trim().split('\n')
  console.log(`  csv: ${csv.length} lines — ${csv[0]} / ${csv[1]}`)
  check('the CSV has a header and one row per strip', csv.length === 3 && csv[0].startsWith('session,started,strip,count'))
  console.log(`  click "Save everything (JSON)" → ${await clickText('Save everything (JSON)')}`)
  await sleep(300)
  const sessionJson = JSON.parse((await lastSaved()) || '{}')
  check('the session file holds both strips with their marks', sessionJson.format === 'ovicounterai/session' && sessionJson.session?.strips?.length === 2 && sessionJson.session.strips.every(x => x.marks.length > 0))
  const afterSession = await dbCounts()
  check(
    `session wrote ${afterSession.sessions - afterDemo.sessions} session / ${afterSession.strips - afterDemo.strips} strips`,
    afterSession.sessions - afterDemo.sessions === 1 && afterSession.strips - afterDemo.strips === 2,
  )
  await clickText('Back to home')
  await sleep(800)

  console.log('\n--- 3. the correction path (Measure → Mark one egg) ---')
  await startDemo()
  await sleep(2500)
  await useThisPhoto(['#/fixes'])
  await clickText('Adjust them')
  await sleep(2500)
  console.log(`  click "Mark an egg" → ${await clickText('Mark an egg')}`)
  await sleep(600)
  console.log(`  Mark one egg (${await route()})`)
  const keep = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Keep the marks'));
    return b ? (b.disabled ? 'present but disabled' : 'present') : 'MISSING';
  })()`)
  check(`"Keep the marks" ${keep}`, keep === 'present')
  await shot('flow-15-correction-empty')
  const correction = await evaluate(`(async () => {
    const stage = document.querySelector('.stage-wrap');
    const r = stage.getBoundingClientRect();
    const frame = () => new Promise(res =>
      requestAnimationFrame(() => requestAnimationFrame(res)));
    const results = [];
    for (const [gx, gy] of [[0.5, 0.5], [0.3, 0.4], [0.7, 0.6]]) {
      const x = r.left + r.width * gx, y = r.top + r.height * gy;
      for (const type of ['pointerdown','pointerup']) {
        stage.dispatchEvent(new PointerEvent(type, {
          clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
        }));
      }
      for (let w = 0; w < 60; w++) {
        await frame();
        if (document.querySelector('.echo-count') || document.querySelector('.echo-text')) break;
      }
      const echo = document.querySelector('.echo-count')?.textContent ?? null;
      const warn = document.querySelector('.echo-warn')?.textContent.trim() ?? null;
      const missed = !echo && (document.querySelector('.echo-text')?.textContent ?? '');
      results.push({ at: gx + ',' + gy, echo, warn, missed: echo ? null : missed });
      if (echo) break;
    }
    return results;
  })()`)
  for (const c of correction) {
    console.log(`  tap ${c.at} → ${c.echo ? `echo ${c.echo}` : `missed: ${c.missed}`}${c.warn ? ` · flagged: "${c.warn}"` : ''}`)
  }
  await shot('flow-16-correction-tapped')
  console.log(`  click "Looks right" → ${await clickText('Looks right')}`)
  check('back on Measure with the tap calibration', (await waitForRoute('#/processing', 20000)) === '#/processing')
  await sleep(3200)
  await shot('flow-17-correction-refine')
  await waitForRoute(['#/fixes'], 15000)
  await sleep(800)
  await clickText('Done')
  await sleep(1200)
  await clickText('Home')
  await sleep(800)

  console.log('\n--- 4. the untouched pass: demo → Use this photo → Done ---')
  let decisions = 0
  await startDemo(); decisions += 2
  await sleep(2500)
  const continuesBefore = continues
  await clickText('Use this photo'); decisions++
  console.log(`  → ${await waitForRoute('#/fixes', 15000)}`)
  await sleep(600)
  decisions += continues - continuesBefore
  await clickText('Done'); decisions++
  await sleep(1200)
  const untouched = await readResult()
  console.log(`  ${untouched.sentence}`)
  console.log(`  count "${untouched.count}" · legend "${untouched.legend || '(none)'}"`)
  check(`result reached in ${decisions} decisions (≤5)`, decisions <= 5 && (await route()) === '#/result')
  check(
    'untouched strip → machine styling, no human count',
    untouched.machineStyled && /^~/.test(untouched.count ?? '') && !/checked by you/.test(untouched.sentence ?? ''),
  )
  await shot('flow-18-result-untouched')
  await clickText('Home')
  await sleep(800)

  console.log('\n--- 5. the capture path: the fake camera, refused ---')
  console.log(`  click "Count a single paper strip" → ${await clickText('Count a single paper strip')}`)
  await sleep(300)
  console.log(`  click "Use the camera" → ${await clickText('Use the camera')}`)
  await sleep(2500)
  console.log(`Capture (${await route()})`)
  await shot('flow-13-capture')
  const chips = await evaluate(`(() => [...document.querySelectorAll('.chip')]
    .map(c => c.textContent.trim() + (c.classList.contains('ok') ? ' PASS' : ' fail')).join(' · '))()`)
  console.log(`  live checks: ${chips}`)
  const shutter = await evaluate(`(() => {
    const b = document.querySelector('.shutter');
    if (!b) return 'no shutter';
    if (b.disabled) return 'shutter disabled (no camera)';
    b.click();
    return 'pressed';
  })()`)
  console.log(`  shutter → ${shutter}`)
  const refused = await waitForRoute('#/refusal')
  check(`after shutter (${await route()}) — refused`, refused === '#/refusal')
  await shot('flow-14-refusal')
  const refusal = await evaluate(`(() => ({
    title: document.querySelector('.title')?.textContent.trim(),
    body: document.querySelector('.body')?.textContent.replace(/\\s+/g, ' ').trim(),
  }))()`)
  console.log(`  "${refusal.title}"`)
  console.log(`  ${refusal.body}`)

  if (problems.length) {
    console.log('\n--- problems ---')
    for (const p of [...new Set(problems)]) console.log(p)
    failures.push('console errors')
  } else {
    console.log('\nno console errors or exceptions')
  }
  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed:`)
    for (const f of failures) console.log(`  ✗ ${f}`)
    process.exitCode = 1
  } else {
    console.log('all checks passed')
  }

  ws.close()
}

main()
  .catch((e) => {
    console.error('walk failed:', e.message)
    process.exitCode = 1
  })
  .finally(() => chrome.kill())
