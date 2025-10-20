// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import i18n from '@/plugins/i18n'
import './registerServiceWorker'
import 'vue-croppa/dist/vue-croppa.css'
import Croppa from 'vue-croppa'
import router from './router'
import store from './store' // Add this if you're using Vuex

const app = createApp(App)

app.use(vuetify)
app.use(Croppa)
app.use(i18n)
app.use(router)
app.use(store) // Add this if you're using Vuex

app.mount('#app')
