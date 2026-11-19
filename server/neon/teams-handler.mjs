import { parseSessionCookie, requireTrustedMutationOrigin } from './http-auth.mjs'
import { resolveSession } from './session.mjs'
import { listTeams, createTeam, updateTeam, deleteTeam } from './teams.mjs'

const MAX_BODY_BYTES = 4096
function json(status, body) {
  return { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body }
}
function validTeamId(id) {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

/** Framework-agnostic handler. Pass an authenticated server-only DB client. */
export async function handleTeamsRequest({ db, request, allowedOrigin }) {
  const method = request?.method?.toUpperCase()
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
    return json(405, { error: 'Method not allowed' })
  }
  const token = parseSessionCookie(request?.headers?.cookie)
  const user = await resolveSession(db, token)
  if (!user) return json(401, { error: 'Authentication required' })
  if (method !== 'GET') {
    try {
      requireTrustedMutationOrigin(request, allowedOrigin)
    } catch {
      return json(403, { error: 'Forbidden origin' })
    }
  }
  const id = request?.teamId
  if ((method === 'PUT' || method === 'DELETE') && !validTeamId(id)) {
    return json(400, { error: 'Invalid team ID' })
  }
  try {
    if (method === 'GET') return json(200, { teams: await listTeams(db, user) })
    if (method === 'DELETE') {
      const deleted = await deleteTeam(db, user, id)
      return json(deleted ? 200 : 404, deleted ? { deleted: true } : { error: 'Not found' })
    }
    const raw = request?.rawBody
    if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return json(413, { error: 'Invalid request size' })
    }
    let body
    try { body = JSON.parse(raw) } catch { return json(400, { error: 'Invalid JSON' }) }
    if (method === 'POST') return json(201, { team: await createTeam(db, user, body) })
    const team = await updateTeam(db, user, id, body)
    return json(team ? 200 : 404, team ? { team } : { error: 'Not found' })
  } catch (error) {
    if (error instanceof TypeError) return json(400, { error: 'Invalid team data' })
    throw error
  }
}
