import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { t } from '@/i18n'
import { confirm } from '@/lib/confirm'
import { stepForRoute, stepsFor } from '@/lib/steps'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/**
 * The strip's steps as the person sees them: which are done, which is current,
 * which can be returned to.
 *
 * A step can be returned to when it is done (or done once and then left), it is
 * a screen with something to show. Going back from Count is allowed (Oct 2026):
 * returning to Count records the strip again, replacing what was saved.
 */
export function useSteps() {
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()
  const strip = useStripStore()

  const steps = computed(() =>
    stepsFor({ isDemo: session.isDemo }),
  )
  const current = computed(() => {
    const step = stepForRoute(route.name)
    return step ? steps.value.findIndex((s) => s.key === step.key) : -1
  })
  const furthest = computed(() => {
    const at = steps.value.findIndex((s) => s.key === strip.furthest)
    return Math.max(at, current.value)
  })

  function canGo(index) {
    if (index === current.value || index < 0) return false
    const step = steps.value[index]
    if (step.skipped) return false
    /* Count reopens once the strip has been counted: going back from it and
       returning records the same strip again (Strip result). */
    if (step.key === 'count') return strip.recorded
    if (step.key !== 'photo' && !strip.sourceUrl) return false
    /* Measure runs on its own; it reopens — pictures and sliders — once there
       are marks (Processing's look mode). */
    if (step.key === 'measure') return strip.marks.length > 0 && index <= furthest.value
    return index <= furthest.value
  }

  function go(index) {
    if (!canGo(index)) return
    const step = steps.value[index]
    router.push(step.key === 'measure' ? { name: step.route, query: { look: '1' } } : { name: step.route })
  }

  const label = (step) => t(`steps.${step.key}`)

  return { steps, current, furthest, canGo, go, label }
}

/**
 * Ask before finding the marks again on a strip the person has already worked
 * on. Resolves true straight away when there is nothing of theirs to lose.
 */
export async function confirmRedo(kind = 'redo') {
  const strip = useStripStore()
  if (!strip.judgments) return true
  return confirm({
    title: t(`steps.${kind}Title`),
    body: t(`steps.${kind}Body`),
    stay: t(`steps.${kind}Stay`),
    go: t(`steps.${kind}Go`),
  })
}
