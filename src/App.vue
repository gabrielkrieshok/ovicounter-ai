<template>

<!-- Using Vuetify, the main structure of the app is 'v-container » v-layout » v-flex', separated between the various component files (Image, Analysis, etc.).
The remaining component files are separated for organizational purposes (About, Guide), and design purposes (Loading, Toolbar, Top). -->

<div id="app">
<v-app>

<!-- The toolbar is the constant header.  -->
<app-toolbar></app-toolbar>

<!-- This operates mainly as a single-page app (SPA), where the client-side view is controlled by the 'router-view' component.
The ':key' here is used to reset the app either through the reset button, or through clicking on the Ovicounter AI logo.
The loading dialogue only fires after the analysis button is clicked -- but it stays here as it is an app-wide view. -->
<v-main>
  <router-view :key="componentKey"></router-view>
  <loading-dialogue></loading-dialogue>
</v-main>

</v-app>
</div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import AppToolbar from './components/Toolbar.vue'
import LoadingDialogue from './components/Loading.vue'

export default {
  name: 'OvicounterAI',
  components: {
    AppToolbar,
    LoadingDialogue
  },
  setup () {
    const componentKey = ref(0)
    const router = useRouter()
    const store = useStore()

    // Provide a method to force rerender that other components can use via store
    const forceRerender = () => {
      router.push('/')
      componentKey.value += 1
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Make forceRerender available through store
    store.commit('setForceRerender', forceRerender)

    onMounted(() => {
      // Load OpenCV.js and wait for it to initialize
      const opencv = document.createElement('script')
      opencv.setAttribute('src', 'opencv.js')
      opencv.setAttribute('async', '')

      opencv.onload = () => {
        // Modern OpenCV.js uses cv.ready() promise
        if (typeof cv !== 'undefined' && cv.onRuntimeInitialized) {
          cv.onRuntimeInitialized = () => {
            console.log('OpenCV.js is ready')
            store.commit('setOpenCVReady', true)
          }
        } else if (typeof cv !== 'undefined' && typeof cv.then === 'function') {
          // Alternative: use the .then() method if available
          cv.then(() => {
            console.log('OpenCV.js is ready')
            store.commit('setOpenCVReady', true)
          })
        } else {
          console.warn('OpenCV loaded but initialization method not found')
        }
      }

      opencv.onerror = () => {
        console.error('Failed to load OpenCV.js')
      }

      document.head.appendChild(opencv)
    })

    return {
      componentKey
    }
  }
}
</script>
