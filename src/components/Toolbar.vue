<template>
<div>
<v-app-bar color="primary" app>

  <v-app-bar-title class="text-uppercase white--text" style="cursor: pointer">
    <div class="d-flex align-center" @click="rerender()">
      <v-avatar tile size="20" class="mx-2"><v-img :src="botIcon" /></v-avatar>
      <span class="font-weight-black">Ovitrap </span><span class="font-weight-thin">AI</span>
    </div>
  </v-app-bar-title>
  <v-spacer></v-spacer>
  <span class="text-caption mx-3">
    <v-btn-toggle :model-value="localeSelect" mandatory>
      <v-btn size="small" variant="text" @click="changeLocale('en')">EN</v-btn>
      <v-btn size="small" variant="text" @click="changeLocale('es')">ES</v-btn>
    </v-btn-toggle>
  </span>

  <div class="d-none d-md-flex">
    <v-btn
      v-for="(item) in menu[localeSelect]"
      :key="item.title"
      :to="item.link"
      variant="text"
      color="white"
    >{{ item.title }}</v-btn>
  </div>

  <v-menu class="d-md-none">
    <template v-slot:activator="{ props }">
      <v-app-bar-nav-icon v-bind="props"></v-app-bar-nav-icon>
    </template>
    <v-list>
      <v-list-item v-for="item in menu[localeSelect]" :key="item.title" :to="item.link">
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>

</v-app-bar>

</div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import botIcon from '@/assets/img/bot.png'

export default {
  setup () {
    const store = useStore()
    const { locale } = useI18n()

    const menu = {
      0: [
        { title: 'Vision', link: '/' },
        { title: 'Guide', link: '/guide' },
        { title: 'About', link: '/about' }
      ],
      1: [
        { title: 'Visión', link: '/' },
        { title: 'Guía', link: '/guide-es' },
        { title: 'Acerca de...', link: '/about-es' }
      ]
    }

    const languages = [
      { title: 'en', name: 'English' },
      { title: 'es', name: 'Español' }
    ]

    const loading = ref(false)

    const localeSelect = computed(() => {
      return locale.value === 'en' ? 0 : 1
    })

    // Watch for appLoading state changes
    watch(() => store.state.appLoading, (newVal) => {
      loading.value = newVal
    })

    const rerender = () => {
      store.dispatch('triggerRerender')
    }

    const changeLocale = (newLocale) => {
      locale.value = newLocale
    }

    return {
      menu,
      languages,
      loading,
      localeSelect,
      rerender,
      changeLocale,
      botIcon
    }
  }
}
</script>
