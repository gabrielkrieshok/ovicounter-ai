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
      // Mount openCV module after component is loaded, as the JS library isn't part of Webpack (explicitly because it tries to transcode everything which doesn't work), and just log that it worked.
      const opencv = document.createElement('script')
      opencv.setAttribute('src', 'opencv.js')
      document.head.appendChild(opencv)
      console.log('OpenCV Loaded')
    })

    return {
      componentKey
    }
  }
}
</script>
