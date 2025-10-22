<template>

<v-container>

<!-- Main navigation bar here -- mostly just for aesthetic reasons -->
<app-top></app-top>

<!-- Selection of image style -- which affects crop window as well as emit of egg size data for analysis -->
<v-row>
  <v-col cols="12" md="6" offset-md="3">
    <v-container class="pt-0">
      <h2 class="text-body-1 text-center pb-2">{{ $t('Select the ovitrap image type') }}</h2>

      <v-item-group v-model="imageType" mandatory>
      <v-row class="justify-center">

        <v-col cols="12" md="4">
          <v-item v-slot="{ isSelected, toggle }">
            <v-card :style="isSelected ? 'border: 2px solid rgb(var(--v-theme-primary))' : ''" :class="isSelected ? 'elevation-5' : ''" @click="toggle">
              <v-img :src="typePaperThumb" aspect-ratio="2.00"></v-img>
              <v-card-title>
                <div>
                  <h3 class="text-h6 mb-0">{{ $t('Paper Strip') }}</h3>
                  <div class="text-body-2">{{ $t('Paper-Description') }}</div>
                </div>
              </v-card-title>
            </v-card>
          </v-item>
        </v-col>

        <v-col cols="12" md="4">
          <v-item v-slot="{ isSelected, toggle }">
            <v-card :style="isSelected ? 'border: 2px solid rgb(var(--v-theme-primary))' : ''" :class="isSelected ? 'elevation-5' : ''" @click="toggle">
              <v-img :src="typeMagnifiedThumb" aspect-ratio="2.00"></v-img>
              <v-card-title>
                <div>
                  <h3 class="text-h6 mb-0">{{ $t('Magnified') }}</h3>
                  <div class="text-body-2">{{ $t('Magnified-Description') }}</div>
                </div>
              </v-card-title>
            </v-card>
          </v-item>
        </v-col>

        <v-col cols="12" md="4">
          <v-item v-slot="{ isSelected, toggle }">
            <v-card :style="isSelected ? 'border: 2px solid rgb(var(--v-theme-primary))' : ''" :class="isSelected ? 'elevation-5' : ''" @click="toggle">
              <v-img :src="typeMicroscopeThumb" aspect-ratio="2.00"></v-img>
              <v-card-title>
                <div>
                  <h3 class="text-h6 mb-0">{{ $t('Microscope') }}</h3>
                  <div class="text-body-2">{{ $t('Microscope-Description') }}</div>
                </div>
              </v-card-title>
            </v-card>
          </v-item>
        </v-col>
      </v-row>
      </v-item-group>

    </v-container>

  </v-col>
</v-row>

<!-- Image upload and preview section -->
<v-row :style="croppaDimensions" id="croppaBox">
  <v-col cols="12" class="d-flex justify-center align-center" style="position: relative; border: 3px dashed rgb(var(--v-theme-primary)); min-height: 400px;">

    <!-- Image preview -->
    <img v-if="imagePreview" :src="imagePreview" style="max-width: 100%; max-height: 100%; object-fit: contain;" />

    <!-- Upload button when no image -->
    <v-btn
      v-if="!imagePreview"
      id="croppaButton"
      @click="selectImage"
      variant="flat"
      size="large"
      style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
    >
      {{ $t('Select Image') }}
      <v-icon end>mdi-image</v-icon>
    </v-btn>

    <!-- Demo image button -->
    <v-btn
      v-if="!imagePreview"
      @click="loadDemoImage()"
      style="position: absolute; top: 25px; right: 25px;"
    >
      {{ $t('Demo Image') }}
      <v-icon end>mdi-grain</v-icon>
    </v-btn>

    <!-- Hidden file input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display: none;"
      @change="handleFileSelect"
    />

  </v-col>
</v-row>

<v-bottom-navigation app :model-value="showBottomOptions" height="70">

  <v-btn variant="text" color="primary" @click="rotateImage">
    <span>{{ $t('Rotate') }}</span>
    <v-icon>mdi-rotate-right</v-icon>
  </v-btn>

  <v-btn variant="text" color="primary" @click="removeImage">
    <span>{{ $t('Remove') }}</span>
    <v-icon>mdi-cancel</v-icon>
  </v-btn>

  <v-btn variant="text" color="secondary" @click="accept()">
    <span>{{ $t('Analyze') }}</span>
    <v-icon>mdi-check-circle</v-icon>
  </v-btn>

</v-bottom-navigation>

</v-container>

</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import AppTop from './Top.vue'
import typePaperImg from '@/assets/img/type-paper.jpg'
import typeMagnifiedImg from '@/assets/img/type-magnified.jpg'
import typeMicroscopeImg from '@/assets/img/type-microscope.jpg'
import typePaperThumb from '@/assets/img/type-paper-thumb.jpg'
import typeMagnifiedThumb from '@/assets/img/type-magnified-thumb.jpg'
import typeMicroscopeThumb from '@/assets/img/type-microscope-thumb.jpg'

export default {
  components: {
    AppTop
  },
  setup () {
    const store = useStore()
    const fileInput = ref(null)
    const imagePreview = ref(null)
    const rawImageData = ref(null)
    const imageRotation = ref(0)
    const showBottomOptions = ref(false)
    const imageType = ref(0)
    const analysisStarted = ref(false)

    const croppaDimensions = computed(() => {
      if (imageType.value === 0) return 'width: 100%; min-height: 400px;'
      if (imageType.value === 1) return 'width: 100%; min-height: 800px;'
      if (imageType.value === 2) return 'width: 80%; min-height: 600px;'
      return 'width: 100%; min-height: 400px;'
    })

    const selectImage = () => {
      fileInput.value.click()
    }

    const handleFileSelect = (event) => {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          imagePreview.value = e.target.result
          rawImageData.value = e.target.result
          showBottomOptions.value = true
        }
        reader.readAsDataURL(file)
      }
    }

    const loadDemoImage = () => {
      let imageSrc = ''
      if (imageType.value === 0) {
        imageSrc = typePaperImg
      } else if (imageType.value === 1) {
        imageSrc = typeMagnifiedImg
      } else if (imageType.value === 2) {
        imageSrc = typeMicroscopeImg
      }

      // Load the image
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg')
        imagePreview.value = dataUrl
        rawImageData.value = dataUrl
        showBottomOptions.value = true
      }
      img.src = imageSrc
    }

    const rotateImage = () => {
      imageRotation.value = (imageRotation.value + 90) % 360

      if (rawImageData.value) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          // Swap dimensions for 90 or 270 degree rotations
          if (imageRotation.value === 90 || imageRotation.value === 270) {
            canvas.width = img.height
            canvas.height = img.width
          } else {
            canvas.width = img.width
            canvas.height = img.height
          }

          ctx.translate(canvas.width / 2, canvas.height / 2)
          ctx.rotate((imageRotation.value * Math.PI) / 180)
          ctx.drawImage(img, -img.width / 2, -img.height / 2)

          imagePreview.value = canvas.toDataURL('image/jpeg')
          rawImageData.value = canvas.toDataURL('image/jpeg')
        }
        img.src = rawImageData.value
      }
    }

    const removeImage = () => {
      imagePreview.value = null
      rawImageData.value = null
      showBottomOptions.value = false
      imageRotation.value = 0
      if (fileInput.value) {
        fileInput.value.value = ''
      }
    }

    const accept = async () => {
      store.commit('setAppLoading', true)
      store.commit('setToAnalysis', true)
      store.commit('setLoadingDialog', false)
      analysisStarted.value = true

      store.commit('setImageType', imageType.value)
      store.commit('setRawImage', rawImageData.value)

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return {
      fileInput,
      imagePreview,
      rawImageData,
      imageRotation,
      showBottomOptions,
      imageType,
      analysisStarted,
      croppaDimensions,
      selectImage,
      handleFileSelect,
      loadDemoImage,
      rotateImage,
      removeImage,
      accept,
      typePaperThumb,
      typeMagnifiedThumb,
      typeMicroscopeThumb
    }
  }
}
</script>

<style scoped>

p {
  line-height: 1.5;
}

a {
  text-decoration:none;
}

#croppaButton {
  z-index: 10;
}

</style>
