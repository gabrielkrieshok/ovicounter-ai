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
      return log;
    })()`)
    for (const line of gestures) console.log(`  ${line}`)
    await shot('flow-8-fixes-zoomed')

    /* The split needs a stroke across a clump, so it runs after the zoom. */
    const split = await evaluate(`(async () => {
      const stage = document.querySelector('.stage-wrap .stage');
      const r = stage.getBoundingClientRect();
      const frame = () => new Promise(res =>
        requestAnimationFrame(() => requestAnimationFrame(res)));
      const send = (type, x, y) =>
        stage.dispatchEvent(new PointerEvent(type, {
          clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
        }));
      document.querySelector('.tool.split').click();
      await frame();
      const undo = document.querySelector('.undo');
      let guard = 0;
      while (!undo.disabled && guard++ < 50) { undo.click(); await frame(); }
      if (!undo.disabled) return 'could not clear history';
      const y = r.top + r.height * 0.5;
      const x0 = r.left + r.width * 0.4;
      send('pointerdown', x0, y);
      for (let i = 1; i <= 8; i++) { send('pointermove', x0 + i * 8, y); await frame(); }
      send('pointerup', x0 + 64, y);
      for (let i = 0; i < 60; i++) await frame();
      document.querySelector('.tool.remove').click();
      return 'split stroke from empty history → undo ' +
        (undo.disabled ? 'STILL DISABLED (split did nothing)' : 'enabled (split recorded)');
    })()`)
    console.log(`  ${split}`)
    await shot('flow-9-fixes-split')
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
  check(`machine total ${machineTotal} in 330–400`, machineTotal >= 330 && machineTotal <= 400)

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
  console.log(`  click "Start a session" → ${await clickText('Start a session')}`)
  await sleep(1500)
  console.log(`Capture (${await route()})`)
  console.log(`  pick demo strip from gallery → ${await pickDemoFile()}`)
  console.log(`  → ${await waitForRoute(['#/crop', '#/refusal'], 15000)}`)
  await sleep(3000)
  await useThisPhoto(['#/fixes'])
  await sleep(600)
  check('session goes from Measure to Manually refine', (await route()) === '#/fixes')
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
