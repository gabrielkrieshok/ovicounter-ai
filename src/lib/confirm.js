import { reactive } from 'vue'

/* One confirmation sheet for the whole app, asked for from anywhere:
 *
 *   if (await confirm({ title, body, stay, go })) { ...go ahead }
 *
 * App.vue renders it (components/ConfirmSheet.vue). Staying is always the
 * filled, first, larger button — the destructive path is available but never
 * the one the thumb falls on. Resolves true only when the person chose `go`.
 */
export const confirmState = reactive({ open: false, title: '', body: '', stay: '', go: '' })

let settle = null

export function confirm({ title, body, stay, go }) {
  settle?.(false)
  Object.assign(confirmState, { open: true, title, body, stay, go })
  return new Promise((resolve) => {
    settle = resolve
  })
}

export function answer(goAhead) {
  confirmState.open = false
  settle?.(goAhead)
  settle = null
}
