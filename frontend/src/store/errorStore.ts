interface ErrorState {
  message: string | null
}

let state: ErrorState = {
  message: null,
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export const errorStore = {
  getState: () => state,
  setError(message: string) {
    state = { message }
    notify()
  },
  clearError() {
    state = { message: null }
    notify()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
