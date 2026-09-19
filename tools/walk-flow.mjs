/* Walk the demo path in a real browser and screenshot each screen.
 *
 *   node tools/walk-flow.mjs [--port=5199] [--out=tools/shots] [--width=900 --height=900] [--frame=0|1]
 *
 * Below 1000px wide the phone frame is kept (`?frame=1`) so screens can be
 * checked against the hi-fi; at 1440 the laptop layout is walked and the
 * photograph's share of the viewport is measured on Refine and Your fixes.
 *
 * Clicks through Welcome → Crop → Processing → Refine the way a technician
 * would — Mark one egg only if the probe fails to calibrate the strip on its
 * own, which on the demo it must not — capturing the viewport at each stop and
 * reporting any console error along the way. Screens that only ever get looked at in isolation
 * hide the failures that only happen in sequence — a stale canvas handed
 * between two of them, a worker still busy when the next screen asks it for
 * something.
 */

import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEBUG_PORT = 9334

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

  /* How much of the viewport the photograph takes. On Refine the ImageStage
     canvas IS the photograph's box; on Your fixes the ZoomPanStage canvas is
     the stage, and at cover fit the photograph is at least that wide. */
  const photoShare = async (selector) => {
    const m = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), pct: Math.round(100 * r.width / innerWidth),
               wide: !!document.querySelector('.device.wide') };
    })()`)
    if (!m) return '  photo: not found'
    return `  photo ${m.w}×${m.h} = ${m.pct}% of ${width}px${m.wide ? ' (laptop layout)' : ' (framed)'}` +
      (m.wide ? (m.pct >= 60 ? ' ≥60% ✓' : ' <60% ✗') : '')
  }

  const waitForRoute = async (hash, ms = 15000) => {
    const until = Date.now() + ms
    while (Date.now() < until) {
      if ((await route()) === hash) return true
      await sleep(250)
    }
    return false
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

  await sleep(1200)
  console.log('Welcome')
  await shot('flow-1-welcome')
  const before = await dbCounts()

  console.log(`  click "Try it with a demo photo" → ${await clickText('Try it with a demo photo')}`)
  // The crop proposal needs OpenCV to finish loading.
  await sleep(3500)
  console.log(`Crop (${await route()})`)
  await shot('flow-2-crop')

  console.log(`  click "Use this photo" → ${await clickText('Use this photo')}`)

  /* The probe (src/cv/probe.js) calibrates the strip on Crop with no tap, so
     the demo must land on Processing, never on Mark one egg. If it does land
     there the probe returned null on the one strip it is guaranteed to read. */
  let landed = null
  for (let i = 0; i < 40 && !landed; i++) {
    await sleep(250)
    const h = await route()
    if (h === '#/processing' || h === '#/refine' || h === '#/calibrate') landed = h
  }
  let taps = 0
  if (landed === '#/calibrate') {
    console.log('Mark one egg (#/calibrate) — PROBE FAILED ON THE DEMO STRIP, tapping instead')
    await sleep(1500)
    await shot('flow-3-calibrate-empty')
    taps = await tapForCalibration()
    await shot('flow-4-calibrate-marked')
    console.log(`  click "Looks right" → ${await clickText('Looks right')}`)
    await sleep(700)
  } else {
    console.log(`Processing (${landed}) — calibrated by the probe, zero taps`)
  }
  await shot('flow-5-processing')

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

  await sleep(3000)
  console.log(`Refine (${await route()})`)
  await shot('flow-6-refine')
  console.log(await photoShare('.refine .stage-wrap canvas.photo'))

  const state = await evaluate(`(() => {
    const el = document.querySelector('.refine');
    return el ? 'refine mounted' : 'refine MISSING';
  })()`)
  console.log(`  ${state}`)

  console.log(`  click "Marks look right" → ${await clickText('Marks look right')}`)
  await sleep(1500)
  console.log(`Your fixes (${await route()})`)
  await shot('flow-7-fixes')
  console.log(await photoShare('.fixes .stage'))

  /* Exercise the gestures rather than just photographing the screen. Each one
     reports the mark count around it, because the visible effect of a cull is a
     number changing and a screenshot cannot show that. */
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

    // How many marks are drawn, read from the store via the legend's siblings
    // is not possible — count via the undo button's enabled state instead, and
    // report the removed/added glyph counts the operator can actually see.
    const counts = () => {
      const undo = document.querySelector('.undo');
      return { undoEnabled: !undo.disabled };
    };

    // 1. Tap the middle: removes a mark if one is there.
    const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.5;
    send('pointerdown', cx, cy); await frame(); send('pointerup', cx, cy);
    await settle();
    log.push('tap → undo ' + (counts().undoEnabled ? 'enabled' : 'still disabled'));

    // 2. Undo it.
    document.querySelector('.undo').click();
    await settle();
    log.push('undo → ' + (counts().undoEnabled ? 'more history' : 'history empty'));

    // 3. Press and hold on empty paper, then release: adds an egg.
    // Inside the photograph, not merely inside the stage: a wide strip at
    // contain-fit only occupies a band across the middle, and an add outside
    // the image is correctly refused.
    const hx = r.left + r.width * 0.3, hy = r.top + r.height * 0.5;
    send('pointerdown', hx, hy);
    await new Promise(res => setTimeout(res, 600));
    const loupe = !!document.querySelector('.loupe');
    send('pointerup', hx, hy);
    await settle();
    log.push('hold → loupe ' + (loupe ? 'shown' : 'MISSING') +
             ', undo ' + (counts().undoEnabled ? 'enabled' : 'disabled'));

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

  /* The split needs a stroke across a clump, which needs a clump to aim at, so
     it runs after the zoom where marks are far enough apart to cross one. */
  const split = await evaluate(`(async () => {
    const stage = document.querySelector('.stage-wrap .stage');
    const r = stage.getBoundingClientRect();
    const frame = () => new Promise(res =>
      requestAnimationFrame(() => requestAnimationFrame(res)));
    const send = (type, x, y) =>
      stage.dispatchEvent(new PointerEvent(type, {
        clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true,
      }));

    // Clear the history first, so 'undo became enabled' can only mean the
    // stroke did something. It was already enabled from the add.
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
    return 'stroke from empty history → undo ' +
      (undo.disabled ? 'STILL DISABLED (split did nothing)' : 'enabled (split recorded)');
  })()`)
  console.log(`  ${split}`)
  await shot('flow-9-fixes-split')

  console.log(`  click "Done — count them" → ${await clickText('Done')}`)
  await sleep(1200)
  console.log(`Strip result (${await route()})`)
  await shot('flow-10-result')

  const readResult = () => evaluate(`(() => ({
    machine: document.querySelector('.machine')?.textContent.trim(),
    machineStyled: !!document.querySelector('.scale.machine'),
    count: document.querySelector('.count')?.textContent.trim(),
    band: document.querySelector('.label.active')?.textContent.trim(),
    sentence: document.querySelector('.sentence')?.textContent.replace(/\\s+/g, ' ').trim(),
    legend: [...document.querySelectorAll('.legend .item')]
      .map(e => e.textContent.trim()).join(' · '),
  }))()`)
  const numbers = await readResult()
  console.log(`  machine ${numbers.machine} → human ${numbers.count} (${numbers.band})`)
  console.log(`  ${numbers.sentence}`)
  console.log(`  ${numbers.legend}`)
  console.log(`  reviewed strip → ${numbers.machineStyled ? 'MACHINE STYLED ✗ (fixes were made)' : 'human count ✓'}`)

  /* The brief's acceptance window for the demo with no tap: 330–400. */
  const machineTotal = parseInt(String(numbers.machine ?? '').replace(/[^0-9]/g, ''), 10)
  const inWindow = machineTotal >= 330 && machineTotal <= 400
  console.log(
    `  calibration: ${taps} taps, machine total ${machineTotal} — ` +
      (taps === 0 ? 'zero taps ✓' : 'TAPPED ✗') +
      (inWindow ? ', in 330–400 ✓' : ', OUTSIDE 330–400 ✗'),
  )

  /* The second strip is the loop's whole claim: calibration carries forward, so
     Mark one egg is skipped and the operator goes straight from crop to a
     scanned strip. If this lands on #/calibrate the carry-forward is broken. */
  console.log(`  click "Next strip" → ${await clickText('Next strip')}`)
  await sleep(3000)
  console.log(`Strip 2 (${await route()})`)
  console.log(`  click "Use this photo" → ${await clickText('Use this photo')}`)
  await sleep(3500)
  const second = await route()
  console.log(
    `Strip 2 after crop (${second}) — ` +
      (second === '#/calibrate'
        ? 'CALIBRATION NOT CARRIED FORWARD'
        : 'calibration carried forward, Mark one egg skipped'),
  )
  await shot('flow-11-strip2')

  await clickText('Marks look right')
  await sleep(1200)
  await clickText('Done')
  await sleep(1200)
  console.log(`Strip 2 result (${await route()})`)

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

  /* The correction path. Mark one egg is no longer the entry, so the walk
     above never sees it; this opens it from Refine on a fresh demo, taps once,
     reports the echo and whether the tap was flagged against the probe, and
     confirms "Looks right — go" lands back on Refine with new marks. */
  console.log('\n--- correction path (Refine → Mark one egg) ---')
  await evaluate(`location.hash = '#/'`)
  await sleep(800)
  await clickText('Try it with a demo photo')
  await sleep(2500)
  await clickText('Use this photo')
  console.log(`  probe → ${(await waitForRoute('#/refine', 20000)) ? 'Refine' : 'NEVER REACHED REFINE'}`)
  await sleep(600)
  console.log(`  click "Mark an egg" → ${await clickText('Mark an egg')}`)
  await sleep(600)
  console.log(`  Mark one egg (${await route()})`)
  const keep = await evaluate(`(() => {
    const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Keep the marks'));
    return b ? (b.disabled ? 'present but disabled' : 'present') : 'MISSING';
  })()`)
  console.log(`  "Keep the marks" ${keep}`)
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
  console.log(`  → ${(await waitForRoute('#/refine', 20000)) ? 'back on Refine with the tap calibration' : 'NEVER RETURNED TO REFINE'}`)
  await shot('flow-17-correction-refine')

  /* The untouched pass. Straight through Your fixes without a single gesture:
     the result must not show a black human count or say "checked by you". */
  console.log('\n--- untouched pass (Your fixes → Done with no gestures) ---')
  await clickText('Marks look right')
  await sleep(1200)
  await clickText('Done')
  await sleep(1200)
  const untouched = await readResult()
  console.log(`  ${untouched.sentence}`)
  console.log(`  count "${untouched.count}" · legend "${untouched.legend || '(none)'}"`)
  const ok = untouched.machineStyled && /^~/.test(untouched.count ?? '') && !/checked by you/.test(untouched.sentence ?? '')
  console.log(`  untouched strip → ${ok ? 'machine styling, no human count ✓' : 'CLAIMS A CHECK ✗'}`)
  await shot('flow-18-result-untouched')

  /* Persistence. The demo's promise — "Nothing is saved" — is checked against
     the database rather than taken on trust, and the storage layer is exercised
     directly, because the full persisted-session path needs a real camera or a
     gallery pick that a headless run cannot supply. */
  console.log('\n--- persistence ---')
  const after = await dbCounts()
  const wroteSessions = after.sessions - before.sessions
  const wroteStrips = after.strips - before.strips
  console.log(
    `  demo wrote ${wroteSessions} sessions / ${wroteStrips} strips` +
      (wroteSessions === 0 && wroteStrips === 0
        ? '  ✓ promise held'
        : '  ✗ DEMO SAVED SOMETHING'),
  )
  const storage = await evaluate(`(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('ovicounter', 1);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      r.onupgradeneeded = () => {};
    });
    const put = (v) => new Promise((res, rej) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').put(v);
      tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error);
    });
    const get = (k) => new Promise((res) => {
      const q = db.transaction('sessions', 'readonly').objectStore('sessions').get(k);
      q.onsuccess = () => res(q.result);
    });
    const del = (k) => new Promise((res) => {
      const tx = db.transaction('sessions', 'readwrite');
      tx.objectStore('sessions').delete(k);
      tx.oncomplete = () => res(true);
    });
    await put({ id: '__probe', startedAt: new Date(0).toISOString(), counts: [1], refusals: 0 });
    const back = await get('__probe');
    await del('__probe');
    return { roundTrip: !!back };
  })()`)
  console.log(`  IndexedDB round-trip: ${storage.roundTrip ? 'ok' : 'FAILED'}`)

  /* The capture path. Chrome's fake camera shows a rolling test pattern with no
     eggs on it, so the gate should refuse it — which is the branch worth
     exercising, since a refusal is the highest-stakes surface in the flow. */
  console.log('\n--- capture path ---')
  await evaluate(`location.hash = '#/'`)
  await sleep(800)
  console.log(`  click "Start a new session" → ${await clickText('Start a new session')}`)
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
  console.log(`After shutter (${await route()})${refused ? '' : ' — NEVER REACHED REFUSAL'}`)
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
  } else {
    console.log('\nno console errors or exceptions')
  }

  ws.close()
}

main()
  .catch((e) => {
    console.error('walk failed:', e.message)
    process.exitCode = 1
  })
  .finally(() => chrome.kill())
