// src/store/index.js
import { createStore } from 'vuex'

export default createStore({
  state: {
    forceRerender: null,
    appLoading: false,
    loadingDialog: false,
    toAnalysis: false,
    imageType: 0,
    rawImage: null,
    openCVReady: false
  },
  mutations: {
    setForceRerender(state, fn) {
      state.forceRerender = fn
    },
    setAppLoading(state, value) {
      state.appLoading = value
    },
    setLoadingDialog(state, value) {
      state.loadingDialog = value
    },
    setToAnalysis(state, value) {
      state.toAnalysis = value
    },
    setImageType(state, value) {
      state.imageType = value
    },
    setRawImage(state, value) {
      state.rawImage = value
    },
    setOpenCVReady(state, value) {
      state.openCVReady = value
    }
  },
  actions: {
    triggerRerender({ state }) {
      if (state.forceRerender) {
        state.forceRerender()
      }
    }
  },
  modules: {}
})