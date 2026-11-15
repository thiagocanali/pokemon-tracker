import { registerAccount, verifyEmail, login, logout } from './auth-service.mjs'
import { parseSessionCookie, sessionCookie, clearSessionCookie, requireTrustedMutationOrigin } from './http-auth.mjs'

const MAX_BODY_BYTES = 8192
function response(status, body, headers = {}) {
  return { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }, body }
}
export async function handleAuthRequest({ db, request, allowedOrigin, deliverVerification }) {
  if (request?.method?.toUpperCase() !== 'POST') return response(405, { error: 'Method not allowed' })
  try { requireTrustedMutationOrigin(request, allowedOrigin) }
  catch { return response(403, { error: 'Forbidden origin' }) }
  if (typeof request.rawBody !== 'string' || Buffer.byteLength(request.rawBody, 'utf8') > MAX_BODY_BYTES) {
    return response(413, { error: 'Invalid request size' })
  }
  let body
  try { body = JSON.parse(request.rawBody) }
  catch { return response(400, { error: 'Invalid JSON' }) }
  try {
    switch (request.action) {
      case 'register': {
        const user = await registerAccount(db, { ...body, deliverVerification })
        return response(202, { user, message: 'Check your email to verify your account.' })
      }
      case 'verify-email': {
        const verified = await verifyEmail(db, body.token)
        return response(verified ? 200 : 400, verified ? { verified: true } : { error: 'Invalid or expired verification token' })
      }
      case 'login': {
        const result = await login(db, body)
        if (!result) return response(401, { error: 'Invalid credentials or unverified account' })
        return response(200, { user: result.user }, { 'set-cookie': sessionCookie(result.token, result.maxAge) })
      }
      case 'logout': {
        const token = parseSessionCookie(request.headers?.cookie)
        await logout(db, token)
        return response(200, { loggedOut: true }, { 'set-cookie': clearSessionCookie() })
      }
      default:
        return response(404, { error: 'Unknown authentication action' })
    }
  } catch (error) {
    if (error instanceof TypeError) return response(400, { error: 'Invalid request' })
    if (error?.code === '23505') return response(409, { error: 'Account could not be created' })
    throw error
  }
}
