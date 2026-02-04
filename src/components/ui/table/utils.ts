import type { Updater } from "@tanstack/vue-table"

import type { Ref } from "vue"
import { isFunction } from "@tanstack/vue-table"

/**
 * Updates a Vue ref with a TanStack Table updater.
 * For object types (like RowSelectionState), creates a new object reference
 * to ensure Vue's reactivity system detects the change.
 */
export function valueUpdater<T>(updaterOrValue: Updater<T>, ref: Ref<T>) {
  const newValue = isFunction(updaterOrValue)
    ? updaterOrValue(ref.value)
    : updaterOrValue

  // For object types, spread to create new reference for Vue reactivity
  if (newValue !== null && typeof newValue === 'object' && !Array.isArray(newValue)) {
    ref.value = { ...newValue } as T
  } else {
    ref.value = newValue
  }
}
