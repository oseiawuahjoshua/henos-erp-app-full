const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.error || data.detail)) ||
      response.statusText ||
      'Request failed.'
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function apiGet(path, token) {
  return request(path, { token })
}

export function apiPost(path, body, token) {
  return request(path, { method: 'POST', body, token })
}

export function apiPatch(path, body, token) {
  return request(path, { method: 'PATCH', body, token })
}

export function apiDelete(path, token) {
  return request(path, { method: 'DELETE', token })
}

export { API_BASE }
