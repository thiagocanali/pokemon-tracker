const COOKIE_NAME = '__Host-pokemon_session'

export function parseSessionCookie(header) {
  if (typeof header !== 'string' || header.length > 8192) return null
  const entries = header.split(';').map(part => part.trim())
  const matches = entries.filter(part => part.startsWith(COOKIE_NAME + '='))
  if (matches.length !== 1) return null
  const token = matches[0].slice(COOKIE_NAME.length + 1)
  return /^[A-Za-z0-9_-]{43,128}$/.test(token) ? token : null
}

export function sessionCookie(token, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(token)) {
    throw new TypeError('Invalid session token')
  }
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 1 || maxAgeSeconds > 604800) {
    throw new TypeError('Invalid session lifetime')
  }
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}

export function isTrustedMutationOrigin(origin, allowedOrigin) {
  if (typeof origin !== 'string' || typeof allowedOrigin !== 'string') return false
  try {
    const supplied = new URL(origin)
    const expected = new URL(allowedOrigin)
    return supplied.origin === expected.origin && supplied.protocol === 'https:' &&
      supplied.username === '' && supplied.password === ''
  } catch {
    return false
  }
}

export function requireTrustedMutationOrigin(request, allowedOrigin) {
  if (!isTrustedMutationOrigin(request?.headers?.origin, allowedOrigin)) {
    const error = new Error('Forbidden origin')
    error.statusCode = 403
    throw error
  }
}
