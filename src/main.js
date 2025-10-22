// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import i18n from '@/plugins/i18n'
import router from './router'
import store from './store'

// Register service worker with vite-plugin-pwa
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
}

const app = createApp(App)

app.use(vuetify)
app.use(i18n)
app.use(router)
app.use(store)

app.mount('#app')
