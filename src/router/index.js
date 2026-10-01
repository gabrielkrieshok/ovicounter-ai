import { createRouter, createWebHashHistory } from 'vue-router'

import { STEPS, stepForRoute } from '@/lib/steps'
import { useStripStore } from '@/stores/strip'

/* Hash history: the build is a plain static site with no server, and must also
   run from a service-worker cache with no network at all. Hash routing needs no
   rewrite rule anywhere it is hosted. */

/* The flow is linear, so routes are the flow (handoff §Interactions):
 *
 *   Welcome → Capture → (gate: pass | Refusal → Capture) → Crop
 *           → [strip 1, only if the probe finds no egg: Mark one egg]
 *           → Processing → Refine (⇄ Mark one egg when the marks look wrong)
 *           → Your fixes → Strip result → Next strip → … → Session summary
 *
 * A quick count (Welcome "Count one strip", and the demo) takes the short way:
 * Capture → Crop → Processing → Your fixes → Strip result, with Refine one link
 * away on Your fixes and no summary. `session.isQuick` decides at Processing.
 *
 * `screen` is the ratified screen name from the handoff's data-screen-label.
 * Screens are named, never coded — use these names in code and in conversation.
 */
const routes = [
  { path: '/', name: 'welcome', meta: { screen: 'Welcome', page: true }, component: () => import('@/views/WelcomeScreen.vue') },

  // Built in step 6.
  { path: '/capture', name: 'capture', meta: { screen: 'Capture' }, component: () => import('@/views/CaptureScreen.vue') },
  { path: '/refusal', name: 'refusal', meta: { screen: 'Refusal', chrome: false }, component: () => import('@/views/RefusalScreen.vue') },

  { path: '/crop', name: 'crop', meta: { screen: 'Crop' }, component: () => import('@/views/CropScreen.vue') },
  { path: '/calibrate', name: 'calibrate', meta: { screen: 'Mark one egg' }, component: () => import('@/views/MarkOneEggScreen.vue') },
  { path: '/processing', name: 'processing', meta: { screen: 'Processing' }, component: () => import('@/views/ProcessingScreen.vue') },
  /* Refine's sliders are part of Measure since Oct 2026; the old address opens
     Measure, settled, where they are. */
  { path: '/refine', name: 'refine', redirect: { name: 'processing', query: { look: '1' } } },

  // Built in step 4.
  { path: '/fixes', name: 'fixes', meta: { screen: 'Your fixes' }, component: () => import('@/views/YourFixesScreen.vue') },

  // Built in step 5.
  { path: '/result', name: 'result', meta: { screen: 'Strip result' }, component: () => import('@/views/StripResultScreen.vue') },
  { path: '/about', name: 'about', meta: { screen: 'About', page: true }, component: () => import('@/views/AboutScreen.vue') },
  { path: '/guide', name: 'guide', meta: { screen: 'Guide', page: true }, component: () => import('@/views/GuideScreen.vue') },
  { path: '/summary', name: 'summary', meta: { screen: 'Session summary' }, component: () => import('@/views/SessionSummaryScreen.vue') },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

/* Remember the furthest step this strip has reached, so the step list can
   offer a way back to it after the person goes back to look at an earlier one
   (lib/steps.js). */
const ORDER = STEPS.map((s) => s.key)
router.afterEach((to) => {
  const step = stepForRoute(to.name)
  if (!step) return
  const strip = useStripStore()
  if (step.key !== 'photo' && !strip.sourceUrl) return
  strip.reach(step.key, ORDER)
})

export default router
