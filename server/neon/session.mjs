import { createHash } from 'node:crypto'

export function hashOpaqueToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(token)) {
    return null
  }
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/**
 * Server-only. db.query must use parameterized PostgreSQL queries.
 * Never accept a user ID from the client as proof of identity.
 */
export async function resolveSession(db, token) {
  const hash = hashOpaqueToken(token)
  if (!hash) return null
  const { rows } = await db.query(
    `select u.id, u.email
       from app_private.auth_sessions s
       join public.app_users u on u.id = s.user_id
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1`,
    [hash],
  )
  return rows[0] ?? null
}
