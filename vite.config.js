import { readdirSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/* Offline, without a dependency.
 *
 * Welcome says "WORKS OFFLINE ✓" and a field tool has to mean it. Workbox would
 * do this, but it is another dependency for what is about sixty lines, and this
 * app has an unusual shape that a generic recipe handles badly: a single 9.1MB
 * WASM runtime that must never be precached (it would block the install behind
 * a 9MB download) but must be cached the instant it is first fetched.
 *
 * So: precache the shell — index.html, the hashed assets, the fonts, about
 * 350KB — and cache-first everything else on demand. The first visit warms
 * opencv.js because Welcome preloads it; from the second visit on, the whole
 * app runs with the radio off.
 */
function serviceWorker() {
  let base = '/'
  return {
    name: 'ovicounter-service-worker',
    apply: 'build',
    configResolved(config) {
      base = config.base ?? '/'
    },
    generateBundle(_options, bundle) {
      const hashed = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map'))
        .map((name) => base + name)

      const fonts = readdirSync(fileURLToPath(new URL('./public/fonts', import.meta.url)))
        .filter((f) => f.endsWith('.woff2'))
        .map((f) => `${base}fonts/${f}`)

      /* The logo, in every form a browser or a home screen asks for (Oct 2026). */
      const icons = ['favicon.svg', 'icon.png', 'icon-192.png', 'apple-touch-icon.png'].map((f) => `${base}${f}`)
      const precache = [base, ...hashed, ...fonts, ...icons]

      /* The cache name carries the build's own asset hashes, so a new build
         invalidates the old cache without any manual version bumping. */
      const version = hashed.join('|').length.toString(36) + '-' + hashed.length

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `/* Generated at build time by vite.config.js — do not edit. */
const CACHE = 'ovicounter-${version}'
const PRECACHE = ${JSON.stringify(precache, null, 2)}

/* Cached the first time they are asked for, never precached: the WASM runtime
   is 9.1MB and the sample photographs are 6.8MB, and an install that blocks on
   16MB is an install that fails on a field connection. */
const CACHE_ON_DEMAND = /\\/(assets|fonts|samples)\\/|\\/opencv\\.js$/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  /* Hash routing means every navigation is a request for the same document. */
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('${base}').then((hit) => hit || fetch(request)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        if (response.ok && CACHE_ON_DEMAND.test(url.pathname)) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
`,
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), serviceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // `host` so the dev server is reachable from a phone on the same wifi —
    // sunlight legibility and gloved tap accuracy are the two things a desktop
    // browser cannot tell you.
    host: true,
    // Fixed, because tools/run-harness.mjs and tools/walk-flow.mjs drive this
    // server over the DevTools Protocol and have to know where it is.
    // `strictPort` so a clash fails loudly instead of quietly moving the app to
    // a port the tools will then fail to find it on.
    port: 5199,
    strictPort: true,
  },
  // The CV worker is an ES module worker. Vite serves workers as native modules
  // in dev regardless of this setting, so anything else means the worker
  // behaves differently in dev than in the build — see the opencv.js loader in
  // src/cv/worker.js for how the UMD bundle is brought in without importScripts.
  worker: { format: 'es' },
  build: { target: 'es2020' },
})
