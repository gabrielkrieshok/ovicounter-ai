<template>
    <component :key="componentKey" :is="visionComponent"></component>
</template>

<script>
import { computed } from 'vue'
import { useStore } from 'vuex'
import AppImage from './Image.vue'
import AppAnalysis from './Analysis.vue'

export default {
  components: {
    AppImage,
    AppAnalysis
  },
  setup () {
    const store = useStore()
    const componentKey = 0

    // Watch the store's toAnalysis state to switch components
    const visionComponent = computed(() => {
      return store.state.toAnalysis ? AppAnalysis : AppImage
    })

    return {
      componentKey,
      visionComponent
    }
  }
}
</script>
