<template>
<div>

  <v-container fluid>
    <!-- Hidden source image for OpenCV to read from -->
    <img id="analyzedImage" :src="analyzedImage" style="display: none;" />
    <img id="legendImage" src="/img/legend.png" style="display: none;" />

    <v-row>
      <v-col cols="12" md="8" lg="8" xl="9" v-show="analysisStarted">

<!-- All canvas elements exist outside v-window so OpenCV can access them -->
<div style="position: relative;">
  <!-- Analysis canvases (OpenCV fills these) -->
  <canvas id="src" class="imageCanvasOuter" v-show="window === 0 && showAnalysis"></canvas>
  <canvas id="src2" class="imageCanvasOuter" v-show="window === 0 && !showAnalysis"></canvas>

  <canvas id="threshold" class="imageCanvasOuter" v-show="window === 1 && showAnalysis"></canvas>
  <canvas id="src3" class="imageCanvasOuter" v-show="window === 1 && !showAnalysis"></canvas>

  <canvas id="objects" class="imageCanvasOuter" v-show="window === 2 && showAnalysis"></canvas>
  <canvas id="src5" class="imageCanvasOuter" v-show="window === 2 && !showAnalysis"></canvas>

  <canvas id="outlines" class="imageCanvasOuter" v-show="window === 3 && showAnalysis"></canvas>
  <canvas id="src6" class="imageCanvasOuter" v-show="window === 3 && !showAnalysis"></canvas>

  <canvas id="overlay" class="imageCanvasOuter" v-show="window === 4 && showAnalysis"></canvas>
  <canvas id="src7" class="imageCanvasOuter" v-show="window === 4 && !showAnalysis"></canvas>
</div>

  <!-- Options for the analysis windows -->
  <v-card class="my-3">
    <v-card-title>
      <div class="d-flex align-center flex-wrap w-100">
        <div class="flex-grow-1">
          <h1 :class="{'text-h6': smAndDown, 'text-h4': !smAndDown}">{{ analyzedImagesPretty[window] }}</h1>
          <h2 :class="{'text-body-1': smAndDown, 'text-h6 mt-2': !smAndDown}">({{window+1}} {{ $t('of') }} {{length}})</h2>
        </div>
        <v-spacer></v-spacer>
        <div class="d-flex justify-end">
          <v-btn icon color="primary" @click="previous"><v-icon>mdi-chevron-left</v-icon>
          </v-btn>
          <v-btn icon color="primary" @click="next"><v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </div>
    </v-card-title>
  </v-card>

  </v-col>

  <v-col cols="12" md="4" lg="3" xl="3" :class="{'pl-0': smAndDown, 'pl-3': !smAndDown}" v-show="analysisComplete">

  <!-- Filters for fine-tuning image and analysis -->
  <div v-show="drawer">
    <v-card class="mb-2">
      <v-card-title>
        <h4 class="text-h6">{{ $t('Filters') }}</h4>
      </v-card-title>
      <v-card-text class="pt-0">

      <div class="d-flex">
        <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
        <div class="text-body-1"><span v-bind="props">{{ $t('Image Threshold Adjustment') }}</span></div>
        </template>
        <span>{{ $t('Image Threshold Adjustment Details') }}</span>
        </v-tooltip>
      </div>

      <v-row>
        <v-col>
          <v-slider v-model="threshValue" :max="255" @update:model-value="analyze()"></v-slider>
        </v-col>
        <v-col cols="3" md="2" xl="2" class="mx-2">
        <v-text-field variant="solo" v-model="threshValue" hide-details density="compact" class="filter"></v-text-field>
        </v-col>
      </v-row>

      <div class="d-flex">
        <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
        <div class="text-body-1"><span v-bind="props">{{ $t('Minimum Egg Size') }}</span></div>
        </template>
        <span>{{ $t("Minimum Egg Size Details") }}</span>
        </v-tooltip>
      </div>

      <v-row>
        <v-col class="mx-3">
          <v-slider v-model="minEggRadius" :min="0" :max="100" @update:model-value="analyze()"></v-slider>
        </v-col>
        <v-col cols="8" md="5" lg="4" xl="3">
        <v-text-field variant="solo" v-model="minEggRadius" hide-details density="compact"></v-text-field>
        </v-col>
      </v-row>

      <div class="d-flex">
        <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
        <div class="text-body-1"><span v-bind="props">{{ $t('Maximum Egg Size') }}</span></div>
        </template>
        <span>{{ $t('Maximum Egg Size Details') }}</span>
        </v-tooltip>
      </div>

      <v-row>
        <v-col class="mx-3">
          <v-slider v-model="maxEggRadius" :min="0" :max="100" @update:model-value="analyze()"></v-slider>
        </v-col>
        <v-col cols="8" md="5" lg="4" xl="3">
        <v-text-field variant="solo" v-model="maxEggRadius" hide-details density="compact"></v-text-field>
        </v-col>
      </v-row>

      <div class="d-flex">
        <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
        <div class="text-body-1"><span v-bind="props">{{ $t('Maximum Cluster Size') }}</span></div>
        </template>
        <span>{{ $t('Maximum Cluster Size Details') }}</span>
        </v-tooltip>
      </div>

      <v-row>
        <v-col class="mx-3">
          <v-slider v-model="maxEggCluster" :min="0" :max="100" @update:model-value="analyze()"></v-slider>
        </v-col>
        <v-col cols="8" md="5" lg="4" xl="3">
        <v-text-field variant="solo" v-model="maxEggCluster" hide-details density="compact"></v-text-field>
        </v-col>
      </v-row>

      <v-row class="align-center flex-wrap">
        <v-tooltip location="bottom">
        <template v-slot:activator="{ props }">
        <v-col class="text-body-1 mb-1">
          <span v-bind="props">
          <p class="mb-1">{{ $t('Egg Size Scale') }}</p>
          <p class="text-caption my-0"><v-icon size="small" color="rgba(0, 0, 225, 255)">mdi-circle</v-icon> {{ $t('Minimum Egg Size') }}</p>
          <p class="text-caption my-0"><v-icon size="small" color="rgba(225, 0, 0, 255)">mdi-circle</v-icon> {{ $t('Maximum Egg Size') }}</p>
          <p class="text-caption my-0"><v-icon size="small" color="rgba(100, 100, 100, 255)">mdi-circle</v-icon> {{ $t('Too Large / Too Small') }}</p>
          </span>
          </v-col>
        </template>
        <span>{{ $t('Egg Size Scale Details') }}</span>
        </v-tooltip>

        <v-col>
          <canvas id="legendCanvas" style="margin: auto; display: block;"></canvas>
        </v-col>
      </v-row>

    </v-card-text>
  </v-card>

  </div>

  <!-- Analysis Card -- showing details -->
  <v-card>
    <v-card-title class="justify-end">
      <h4 class="text-h6">{{ $t('Analysis') }}</h4>
      <v-spacer></v-spacer>
      <v-btn class="mr-0" color="primary" @click="detailsDialog = true">{{ $t('Details') }}</v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-list>
      <v-list-item>
        <v-list-item-title class="text-body-2"><span><v-icon size="small" color="rgba(0, 0, 225, 255)">mdi-circle</v-icon>{{ $t('Single Eggs') }}</span></v-list-item-title>
        <template v-slot:append>
          <span class="text-body-2">{{ singlesCount }}</span>
        </template>
      </v-list-item>
      <v-list-item>
        <v-list-item-title class="text-body-2"><span><v-icon size="small" color="rgba(225, 0, 0, 255)">mdi-circle</v-icon>{{ $t('Calculated from Clusters') }}</span></v-list-item-title>
        <template v-slot:append>
          <span class="text-body-2">{{ singlesCalculated }}</span>
        </template>
      </v-list-item>

    <v-divider></v-divider>

    <v-list-item>
      <v-list-item-title class="text-body-2">{{ $t('Total Egg Estimation') }}</v-list-item-title>
      <template v-slot:append>
        <span class="text-body-2">{{ totalEggs }}</span>
      </template>
    </v-list-item>

  </v-list>
</v-card>
</v-col>

<!-- Details pop-up window -->
<v-dialog v-model="detailsDialog" max-width="500px">

  <v-card>

    <v-card-title>
      <h2 class="text-h6 ml-2">{{ $t('Details') }}</h2>
    </v-card-title>

    <v-card-text>
      <v-list>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Total Single Egg Area') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ singlesTotalArea }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Single Egg Average Size') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ singlesAvg }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Egg Clusters') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ clustersCount }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Total Egg Clusters Area') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ clustersTotalArea }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Average Cluster Area') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ avgClusterArea }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Average Eggs per Cluster') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ avgEggsPerCluster }}</span>
          </template>
        </v-list-item>
        <v-list-item>
          <v-list-item-title class="text-body-1">{{ $t('Image Size') }}</v-list-item-title>
          <template v-slot:append>
            <span class="text-body-1">{{ imageSize }}</span>
          </template>
        </v-list-item>
      </v-list>

    </v-card-text>

    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn color="primary" variant="text" @click="detailsDialog=false">{{ $t('Close') }}</v-btn>
    </v-card-actions>

  </v-card>

</v-dialog>
</v-row>

<v-bottom-navigation app :model-value="showBottom" height="70">

  <v-btn variant="text" color="primary" @click="rerender()">
    <span>{{ $t('Reset') }}</span>
    <v-icon>mdi-refresh</v-icon>
  </v-btn>

  <v-btn variant="text" color="primary" @click="showAnalysis = !showAnalysis">
    <span>{{ $t('Compare') }}</span>
    <v-icon>mdi-compare</v-icon>
  </v-btn>

  <v-btn variant="text" color="primary" @click.stop="drawer = !drawer">
    <span>{{ $t('Show Filters') }}</span>
    <v-icon>mdi-tune</v-icon>
    </v-btn>

</v-bottom-navigation>

</v-container>
</div>
</template>

<script>
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

export default {
  setup () {
    const store = useStore()
    const { t } = useI18n()
    const { smAndDown, mdAndUp } = useDisplay()

    const drawer = ref(false)
    const infoExpanded = ref(false)
    const eggsize = ref(null)
    const analyzedImage = ref(null)
    const imageSize = ref('')
    const imageDepth = ref('')
    const imageChannels = ref('')
    const imageType = ref('')
    const showAnalysis = ref(true)
    const showBottom = ref(false)
    const firstRun = ref(true)
    const active = ref(null)

    const analyzedImages = [
      { output: 'src', source: 'src2' },
      { output: 'threshold', source: 'src3' },
      { output: 'objects', source: 'src5' },
      { output: 'outlines', source: 'src6' },
      { output: 'overlay', source: 'src7' }
    ]

    const analyzedImagesPretty = computed(() => [
      t('Source Image'),
      t('Threshold'),
      t('Detected Objects'),
      t('Sorted Markers'),
      t('Outlined Overlay')
    ])

    const analysisStarted = ref(false)
    const analysisComplete = ref(false)
    const threshValue = ref(120)
    const minEggRadius = ref(5)
    const maxEggRadius = ref(13)
    const maxEggCluster = ref(30)
    const singlesCount = ref(0)
    const clustersCount = ref(0)
    const singlesArray = ref([])
    const singlesTotalArea = ref(0)
    const clustersTotalArea = ref(0)
    const avgClusterArea = ref(0)
    const avgEggsPerCluster = ref(0)
    const singlesAvg = ref(0)
    const clustersArray = ref([])
    const singlesCalculated = ref(0)
    const eggBoxes = ref(0)
    const detectedObjectsArray = ref([])
    const detectedObjectsArrayList = ref([])
    const totalEggs = ref(0)
    const window = ref(0)
    const length = 5
    const detailsDialog = ref(false)

    // Watch for imageType changes from store
    watch(() => store.state.imageType, (imageTypeValue) => {
      if (imageTypeValue === 0) {
        threshValue.value = 116
        minEggRadius.value = 1
        maxEggRadius.value = 8
        maxEggCluster.value = 8
      } else if (imageTypeValue === 1) {
        threshValue.value = 120
        minEggRadius.value = 5
        maxEggRadius.value = 13
        maxEggCluster.value = 30
      } else {
        threshValue.value = 120
        minEggRadius.value = 4
        maxEggRadius.value = 14
        maxEggCluster.value = 20
      }
    })

    const load = async () => {
      store.commit('setLoadingDialog', true)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await analyze()
      turnImages()
    }

    const rerender = () => {
      store.dispatch('triggerRerender')
    }

    const imageMenu = (index) => {
      active.value = index
    }

    const next = () => {
      window.value = window.value + 1 === length ? 0 : window.value + 1
    }

    const previous = () => {
      window.value = window.value - 1 < 0 ? length - 1 : window.value - 1
    }

    const analyze = async () => {
      // Show 'analysis' components in Vue
      analysisStarted.value = true

      // Wait for Vue to update the DOM so canvas elements are rendered
      await nextTick()

      // Verify all canvas elements exist
      const expectedCanvases = ['src', 'src2', 'src3', 'src5', 'src6', 'src7', 'threshold', 'objects', 'outlines', 'overlay']
      const missingCanvases = expectedCanvases.filter(id => !document.getElementById(id))
      if (missingCanvases.length > 0) {
        console.error('[Analysis] ERROR: Missing canvas elements:', missingCanvases)
        return
      }

      try {
        // INITIALIZATION
        // Load image into OpenCV
        let src = cv.imread('analyzedImage')
        let overlay = src.clone()

      // Show source image via OpenCV
      // Set canvas dimensions to match the source image
      const srcCanvas = document.getElementById('src')
      srcCanvas.width = src.cols
      srcCanvas.height = src.rows

      cv.imshow('src', src)

      // Image Info for debugging
      imageSize.value = src.size().width + ' x ' + src.size().height
      imageDepth.value = src.depth()
      imageChannels.value = src.channels()
      imageType.value = src.type()

      // Create matrices for various analysis activites
      let gray = new cv.Mat()
      let threshold = new cv.Mat()
      let dilate = new cv.Mat()
      let boundingBoxes = new cv.Mat()
      let objects = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3)
      let outlines = new cv.Mat(src.rows, src.cols, cv.CV_8UC3, new cv.Scalar(255, 255, 255, 0))

      // TRANSFORMATIONS
      // Source to Grayscale
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

      // Grayscale to Threshold (binary, not adaptive)
      cv.threshold(gray, threshold, threshValue.value, 255, cv.THRESH_BINARY)

      // Threshold to Dilate [and erode](create new matrix that can be written upon and anchor point (center))
      let M = cv.Mat.ones(3, 3, cv.CV_8U)
      let anchor = new cv.Point(-1, -1)
      cv.dilate(threshold, dilate, M, anchor, 0, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())

      // DRAW CONTOURS
      // Create matrices to hold contour counts
      let contours = new cv.MatVector()
      let hierarchy = new cv.Mat()
      let contoursObject = []
      let contoursValues = []

      // Find contours
      cv.findContours(dilate, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)

      // CALCULATE SINGLE EGGS AND CLUSTERS
      // Initialize and/or reset single and cluster arrays, counts, and area placeholders for computation
      let detectedObjectsArrayLocal = []
      singlesArray.value = []
      clustersArray.value = []
      singlesCount.value = 0
      clustersCount.value = 0
      singlesTotalArea.value = 0
      clustersTotalArea.value = 0

      // Define colors for contour object detection (boxes) and contour overlay (green=small, blue=single-egg, red=cluster)
      let contoursColor = new cv.Scalar(255, 255, 255)
      let green = new cv.Scalar(0, 225, 0, 255)
      let blue = new cv.Scalar(0, 0, 225, 255)
      let red = new cv.Scalar(255, 0, 0, 255)
      let grayColor = new cv.Scalar(100, 100, 100, 255)
      let minEggArea = Math.PI * (minEggRadius.value * minEggRadius.value)
      let maxEggArea = Math.PI * (maxEggRadius.value * maxEggRadius.value)
      let maxClusterArea = Math.PI * (maxEggCluster.value * maxEggCluster.value)

      // Main loop
      for (let i = 1; i < contours.size(); ++i) {
        contoursObject.push(cv.contourArea(contours.get(i)))
        contoursValues = Object.values(contoursObject)
        let contourMax = Math.max(...contoursValues)
        if (contourMax === cv.contourArea(contours.get(i))) {
        } else {
          // Draw contours and bounding boxes for all objects detected from 'contours' matrix
          let cnt = contours.get(i)
          let rect = cv.boundingRect(cnt)
          cv.drawContours(objects, contours, i, contoursColor, 1, 8, hierarchy, 100)
          let point1 = new cv.Point((rect.x - 5), (rect.y - 5))
          let point2 = new cv.Point(rect.x + rect.width + 5, rect.y + rect.height + 5)
          if (hierarchy.intPtr(0, i)[0] === -1 || hierarchy.intPtr(0, i)[1] === -1 || hierarchy.intPtr(0, i)[2] === -1 || hierarchy.intPtr(0, i)[3] === -1) {
            cv.rectangle(objects, point1, point2, green, 1, cv.LINE_AA, 0)
          } else {
            cv.rectangle(objects, point1, point2, green, 3, cv.LINE_AA, 0)
          }
          // Create matrix for points of objects for all objects, even if not calculated immediately (until individual boxes invoked)
          boundingBoxes = src.roi(rect)
          detectedObjectsArrayLocal.push(boundingBoxes)
          // Loop through all contours and sort/color by size, drawing on both outlines and overlay images (as well as counting towards array counts)
          if (cv.contourArea(contours.get(i)) <= minEggArea) {
            cv.drawContours(outlines, contours, i, grayColor, -1, cv.LINE_8, hierarchy, 0)
            cv.drawContours(overlay, contours, i, grayColor, 1, cv.LINE_8, hierarchy, 0)
          } else if (cv.contourArea(contours.get(i)) > minEggArea && cv.contourArea(contours.get(i)) <= maxEggArea) {
            cv.drawContours(outlines, contours, i, blue, -1, cv.LINE_8, hierarchy, 0)
            cv.drawContours(overlay, contours, i, blue, 1, cv.LINE_8, hierarchy, 0)
            singlesArray.value.push(cv.contourArea(contours.get(i)))
            ++singlesCount.value
          } else if (cv.contourArea(contours.get(i)) > maxEggArea && cv.contourArea(contours.get(i)) <= maxClusterArea) {
            cv.drawContours(outlines, contours, i, red, -1, cv.LINE_8, hierarchy, 0)
            cv.drawContours(overlay, contours, i, red, 1, cv.LINE_8, hierarchy, 0)
            clustersArray.value.push(cv.contourArea(contours.get(i)))
            ++clustersCount.value
          } else if (cv.contourArea(contours.get(i)) > maxClusterArea) {
            cv.drawContours(outlines, contours, i, grayColor, -1, cv.LINE_8, hierarchy, 0)
            cv.drawContours(overlay, contours, i, grayColor, 1, cv.LINE_8, hierarchy, 0)
          }
        }
      }

      // CALCULATIONS
      // Use array counts to calculate single size averages, single size area, cluster average, and cluster area
      for (let i = 0; i < singlesArray.value.length; i++) {
        singlesTotalArea.value += singlesArray.value[i]
      }
      singlesAvg.value = (singlesTotalArea.value / singlesArray.value.length).toFixed(2)
      if (isNaN(singlesAvg.value)) singlesAvg.value = 0

      // Calculate cluster area if not zero, append to total cluster area of image
      if (clustersCount.value === 0) {
      } else {
        for (let i = 0; i < clustersArray.value.length; i++) {
          clustersTotalArea.value += clustersArray.value[i]
        }
      }

      // Calculate and convert to output formats
      singlesCalculated.value = (clustersTotalArea.value / singlesAvg.value).toFixed(0)
      if (isNaN(singlesCalculated.value)) singlesCalculated.value = 0
      avgClusterArea.value = (clustersTotalArea.value / clustersCount.value).toFixed(2)
      if (isNaN(avgClusterArea.value)) avgClusterArea.value = 0
      avgEggsPerCluster.value = (avgClusterArea.value / singlesAvg.value).toFixed(1)
      if (isNaN(avgEggsPerCluster.value)) avgEggsPerCluster.value = 0
      totalEggs.value = +singlesCount.value + +singlesCalculated.value

      // Show images
      cv.imshow('src', src)
      cv.imshow('src2', src)
      cv.imshow('src3', src)
      cv.imshow('src5', src)
      cv.imshow('src6', src)
      cv.imshow('src7', src)
      cv.imshow('threshold', threshold)
      cv.imshow('objects', objects)
      cv.imshow('outlines', outlines)
      cv.imshow('overlay', overlay)

      // Show legend image
      let legend = cv.imread('legendImage')
      cv.circle(legend, new cv.Point(50, 50), minEggRadius.value, blue, 1) // Blue inner circle
      cv.circle(legend, new cv.Point(50, 50), maxEggRadius.value, red, 1) // Red outer circle
      cv.circle(legend, new cv.Point(50, 50), maxEggCluster.value, grayColor, 1) // Gray outer circle
      cv.imshow('legendCanvas', legend)
      legend.delete()

      // Delete matrices to save on memory
      src.delete()
      gray.delete()
      threshold.delete()
      dilate.delete()
      objects.delete()
      outlines.delete()
      overlay.delete()
      M.delete()
      contours.delete()
      hierarchy.delete()

      } catch (error) {
        console.error('[Analysis] Error in analyze():', error)
      }
    }

    const turnImages = async () => {
      // Use time delays to display calculation images and rotate when done calculating
      for (let i = 4; window.value < i; ++window.value) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // After timeout, show analysis results
      await new Promise((resolve) => setTimeout(resolve, 500))
      analysisComplete.value = true

      // After timeout, show bottom menu
      await new Promise((resolve) => setTimeout(resolve, 500))
      showBottom.value = true
    }

    // Watch for rawImage changes from store (AFTER function definitions to avoid hoisting issues)
    watch(() => store.state.rawImage, (data) => {
      if (data) {
        analyzedImage.value = data
        load()
      }
    }, { immediate: true })

    // Also check on mount in case rawImage is already set
    onMounted(async () => {
      await nextTick()

      if (store.state.rawImage && !analyzedImage.value) {
        analyzedImage.value = store.state.rawImage
        load()
      }
    })

    return {
      drawer,
      infoExpanded,
      eggsize,
      analyzedImage,
      imageSize,
      imageDepth,
      imageChannels,
      imageType,
      showAnalysis,
      showBottom,
      firstRun,
      active,
      analyzedImages,
      analyzedImagesPretty,
      analysisStarted,
      analysisComplete,
      threshValue,
      minEggRadius,
      maxEggRadius,
      maxEggCluster,
      singlesCount,
      clustersCount,
      singlesArray,
      singlesTotalArea,
      clustersTotalArea,
      avgClusterArea,
      avgEggsPerCluster,
      singlesAvg,
      clustersArray,
      singlesCalculated,
      eggBoxes,
      detectedObjectsArray,
      detectedObjectsArrayList,
      totalEggs,
      window,
      length,
      detailsDialog,
      smAndDown,
      mdAndUp,
      rerender,
      imageMenu,
      next,
      previous,
      analyze,
      turnImages
    }
  }
}
</script>

<style scoped>

.imageCanvasOuter {
  width: 100%;
  height: 100%;
  /* border: 3px dashed grey; */
  display: flex;
}

.imageCanvasOuterBoxes {
  max-height: 200px;
  width: 100%;
  display: flex;
}

.imageCanvasInner {
  height: 100%;
}

.legendCanvas {
  width: 200px;
  height: 200px;
}

.v-text-field {
  font-size: .9em;
}

.v-input .filter {
  text-align: right;
}

</style>
