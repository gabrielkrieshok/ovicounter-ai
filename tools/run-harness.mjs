/* Drive the CV harness in a real browser and print what it found.
 *
 *   node tools/run-harness.mjs [--only=portugal] [--stress=0] [--port=5199]
 *
 * Chrome's `--virtual-time-budget` is the obvious tool here and the wrong one:
 * it advances *virtual* time as fast as the page will allow and dumps the DOM
 * when that budget is spent, which for a CPU-bound page can be a fraction of a
 * second of real time. The pipeline is CPU-bound by definition, so every run
 * came back truncated. This drives the page over the DevTools Protocol and
 * waits for it to actually finish.
 *
 * No dependencies: Node 22+ has fetch and WebSocket built in.
 */

import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEBUG_PORT = 9333
const TIMEOUT_MS = 15 * 60 * 1000

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)

const appPort = args.port ?? '5199'

/* Everything except the runner's own flags is forwarded to the harness page,
   so a new harness option needs no change here. */
const RUNNER_FLAGS = new Set(['port', 'shot'])
const query = new URLSearchParams(
  Object.entries(args).filter(([k]) => !RUNNER_FLAGS.has(k)),
)
const target = `http://localhost:${appPort}/tools/dev-harness.html?${query}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--remote-allow-origins=*',
  '--user-data-dir=/tmp/ovicounter-harness-profile',
  'about:blank',
])
chrome.stderr.on('data', () => {}) // Chrome is chatty on stderr; ignore

async function waitForDevTools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${DEBUG_PORT}/json/version`)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('Chrome DevTools endpoint never came up')
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.onopen = () => resolve(ws)
    ws.onerror = (e) => reject(new Error(`websocket failed: ${e.message ?? 'unknown'}`))
  })
}

function rpc(ws) {
  let id = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    const entry = pending.get(msg.id)
    if (!entry) return
    pending.delete(msg.id)
    if (msg.error) entry.reject(new Error(msg.error.message))
    else entry.resolve(msg.result)
  }
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id
      pending.set(messageId, { resolve, reject })
      ws.send(JSON.stringify({ id: messageId, method, params }))
    })
}

async function main() {
  await waitForDevTools()

  const created = await fetch(
    `http://localhost:${DEBUG_PORT}/json/new?${encodeURIComponent(target)}`,
    { method: 'PUT' },
  ).then((r) => r.json())

  const ws = await connect(created.webSocketDebuggerUrl)
  const send = rpc(ws)
  await send('Runtime.enable')

  const evaluate = async (expression) => {
    const { result } = await send('Runtime.evaluate', { expression, returnByValue: true })
    return result.value
  }

  const started = Date.now()
  let lastLines = 0
  for (;;) {
    const state = await evaluate(
      `({ title: document.title, dump: document.getElementById('dump')?.textContent ?? '' })`,
    )

    // Echo progress as it appears, so a long run is not a silent one.
    const lines = state.dump.split('\n')
    if (lines.length > lastLines) {
      process.stdout.write(lines.slice(lastLines).join('\n') + '\n')
      lastLines = lines.length
    }

    if (state.title === 'harness done' || state.title === 'harness failed') {
      console.log(`\n=== ${state.title} in ${Math.round((Date.now() - started) / 1000)}s ===`)
      if (args.shot) {
        const metrics = await evaluate(
          `({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })`,
        )
        await send('Emulation.setDeviceMetricsOverride', {
          width: Math.min(2400, metrics.w),
          height: Math.min(12000, metrics.h),
          deviceScaleFactor: 1,
          mobile: false,
        })
        const { data } = await send('Page.captureScreenshot', { format: 'png' })
        await writeFile(args.shot, Buffer.from(data, 'base64'))
        console.log(`screenshot → ${args.shot}`)
      }
      break
    }
    if (Date.now() - started > TIMEOUT_MS) {
      console.log('\n=== TIMED OUT ===')
      break
    }
    await sleep(1000)
  }

  ws.close()
}

main()
  .catch((error) => {
    console.error('harness runner failed:', error.message)
    process.exitCode = 1
  })
  .finally(() => chrome.kill())
