interface AuthUser {
  name: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  user: AuthUser | null
}

const state: AuthState = {
  isAuthenticated: false,
  user: null,
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export const authStore = {
  getState: () => state,
  setAuthenticated(value: boolean, user: AuthUser | null = null) {
    state.isAuthenticated = value
    state.user = value ? user : null
    notify()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
