import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import i18n from './i18n'

import './styles/tokens.css'
import './styles/base.css'

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')

/* Offline, from the second visit on. Production only: in dev a service worker
   caches the very files being edited, which turns every change into a puzzle.
   Registered after mount so it never delays first paint. */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* No offline support on this device — the app still runs, it just needs
         the network each time. Nothing on screen claims otherwise. */
    })
  })
}
