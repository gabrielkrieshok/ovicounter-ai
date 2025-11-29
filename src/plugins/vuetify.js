import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import * as labsComponents from "vuetify/labs/components";
import { aliases, mdi } from 'vuetify/iconsets/mdi'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light', // Specify the default theme to be used
    themes: {
      light: {
        primary: '#1E88E5', // blue.darken4
        secondary: '#039BE5', // lightBlue.darken4
        accent: '#FF5252', // red.accent2
      },
    },
  },
})

export default vuetify