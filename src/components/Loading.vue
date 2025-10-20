<template>
<div class="loading text-center">
  <v-dialog
    v-model="loadingDialog"
    persistent
    width="500"
  >
    <v-card
      color="primary"
      dark
    >
      <v-card-text>
        <div class="d-flex align-center">
          <v-avatar id="bot" tile size="24" class="mr-2">
            <v-img :src="require('@/assets/img/bot.gif')"></v-img>
          </v-avatar>
          {{ $t('Analyzing Image...') }}
        </div>
        <v-progress-linear
          indeterminate
          color="white"
          class="mb-0"
          height="15"
        ></v-progress-linear>
      </v-card-text>
    </v-card>
  </v-dialog>
</div>
</template>

<script>
import { ref, watch } from 'vue'
import { useStore } from 'vuex'

export default {
  setup () {
    const store = useStore()
    const loadingDialog = ref(false)

    // Watch for loadingDialog state changes from store
    watch(() => store.state.loadingDialog, (newVal) => {
      loadingDialog.value = newVal
      if (newVal) {
        setTimeout(() => {
          loadingDialog.value = false
        }, 3000)
      }
    })

    return {
      loadingDialog
    }
  }
}
</script>
