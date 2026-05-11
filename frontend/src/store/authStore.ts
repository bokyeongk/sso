interface AuthUser {
  name: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
}

let state: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export const authStore = {
  getState: () => state,
  setAuthenticated(isAuth: boolean, user?: { name: string; email: string }) {
    state = {
      isAuthenticated: isAuth,
      isLoading: false,
      user: isAuth && user ? user : null,
    }
    notify()
  },
  subscribe(fn: () => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
