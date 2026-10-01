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
 * a screen and not an automatic one — Measure runs on its own — and the strip
 * has not been counted yet. Once Strip result has written the record, the
 * earlier steps are shown done but not reopened: changing them would change a
 * strip already saved.
 */
export function useSteps() {
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()
  const strip = useStripStore()

  const steps = computed(() =>
    stepsFor({ isDemo: session.isDemo, isQuick: session.isQuick, visitedRefine: strip.visitedRefine }),
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
    if (step.skipped || step.key === 'count') return false
    if (strip.recorded) return false
    /* Measure runs on its own; it reopens to be looked at once there are marks
       to explain (Processing's look mode). */
    if (step.key === 'measure') return strip.marks.length > 0 && index <= furthest.value
    if (step.key !== 'photo' && !strip.sourceUrl) return false
    /* Optional Refine opens from the list once there are marks to tune, the
       same moment "Adjust them" offers it. */
    if (step.optional) return strip.marks.length > 0
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
