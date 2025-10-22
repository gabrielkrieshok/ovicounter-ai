<template>

<div class="title my-4">

  <div class="d-flex justify-center" @click="rerender()" style="cursor: pointer">
    <v-avatar tile size="48" class="mr-2 ml-0"><v-img :src="botIcon" /></v-avatar>
    <span class="text-h3 font-weight-black text-uppercase pb-0"><span>Ovitrap </span><span class="font-weight-thin">AI</span></span>
  </div>

  <div class="d-flex align-center justify-center flex-wrap">
    <h2 class="text-h5 mt-4">{{ $t('subtitle') }}</h2>
  </div>

  <div class="d-flex align-center justify-center flex-wrap">
    <v-col cols="12" md="10" lg="10" xl="6">
      <p class="text-h6 my-3">{{ $t('description') }}</p>
    </v-col>
  </div>

</div>

</template>

<script>
import { useStore } from 'vuex'
import botIcon from '@/assets/img/bot.png'

export default {
  setup () {
    const store = useStore()

    const rerender = () => {
      store.dispatch('triggerRerender')
    }

    return {
      rerender,
      botIcon
    }
  }
}
</script>
