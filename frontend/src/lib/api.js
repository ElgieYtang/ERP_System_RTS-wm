const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const AUTH_STORAGE_KEY = 'rc-erp-session'
const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

function readStoredSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStoredSession(session) {
  if (!session) {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function getAuthToken() {
  return readStoredSession()?.token ?? null
}

function notifyUnauthorized() {
  writeStoredSession(null)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT))
  }
}

async function request(path, options = {}) {
  const token = getAuthToken()
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    Accept: options.expectBlob ? '*/*' : 'application/json',
    ...(isFormData || options.expectBlob ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers ?? {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const { expectBlob, ...fetchOptions } = options

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  })

  const isAuthRoute = path.startsWith('/auth/login')

  if (response.status === 401 && !isAuthRoute) {
    notifyUnauthorized()
    throw new ApiError('Your session expired. Please sign in again.', 401)
  }

  if (expectBlob) {
    if (!response.ok) {
      throw new ApiError('The Laravel API could not complete this request.', response.status)
    }
    return response.blob()
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : 'The Laravel API could not complete this request.'
    throw new ApiError(message, response.status)
  }

  return payload
}

function requestBlob(path) {
  return request(path, { method: 'GET', expectBlob: true })
}

function loginRequest(login, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
}

function fetchCurrentUser() {
  return request('/auth/me')
}

function logoutRequest() {
  return request('/auth/logout', {
    method: 'POST',
  })
}

function fetchSettings() {
  return request('/settings')
}

function fetchHealth() {
  return request('/health')
}

function saveSettings(data) {
  return request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

function savePassword(data) {
  return request('/settings/password', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export {
  ApiError,
  AUTH_STORAGE_KEY,
  AUTH_UNAUTHORIZED_EVENT,
  fetchCurrentUser,
  fetchHealth,
  fetchSettings,
  getAuthToken,
  loginRequest,
  logoutRequest,
  readStoredSession,
  request,
  requestBlob,
  savePassword,
  saveSettings,
  writeStoredSession,
}
