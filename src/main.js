// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import i18n from '@/plugins/i18n'
import './registerServiceWorker'
import router from './router'
import store from './store'

const app = createApp(App)

app.use(vuetify)
app.use(i18n)
app.use(router)
app.use(store)

app.mount('#app')
